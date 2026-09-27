import type { PrismaClient } from "../../src/generated/prisma/client";
import { demoCategories, demoCoupons, demoProducts, demoPromotions } from "./demo-data";

/** Creates the demo catalog. Idempotent: skips when demo products already exist. */
export async function seedDemo(db: PrismaClient) {
  const existing = await db.product.count({ where: { isDemo: true } });
  if (existing > 0) {
    console.log("• demo catalog already present (run npm run demo:reset to recreate)");
    return;
  }

  const catIds = new Map<string, string>();
  for (const [i, c] of demoCategories.entries()) {
    const parentId = c.parent ? catIds.get(c.parent) : undefined;
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: `/demo/categories/${c.slug}.svg`,
        parentId,
        sortOrder: i,
        isDemo: true,
      },
    });
    catIds.set(c.slug, row.id);
  }

  let skuSeq = 1000;
  for (const [i, p] of demoProducts.entries()) {
    const createdAt = new Date(Date.now() - (p.ageDays ?? 60 + i) * 86400_000);
    const priceFrom = Math.min(...p.variants.map((v) => v.sale ?? v.price));
    const product = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        kind: p.kind,
        status: "ACTIVE",
        isFeatured: p.featured ?? false,
        isDemo: true,
        priceFrom,
        createdAt,
        images: { create: [{ url: `/demo/products/${p.slug}.svg`, alt: p.name, sortOrder: 0 }] },
        categories: { create: p.categories.map((slug) => ({ categoryId: catIds.get(slug)! })) },
        variants: {
          create: p.variants.map((v, vi) => ({
            sku: `DEMO-${++skuSeq}`,
            options: v.options ?? {},
            price: v.price,
            salePrice: v.sale ?? null,
            stockQuantity: v.stock,
            isDefault: vi === 0,
            sortOrder: vi,
          })),
        },
      },
      include: { variants: true },
    });
    await db.inventoryMovement.createMany({
      data: product.variants
        .filter((v) => v.stockQuantity > 0)
        .map((v) => ({ variantId: v.id, delta: v.stockQuantity, reason: "INITIAL" as const, note: "מלאי הדגמה" })),
    });
  }

  for (const c of demoCoupons) {
    const { categorySlug, ...data } = c as typeof c & { categorySlug?: string };
    await db.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: {
        ...data,
        isDemo: true,
        scope: categorySlug ? "CATEGORIES" : "ALL",
        categories: categorySlug ? { create: [{ categoryId: catIds.get(categorySlug)! }] } : undefined,
      },
    });
  }

  for (const p of demoPromotions) {
    await db.promotion.create({
      data: { name: p.name, type: p.type, value: p.value, categoryId: catIds.get(p.categorySlug), isDemo: true },
    });
  }

  console.log(`✓ demo catalog: ${demoCategories.length} categories, ${demoProducts.length} products`);
}
