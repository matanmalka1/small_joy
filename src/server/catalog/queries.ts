import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { loadActivePromotions, toPricingVariant } from "@/server/pricing/loaders";
import { unitPriceFor, type PromotionRule } from "@/server/pricing/engine";
import type { VariantOptions } from "./options";

const NEW_PRODUCT_DAYS = 30;

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number;
  compareAt: number | null;
  /** Several variants with different prices → show "החל מ־". */
  priceVaries: boolean;
  inStock: boolean;
  isNew: boolean;
  variantCount: number;
  /** Default variant for one-click add to cart (only when a single variant exists). */
  singleVariantId: string | null;
};

const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
  categories: { select: { categoryId: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toCard(p: CardRow, promotions: PromotionRule[], now: Date): ProductCard {
  const priced = p.variants.map((v) =>
    unitPriceFor(toPricingVariant({ ...v, product: { categories: p.categories } }), promotions, now),
  );
  const cheapestIdx = priced.reduce((best, cur, i) => (cur.unitPrice < priced[best].unitPrice ? i : best), 0);
  const cheapest = priced[cheapestIdx];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt || p.name,
    price: cheapest?.unitPrice ?? 0,
    compareAt: cheapest?.onSale ? cheapest.listPrice : null,
    priceVaries: new Set(priced.map((x) => x.unitPrice)).size > 1,
    inStock: p.variants.some((v) => v.stockQuantity > 0),
    isNew: now.getTime() - p.createdAt.getTime() < NEW_PRODUCT_DAYS * 86400_000,
    variantCount: p.variants.length,
    singleVariantId: p.variants.length === 1 ? p.variants[0].id : null,
  };
}

const publishedWhere: Prisma.ProductWhereInput = {
  status: "ACTIVE",
  variants: { some: { isActive: true } },
};

// ───────────── Categories ─────────────

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  children: CategoryNode[];
};

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, description: true, imageUrl: true, parentId: true },
  });
  const byId = new Map<string, CategoryNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const cat = await db.category.findFirst({
    where: { slug, isActive: true },
    include: {
      parent: { select: { slug: true, name: true, isActive: true } },
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } },
    },
  });
  return cat;
});

// ───────────── Product listing ─────────────

export type ProductSort = "new" | "price-asc" | "price-desc" | "name";

export type ProductQuery = {
  categoryIds?: string[];
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  featuredOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
  excludeIds?: string[];
};

function orderByFor(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ priceFrom: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ priceFrom: "desc" }, { id: "asc" }];
    case "name":
      return [{ name: "asc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

async function saleWhere(promotions: PromotionRule[]): Promise<Prisma.ProductWhereInput> {
  const productIds = promotions.flatMap((p) => (p.productId ? [p.productId] : []));
  const categoryIds = promotions.flatMap((p) => (p.categoryId ? [p.categoryId] : []));
  return {
    OR: [
      { variants: { some: { isActive: true, salePrice: { not: null } } } },
      ...(productIds.length ? [{ id: { in: productIds } }] : []),
      ...(categoryIds.length ? [{ categories: { some: { categoryId: { in: categoryIds } } } }] : []),
    ],
  };
}

export async function listProducts(query: ProductQuery) {
  const now = new Date();
  const promotions = await loadActivePromotions(db, now);
  const pageSize = Math.min(query.pageSize ?? 24, 60);
  const page = Math.max(1, query.page ?? 1);

  const and: Prisma.ProductWhereInput[] = [publishedWhere];
  if (query.categoryIds?.length) and.push({ categories: { some: { categoryId: { in: query.categoryIds } } } });
  if (query.q) {
    const q = query.q.trim().slice(0, 80);
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { variants: { some: { sku: { equals: q, mode: "insensitive" } } } },
        { categories: { some: { category: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }
  if (query.minPrice != null) and.push({ priceFrom: { gte: query.minPrice } });
  if (query.maxPrice != null) and.push({ priceFrom: { lte: query.maxPrice } });
  if (query.inStockOnly) and.push({ variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } });
  if (query.featuredOnly) and.push({ isFeatured: true });
  if (query.onSaleOnly) and.push(await saleWhere(promotions));
  if (query.excludeIds?.length) and.push({ id: { notIn: query.excludeIds } });

  const where: Prisma.ProductWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: cardInclude,
      orderBy: orderByFor(query.sort ?? "new"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map((r) => toCard(r, promotions, now)),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** All descendant category ids (inclusive) so a parent category shows its children's products. */
export async function categoryWithDescendants(categoryId: string): Promise<string[]> {
  const all = await db.category.findMany({ where: { isActive: true }, select: { id: true, parentId: true } });
  const result = [categoryId];
  for (let i = 0; i < result.length; i++) {
    for (const c of all) if (c.parentId === result[i]) result.push(c.id);
  }
  return result;
}

// ───────────── Product detail ─────────────

export type ProductDetailVariant = {
  id: string;
  sku: string;
  options: VariantOptions;
  price: number;
  compareAt: number | null;
  stock: number;
  lowStock: boolean;
};

export const getProductBySlug = cache(async (slug: string) => {
  const p = await db.product.findFirst({
    where: { slug, ...publishedWhere },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      categories: {
        include: { category: { select: { id: true, slug: true, name: true, isActive: true, parentId: true } } },
      },
    },
  });
  if (!p) return null;
  const now = new Date();
  const promotions = await loadActivePromotions(db, now);
  const variants: ProductDetailVariant[] = p.variants.map((v) => {
    const unit = unitPriceFor(toPricingVariant({ ...v, product: { categories: p.categories } }), promotions, now);
    return {
      id: v.id,
      sku: v.sku,
      options: (v.options ?? {}) as VariantOptions,
      price: unit.unitPrice,
      compareAt: unit.onSale ? unit.listPrice : null,
      stock: v.stockQuantity,
      lowStock: v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold,
    };
  });
  const categories = p.categories.map((c) => c.category).filter((c) => c.isActive);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    kind: p.kind,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || p.name })),
    variants,
    categories,
    updatedAt: p.updatedAt,
  };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getRelatedProducts(productId: string, categoryIds: string[], limit = 8) {
  if (!categoryIds.length) return [];
  const { items } = await listProducts({ categoryIds, excludeIds: [productId], pageSize: limit, sort: "new" });
  return items;
}

export async function listSitemapEntries() {
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: publishedWhere, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return { products, categories };
}
