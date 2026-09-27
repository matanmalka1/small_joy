import { z } from "zod";
import { parseShekels } from "@/lib/money";
import { SLUG_RE } from "@/lib/slug";
import { parseStoreLocal } from "@/lib/dates";

/** Shekel string ("12.90") → agorot integer. */
export const shekelsField = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? Math.round(v * 100) : parseShekels(v);
    if (n == null) {
      ctx.addIssue({ code: "custom", message: "סכום לא תקין" });
      return z.NEVER;
    }
    return n;
  });

export const optionalShekels = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? Math.round(v * 100) : parseShekels(v);
    if (n == null) {
      ctx.addIssue({ code: "custom", message: "סכום לא תקין" });
      return z.NEVER;
    }
    return n;
  });

const slugField = z.string().trim().toLowerCase().regex(SLUG_RE, "כתובת URL יכולה להכיל אותיות באנגלית, ספרות ומקפים בלבד").max(80);

export const variantInputSchema = z
  .object({
    id: z.string().max(40).optional(),
    sku: z.string().trim().min(1, "יש להזין מק״ט").max(60).regex(/^[\w\-.]+$/, "מק״ט יכול להכיל אותיות באנגלית, ספרות, מקף ונקודה"),
    options: z.record(z.string().trim().min(1).max(40), z.string().trim().max(60)).default({}),
    price: shekelsField,
    salePrice: optionalShekels,
    stockQuantity: z.coerce.number().int().min(0, "מלאי לא יכול להיות שלילי").max(1_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(5),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.price > 0, { path: ["price"], message: "המחיר חייב להיות גדול מ־0" })
  .refine((v) => v.salePrice == null || v.salePrice < v.price, { path: ["salePrice"], message: "מחיר המבצע חייב להיות נמוך מהמחיר הרגיל" });

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "יש להזין שם מוצר").max(120),
    slug: slugField.optional().or(z.literal("").transform(() => undefined)),
    description: z.string().trim().max(5000).default(""),
    kind: z.enum(["GENERAL", "BEDDING", "DISPOSABLE", "HOUSEWARE"]),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    isFeatured: z.boolean().default(false),
    categoryIds: z.array(z.string().max(40)).max(20).default([]),
    seoTitle: z.string().trim().max(70).optional().transform((v) => v || null),
    seoDescription: z.string().trim().max(170).optional().transform((v) => v || null),
    variants: z.array(variantInputSchema).min(1, "יש להגדיר לפחות וריאציה אחת").max(100),
    images: z
      .array(z.object({ id: z.string().max(40).optional(), url: z.string().max(500), storageKey: z.string().max(300).nullable().optional(), alt: z.string().max(200).default("") }))
      .max(12)
      .default([]),
  })
  .superRefine((v, ctx) => {
    const skus = v.variants.map((x) => x.sku.toUpperCase());
    skus.forEach((s, i) => {
      if (skus.indexOf(s) !== i) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "מק״ט כפול" });
    });
    const combos = v.variants.map((x) => JSON.stringify(Object.entries(x.options).sort()));
    combos.forEach((c, i) => {
      if (v.variants.length > 1 && combos.indexOf(c) !== i) ctx.addIssue({ code: "custom", path: ["variants", i, "options"], message: "שילוב מאפיינים כפול" });
    });
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם").max(60),
  slug: slugField.optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().max(500).optional().transform((v) => v || null),
  imageUrl: z.string().trim().max(500).optional().transform((v) => v || null),
  parentId: z.string().max(40).optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});

const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseStoreLocal(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "תאריך לא תקין" });
      return z.NEVER;
    }
    return d;
  });

const discountValue = z.object({ type: z.enum(["PERCENT", "FIXED"]), value: z.string() }).transform((v, ctx) => {
  if (v.type === "PERCENT") {
    const n = Number(v.value);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "אחוז הנחה בין 1 ל־100" });
      return z.NEVER;
    }
    return { type: v.type, value: n };
  }
  const agorot = parseShekels(v.value);
  if (agorot == null || agorot <= 0) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "סכום הנחה לא תקין" });
    return z.NEVER;
  }
  return { type: v.type, value: agorot };
});

export const couponInputSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "קוד באנגלית/ספרות, 3–30 תווים"),
    description: z.string().trim().max(200).optional().transform((v) => v || null),
    discount: discountValue,
    scope: z.enum(["ALL", "PRODUCTS", "CATEGORIES"]),
    productIds: z.array(z.string().max(40)).default([]),
    categoryIds: z.array(z.string().max(40)).default([]),
    startsAt: optionalDate,
    endsAt: optionalDate,
    minOrderTotal: optionalShekels.transform((v) => v ?? 0),
    maxRedemptions: z.string().optional().transform((v) => (v ? Number.parseInt(v, 10) : null)).pipe(z.number().int().min(1).nullable()),
    perCustomerLimit: z.string().optional().transform((v) => (v ? Number.parseInt(v, 10) : null)).pipe(z.number().int().min(1).nullable()),
    combineWithSales: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt < v.endsAt, { path: ["endsAt"], message: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה" })
  .refine((v) => v.scope !== "PRODUCTS" || v.productIds.length > 0, { path: ["productIds"], message: "יש לבחור מוצרים" })
  .refine((v) => v.scope !== "CATEGORIES" || v.categoryIds.length > 0, { path: ["categoryIds"], message: "יש לבחור קטגוריות" });

export const promotionInputSchema = z
  .object({
    name: z.string().trim().min(2, "יש להזין שם").max(80),
    discount: discountValue,
    target: z.enum(["PRODUCT", "CATEGORY"]),
    productId: z.string().max(40).optional(),
    categoryId: z.string().max(40).optional(),
    startsAt: optionalDate,
    endsAt: optionalDate,
    isActive: z.boolean(),
  })
  .refine((v) => (v.target === "PRODUCT" ? Boolean(v.productId) : Boolean(v.categoryId)), { path: ["target"], message: "יש לבחור מוצר או קטגוריה" })
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt < v.endsAt, { path: ["endsAt"], message: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה" });

export const shippingMethodInputSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם").max(60),
  description: z.string().trim().max(200).optional().transform((v) => v || null),
  type: z.enum(["PICKUP", "DELIVERY"]),
  price: optionalShekels,
  freeShippingThreshold: optionalShekels,
  zones: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 300) : [])),
  etaText: z.string().trim().max(80).optional().transform((v) => v || null),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  addressLine: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().transform((v) => v || null),
  whatsapp: z.string().trim().max(30).optional().transform((v) => v || null),
  email: z.union([z.literal(""), z.email("כתובת דוא״ל לא תקינה")]).optional().transform((v) => v || null),
  openingHours: z.string().trim().max(500).optional().transform((v) => v || null),
  pickupInstructions: z.string().trim().max(500).optional().transform((v) => v || null),
  businessId: z.string().trim().max(30).optional().transform((v) => v || null),
  announcement: z.string().trim().max(140).optional().transform((v) => v || null),
  lowStockDefault: z.coerce.number().int().min(0).max(10_000),
});

export const contentPageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1, "יש להזין תוכן").max(50_000),
  isDraft: z.boolean(),
});

export const stockAdjustSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(0, "מלאי לא יכול להיות שלילי").max(1_000_000),
  note: z.string().trim().max(200).optional(),
});
