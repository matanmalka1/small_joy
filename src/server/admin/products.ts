import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { ProductInput } from "@/lib/validation/admin";
import { refreshProductPriceFrom } from "@/server/inventory/inventory";
import { deleteStoredObject } from "@/server/storage";

export class AdminInputError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export async function uniqueSlug(client: Tx | typeof db, base: string, model: "product" | "category", excludeId?: string): Promise<string> {
  const root = slugify(base) || `${model}-${randomBytes(3).toString("hex")}`;
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing =
      model === "product"
        ? await client.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await client.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}

function isUniqueViolation(e: unknown, field?: string): boolean {
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err?.code !== "P2002") return false;
  return field ? JSON.stringify(err.meta?.target ?? "").includes(field) : true;
}

/** Create or update a product with its variants, images and categories in one transaction. */
export async function saveProduct(input: ProductInput, productId: string | null, actorId: string): Promise<string> {
  const removedImageKeys: string[] = [];
  try {
    const id = await db.$transaction(async (tx) => {
      if (input.slug) {
        const clash = await tx.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
        if (clash && clash.id !== productId) throw new AdminInputError("כתובת ה־URL כבר בשימוש במוצר אחר", "slug");
      }
      const slug = input.slug ?? (await uniqueSlug(tx, input.name, "product", productId ?? undefined));
      const data = {
        name: input.name,
        slug,
        description: input.description,
        kind: input.kind,
        status: input.status,
        isFeatured: input.isFeatured,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      };

      const product = productId
        ? await tx.product.update({ where: { id: productId }, data })
        : await tx.product.create({ data });

      // Categories
      const validCats = await tx.category.findMany({ where: { id: { in: input.categoryIds } }, select: { id: true } });
      await tx.productCategory.deleteMany({ where: { productId: product.id } });
      if (validCats.length) {
        await tx.productCategory.createMany({ data: validCats.map((c) => ({ productId: product.id, categoryId: c.id })) });
      }

      // Images
      const existingImages = await tx.productImage.findMany({ where: { productId: product.id } });
      const keepIds = new Set(input.images.flatMap((i) => (i.id ? [i.id] : [])));
      for (const img of existingImages) {
        if (!keepIds.has(img.id)) {
          await tx.productImage.delete({ where: { id: img.id } });
          if (img.storageKey) removedImageKeys.push(img.storageKey);
        }
      }
      for (const [sortOrder, img] of input.images.entries()) {
        if (img.id && existingImages.some((e) => e.id === img.id)) {
          await tx.productImage.update({ where: { id: img.id }, data: { sortOrder, alt: img.alt } });
        } else if (img.url.startsWith("/") || /^https:\/\//.test(img.url)) {
          await tx.productImage.create({ data: { productId: product.id, url: img.url, storageKey: img.storageKey ?? null, alt: img.alt, sortOrder } });
        }
      }

      // Variants
      const existingVariants = await tx.productVariant.findMany({ where: { productId: product.id } });
      const incomingIds = new Set(input.variants.flatMap((v) => (v.id ? [v.id] : [])));
      for (const old of existingVariants) {
        if (incomingIds.has(old.id)) continue;
        const used = await tx.orderItem.count({ where: { variantId: old.id } });
        // Variants that appear in orders are deactivated (history stays intact), others deleted.
        if (used) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false, sku: `${old.sku}-archived-${old.id.slice(-4)}` } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const [sortOrder, v] of input.variants.entries()) {
        const base = {
          sku: v.sku.toUpperCase(),
          options: v.options as Prisma.InputJsonValue,
          price: v.price,
          salePrice: v.salePrice,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
          isDefault: sortOrder === 0,
          sortOrder,
        };
        const old = v.id ? existingVariants.find((e) => e.id === v.id) : undefined;
        if (old) {
          await tx.productVariant.update({ where: { id: old.id }, data: base });
          // Stock edits are recorded as movements. Lock row to avoid racing a concurrent sale.
          const [row] = await tx.$queryRaw<{ stockQuantity: number }[]>`SELECT "stockQuantity" FROM "ProductVariant" WHERE id = ${old.id} FOR UPDATE`;
          const delta = v.stockQuantity - row.stockQuantity;
          if (delta !== 0) {
            await tx.productVariant.update({ where: { id: old.id }, data: { stockQuantity: v.stockQuantity } });
            await tx.inventoryMovement.create({ data: { variantId: old.id, delta, reason: "ADJUSTMENT", note: "עדכון בעריכת מוצר", actorId } });
          }
        } else {
          const created = await tx.productVariant.create({ data: { ...base, productId: product.id, stockQuantity: v.stockQuantity } });
          if (v.stockQuantity > 0) {
            await tx.inventoryMovement.create({ data: { variantId: created.id, delta: v.stockQuantity, reason: "INITIAL", actorId } });
          }
        }
      }

      await refreshProductPriceFrom(tx, product.id);
      return product.id;
    });
    await Promise.all(removedImageKeys.map((k) => deleteStoredObject(k)));
    return id;
  } catch (e) {
    if (isUniqueViolation(e, "sku")) throw new AdminInputError("אחד המק״טים כבר קיים במוצר אחר", "variants");
    if (isUniqueViolation(e, "slug")) throw new AdminInputError("כתובת ה־URL כבר בשימוש", "slug");
    throw e;
  }
}

/** Deletes a product that was never ordered; otherwise archives it to keep order history. */
export async function deleteOrArchiveProduct(productId: string): Promise<"deleted" | "archived"> {
  const ordered = await db.orderItem.count({ where: { variant: { productId } } });
  if (ordered > 0) {
    await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED", isFeatured: false } });
    return "archived";
  }
  const images = await db.productImage.findMany({ where: { productId }, select: { storageKey: true } });
  await db.product.delete({ where: { id: productId } });
  await Promise.all(images.map((i) => deleteStoredObject(i.storageKey)));
  return "deleted";
}

export async function listAdminProducts(params: { q?: string; status?: string; categoryId?: string; stock?: string; page?: number }) {
  const pageSize = 25;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ProductWhereInput = {
    AND: [
      params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { slug: { contains: params.q, mode: "insensitive" } },
              { variants: { some: { sku: { contains: params.q, mode: "insensitive" } } } },
            ],
          }
        : {},
      params.status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(params.status) ? { status: params.status as "DRAFT" } : {},
      params.categoryId ? { categories: { some: { categoryId: params.categoryId } } } : {},
      params.stock === "out" ? { variants: { every: { stockQuantity: { lte: 0 } } } } : {},
      params.stock === "low" ? { variants: { some: { isActive: true, stockQuantity: { gt: 0, lte: 5 } } } } : {},
    ],
  };
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { isActive: true }, select: { price: true, salePrice: true, stockQuantity: true, sku: true } },
        categories: { include: { category: { select: { name: true } } } },
      },
    }),
  ]);
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      categories: true,
    },
  });
}

export async function listCategoryOptions() {
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true, isActive: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  return cats.map((c) => ({ id: c.id, label: c.parentId && byId.get(c.parentId) ? `${byId.get(c.parentId)!.name} › ${c.name}` : c.name, isActive: c.isActive }));
}
