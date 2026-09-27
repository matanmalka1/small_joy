import "server-only";
import Papa from "papaparse";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseShekels, toShekelInput } from "@/lib/money";
import { SLUG_RE } from "@/lib/slug";
import { optionsToString, parseOptionsString, type VariantOptions } from "@/server/catalog/options";
import { refreshProductPriceFrom } from "@/server/inventory/inventory";
import { uniqueSlug } from "./products";

/**
 * CSV catalog format (UTF-8, header row required). One row per variant (SKU).
 * Rows sharing product_slug belong to the same product.
 */
export const CSV_COLUMNS = [
  "sku",
  "product_slug",
  "product_name",
  "description",
  "kind",
  "status",
  "featured",
  "categories",
  "options",
  "price",
  "sale_price",
  "stock",
  "low_stock_threshold",
  "image_url",
] as const;

const MAX_ROWS = 5000;

const rowSchema = z.object({
  sku: z.string().trim().min(1, "חסר מק״ט").max(60).regex(/^[\w\-.]+$/, "מק״ט לא תקין"),
  product_slug: z.string().trim().toLowerCase().max(80).optional().default(""),
  product_name: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(5000).optional(),
  kind: z.enum(["GENERAL", "BEDDING", "DISPOSABLE", "HOUSEWARE", ""]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", ""]).optional(),
  featured: z.enum(["", "0", "1", "true", "false", "yes", "no", "כן", "לא"]).optional(),
  categories: z.string().optional(),
  options: z.string().optional(),
  price: z.string().optional(),
  sale_price: z.string().optional(),
  stock: z.string().optional(),
  low_stock_threshold: z.string().optional(),
  image_url: z.string().trim().max(500).optional(),
});

export type ImportRowResult = { line: number; sku: string; action: "create" | "update" | "error"; message?: string };
export type ImportReport = { rows: ImportRowResult[]; created: number; updated: number; errors: number; applied: boolean };

type ParsedRow = {
  line: number;
  sku: string;
  productSlug: string;
  productName: string;
  description?: string;
  kind?: "GENERAL" | "BEDDING" | "DISPOSABLE" | "HOUSEWARE";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured?: boolean;
  categorySlugs?: string[];
  options?: VariantOptions;
  price?: number;
  salePrice?: number | null;
  stock?: number;
  lowStock?: number;
  imageUrl?: string;
};

function parseBool(v?: string) {
  if (!v) return undefined;
  return ["1", "true", "yes", "כן"].includes(v);
}

function parseRow(raw: Record<string, string>, line: number): ParsedRow | ImportRowResult {
  const r = rowSchema.safeParse(raw);
  const sku = (raw.sku ?? "").trim().toUpperCase();
  if (!r.success) return { line, sku, action: "error", message: r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join("; ") };
  const d = r.data;
  const out: ParsedRow = { line, sku: d.sku.toUpperCase(), productSlug: d.product_slug, productName: d.product_name };
  if (d.product_slug && !SLUG_RE.test(d.product_slug)) return { line, sku, action: "error", message: "product_slug לא תקין (אנגלית, ספרות ומקפים)" };
  if (d.description) out.description = d.description;
  if (d.kind) out.kind = d.kind;
  if (d.status) out.status = d.status;
  out.featured = parseBool(d.featured);
  if (d.categories) out.categorySlugs = d.categories.split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (d.options) out.options = parseOptionsString(d.options);
  if (d.price) {
    const p = parseShekels(d.price);
    if (p == null || p <= 0) return { line, sku, action: "error", message: "price לא תקין" };
    out.price = p;
  }
  if (d.sale_price !== undefined) {
    if (d.sale_price === "") out.salePrice = null;
    else {
      const p = parseShekels(d.sale_price);
      if (p == null) return { line, sku, action: "error", message: "sale_price לא תקין" };
      out.salePrice = p;
    }
  }
  if (d.stock) {
    const n = Number(d.stock);
    if (!Number.isInteger(n) || n < 0) return { line, sku, action: "error", message: "stock חייב להיות מספר שלם אי־שלילי" };
    out.stock = n;
  }
  if (d.low_stock_threshold) {
    const n = Number(d.low_stock_threshold);
    if (!Number.isInteger(n) || n < 0) return { line, sku, action: "error", message: "low_stock_threshold לא תקין" };
    out.lowStock = n;
  }
  if (d.image_url) {
    // Images must live on our own media host (CSP + image optimizer allow only it).
    const media = env().S3_PUBLIC_URL?.replace(/\/$/, "");
    const allowed = d.image_url.startsWith("/") || (media && d.image_url.startsWith(`${media}/`));
    if (!allowed) return { line, sku, action: "error", message: `image_url חייב להיות נתיב מקומי או כתובת תחת ${media ?? "S3_PUBLIC_URL"}` };
    out.imageUrl = d.image_url;
  }
  const effectivePrice = out.price;
  if (out.salePrice != null && effectivePrice != null && out.salePrice >= effectivePrice) {
    return { line, sku, action: "error", message: "sale_price חייב להיות נמוך מ־price" };
  }
  return out;
}

export async function importProductsCsv(text: string, opts: { apply: boolean; actorId: string }): Promise<ImportReport> {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase() });
  const results: ImportRowResult[] = [];
  if (!parsed.meta.fields?.includes("sku")) {
    return { rows: [{ line: 1, sku: "", action: "error", message: "חסרה עמודת sku בשורת הכותרת" }], created: 0, updated: 0, errors: 1, applied: false };
  }
  if (parsed.data.length > MAX_ROWS) {
    return { rows: [{ line: 1, sku: "", action: "error", message: `ניתן לייבא עד ${MAX_ROWS} שורות בקובץ` }], created: 0, updated: 0, errors: 1, applied: false };
  }

  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const skus = parsed.data.map((r) => (r.sku ?? "").trim().toUpperCase()).filter(Boolean);
  const existingVariants = await db.productVariant.findMany({ where: { sku: { in: skus } }, include: { product: { select: { slug: true } } } });
  const existingBySku = new Map(existingVariants.map((v) => [v.sku, v]));
  const seen = new Set<string>();
  const valid: Array<ParsedRow & { existing?: (typeof existingVariants)[number] }> = [];

  parsed.data.forEach((raw, i) => {
    const line = i + 2;
    const row = parseRow(raw, line);
    if ("action" in row) return results.push(row);
    if (seen.has(row.sku)) return results.push({ line, sku: row.sku, action: "error", message: "מק״ט מופיע יותר מפעם אחת בקובץ" });
    seen.add(row.sku);
    const unknownCat = row.categorySlugs?.find((s) => !catBySlug.has(s));
    if (unknownCat) return results.push({ line, sku: row.sku, action: "error", message: `קטגוריה לא קיימת: ${unknownCat}` });
    const existing = existingBySku.get(row.sku);
    if (!existing) {
      if (!row.productSlug && !row.productName) return results.push({ line, sku: row.sku, action: "error", message: "מק״ט חדש מחייב product_slug או product_name" });
      if (row.price == null) return results.push({ line, sku: row.sku, action: "error", message: "מק״ט חדש מחייב price" });
    }
    valid.push({ ...row, existing });
    results.push({ line, sku: row.sku, action: existing ? "update" : "create" });
  });

  const errors = results.filter((r) => r.action === "error").length;
  const report = (applied: boolean): ImportReport => ({
    rows: results.sort((a, b) => a.line - b.line),
    created: results.filter((r) => r.action === "create").length,
    updated: results.filter((r) => r.action === "update").length,
    errors,
    applied,
  });

  // All-or-nothing: nothing is written if any row has an error.
  if (!opts.apply || errors > 0) return report(false);

  const touchedProducts = new Set<string>();
  await db.$transaction(
    async (tx) => {
      const productIdBySlug = new Map<string, string>();
      for (const row of valid) {
        let productId = row.existing?.productId;
        const slugKey = row.productSlug || row.existing?.product.slug || "";
        if (!productId && slugKey && productIdBySlug.has(slugKey)) productId = productIdBySlug.get(slugKey);
        if (!productId && row.productSlug) productId = (await tx.product.findUnique({ where: { slug: row.productSlug }, select: { id: true } }))?.id;

        const productData: Prisma.ProductUpdateInput = {
          ...(row.productName ? { name: row.productName } : {}),
          ...(row.description !== undefined ? { description: row.description } : {}),
          ...(row.kind ? { kind: row.kind } : {}),
          ...(row.status ? { status: row.status } : {}),
          ...(row.featured !== undefined ? { isFeatured: row.featured } : {}),
        };
        if (!productId) {
          const slug = row.productSlug || (await uniqueSlug(tx, row.productName, "product"));
          const created = await tx.product.create({
            data: { slug, name: row.productName || slug, description: row.description ?? "", kind: row.kind ?? "GENERAL", status: row.status ?? "DRAFT", isFeatured: row.featured ?? false },
          });
          productId = created.id;
        } else if (Object.keys(productData).length) {
          await tx.product.update({ where: { id: productId }, data: productData });
        }
        if (slugKey) productIdBySlug.set(slugKey, productId);
        touchedProducts.add(productId);

        if (row.categorySlugs) {
          for (const s of row.categorySlugs) {
            await tx.productCategory.upsert({
              where: { productId_categoryId: { productId, categoryId: catBySlug.get(s)! } },
              create: { productId, categoryId: catBySlug.get(s)! },
              update: {},
            });
          }
        }
        if (row.imageUrl) {
          const has = await tx.productImage.findFirst({ where: { productId, url: row.imageUrl } });
          if (!has) {
            const count = await tx.productImage.count({ where: { productId } });
            await tx.productImage.create({ data: { productId, url: row.imageUrl, sortOrder: count } });
          }
        }

        if (row.existing) {
          await tx.productVariant.update({
            where: { id: row.existing.id },
            data: {
              ...(row.options ? { options: row.options } : {}),
              ...(row.price != null ? { price: row.price } : {}),
              ...(row.salePrice !== undefined ? { salePrice: row.salePrice } : {}),
              ...(row.lowStock != null ? { lowStockThreshold: row.lowStock } : {}),
              isActive: true,
            },
          });
          if (row.stock != null) {
            const [cur] = await tx.$queryRaw<{ stockQuantity: number }[]>`SELECT "stockQuantity" FROM "ProductVariant" WHERE id = ${row.existing.id} FOR UPDATE`;
            const delta = row.stock - cur.stockQuantity;
            if (delta !== 0) {
              await tx.productVariant.update({ where: { id: row.existing.id }, data: { stockQuantity: row.stock } });
              await tx.inventoryMovement.create({ data: { variantId: row.existing.id, delta, reason: "IMPORT", note: "ייבוא CSV", actorId: opts.actorId } });
            }
          }
        } else {
          const count = await tx.productVariant.count({ where: { productId } });
          const v = await tx.productVariant.create({
            data: {
              productId,
              sku: row.sku,
              options: row.options ?? {},
              price: row.price!,
              salePrice: row.salePrice ?? null,
              stockQuantity: row.stock ?? 0,
              lowStockThreshold: row.lowStock ?? 5,
              isDefault: count === 0,
              sortOrder: count,
            },
          });
          if ((row.stock ?? 0) > 0) {
            await tx.inventoryMovement.create({ data: { variantId: v.id, delta: row.stock!, reason: "IMPORT", note: "ייבוא CSV", actorId: opts.actorId } });
          }
        }
      }
      for (const id of touchedProducts) await refreshProductPriceFrom(tx, id);
    },
    { timeout: 120_000 },
  );
  return report(true);
}

function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  // Prevent spreadsheet formula injection when the file is opened in Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportProductsCsv(): Promise<string> {
  const variants = await db.productVariant.findMany({
    where: { isActive: true },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      product: { include: { categories: { include: { category: { select: { slug: true } } } }, images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
    },
  });
  const lines = [CSV_COLUMNS.join(",")];
  for (const v of variants) {
    const p = v.product;
    lines.push(
      [
        v.sku,
        p.slug,
        p.name,
        p.description,
        p.kind,
        p.status,
        p.isFeatured ? "1" : "0",
        p.categories.map((c) => c.category.slug).join("|"),
        optionsToString(v.options as VariantOptions),
        toShekelInput(v.price),
        toShekelInput(v.salePrice),
        v.stockQuantity,
        v.lowStockThreshold,
        p.images[0]?.url.startsWith("http") ? p.images[0].url : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "﻿" + lines.join("\n");
}
