import "server-only";
import { db, type Tx } from "@/lib/db";
import type { CouponRule, CouponUsage, PricingVariant, PromotionRule } from "./engine";

type Client = Tx | typeof db;

export async function loadActivePromotions(client: Client = db, now = new Date()): Promise<PromotionRule[]> {
  return client.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: { id: true, type: true, value: true, productId: true, categoryId: true, startsAt: true, endsAt: true, isActive: true },
  });
}

export function toPricingVariant(v: {
  id: string;
  productId: string;
  price: number;
  salePrice: number | null;
  product: { categories: { categoryId: string }[] };
}): PricingVariant {
  return {
    variantId: v.id,
    productId: v.productId,
    categoryIds: v.product.categories.map((c) => c.categoryId),
    price: v.price,
    salePrice: v.salePrice,
  };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function loadCoupon(
  code: string,
  customer: { email?: string | null; userId?: string | null },
  client: Client = db,
): Promise<{ rule: CouponRule; usage: CouponUsage } | null> {
  const c = await client.coupon.findUnique({
    where: { code: normalizeCouponCode(code) },
    include: { products: { select: { productId: true } }, categories: { select: { categoryId: true } } },
  });
  if (!c) return null;
  const total = await client.couponRedemption.count({ where: { couponId: c.id } });
  const or = [
    ...(customer.email ? [{ email: customer.email.toLowerCase() }] : []),
    ...(customer.userId ? [{ userId: customer.userId }] : []),
  ];
  const byCustomer = or.length ? await client.couponRedemption.count({ where: { couponId: c.id, OR: or } }) : 0;
  return {
    rule: {
      code: c.code,
      type: c.type,
      value: c.value,
      scope: c.scope,
      productIds: c.products.map((p) => p.productId),
      categoryIds: c.categories.map((p) => p.categoryId),
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      minOrderTotal: c.minOrderTotal,
      maxRedemptions: c.maxRedemptions,
      perCustomerLimit: c.perCustomerLimit,
      combineWithSales: c.combineWithSales,
      isActive: c.isActive,
    },
    usage: { total, byCustomer },
  };
}
