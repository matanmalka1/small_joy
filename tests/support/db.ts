import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** Wipes all tables between tests (test database only). */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) throw new Error("Refusing to reset a non-test database");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

let seq = 0;

export async function createProduct(opts: { price?: number; salePrice?: number | null; stock?: number; categoryId?: string; status?: "ACTIVE" | "DRAFT" } = {}) {
  seq++;
  const product = await db.product.create({
    data: {
      slug: `p-${seq}-${randomBytes(3).toString("hex")}`,
      name: `מוצר ${seq}`,
      status: opts.status ?? "ACTIVE",
      priceFrom: opts.price ?? 1000,
      categories: opts.categoryId ? { create: [{ categoryId: opts.categoryId }] } : undefined,
      variants: {
        create: [{ sku: `SKU-${seq}-${randomBytes(2).toString("hex")}`, price: opts.price ?? 1000, salePrice: opts.salePrice ?? null, stockQuantity: opts.stock ?? 10, isDefault: true }],
      },
    },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

export async function createPickupMethod() {
  return db.shippingMethod.create({ data: { name: "איסוף", type: "PICKUP", price: 0, isActive: true } });
}

export async function createDeliveryMethod(price = 3000, freeShippingThreshold: number | null = 30000) {
  return db.shippingMethod.create({ data: { name: "משלוח", type: "DELIVERY", price, freeShippingThreshold, isActive: true } });
}

export async function createCart(items: { variantId: string; quantity: number }[], opts: { userId?: string; couponCode?: string } = {}) {
  return db.cart.create({
    data: {
      token: randomBytes(12).toString("hex"),
      userId: opts.userId ?? null,
      couponCode: opts.couponCode ?? null,
      items: { create: items },
    },
  });
}

export async function createUser(role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  seq++;
  return db.user.create({ data: { id: `user-${seq}-${randomBytes(3).toString("hex")}`, email: `u${seq}-${randomBytes(2).toString("hex")}@example.com`, name: `User ${seq}`, role } });
}

export const guestInput = (shippingMethodId: string) => ({
  fullName: "ישראל ישראלי",
  email: "guest@example.com",
  phone: "0501234567",
  fulfillment: "PICKUP" as const,
  shippingMethodId,
  acceptTerms: true as const,
});
