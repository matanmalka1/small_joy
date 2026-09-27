import { describe, expect, it } from "vitest";
import { priceCart, unitPriceFor, type CouponRule, type PricingVariant, type PromotionRule } from "@/server/pricing/engine";

const now = new Date("2026-06-15T12:00:00Z");

const v = (over: Partial<PricingVariant> = {}): PricingVariant => ({
  variantId: over.variantId ?? "v1",
  productId: over.productId ?? "p1",
  categoryIds: over.categoryIds ?? ["c1"],
  price: over.price ?? 10000,
  salePrice: over.salePrice ?? null,
});

const promo = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  id: "pr1",
  type: "PERCENT",
  value: 10,
  productId: null,
  categoryId: "c1",
  startsAt: null,
  endsAt: null,
  isActive: true,
  ...over,
});

const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "TEST",
  type: "PERCENT",
  value: 10,
  scope: "ALL",
  productIds: [],
  categoryIds: [],
  startsAt: null,
  endsAt: null,
  minOrderTotal: 0,
  maxRedemptions: null,
  perCustomerLimit: null,
  combineWithSales: false,
  isActive: true,
  ...over,
});

describe("unit price", () => {
  it("uses the regular price when there is no discount", () => {
    expect(unitPriceFor(v(), [], now)).toMatchObject({ unitPrice: 10000, listPrice: 10000, onSale: false });
  });

  it("uses the sale price when lower", () => {
    expect(unitPriceFor(v({ salePrice: 7990 }), [], now)).toMatchObject({ unitPrice: 7990, onSale: true });
  });

  it("ignores an invalid sale price that is not lower", () => {
    expect(unitPriceFor(v({ salePrice: 12000 }), [], now).unitPrice).toBe(10000);
  });

  it("applies the best active promotion but never stacks it with the sale price", () => {
    // Sale 90.00 vs promotion 20% → 80.00: lowest wins, no stacking (would be 72.00).
    const r = unitPriceFor(v({ salePrice: 9000 }), [promo({ value: 20 })], now);
    expect(r.unitPrice).toBe(8000);
    expect(r.promotionId).toBe("pr1");
  });

  it("ignores inactive, future and expired promotions", () => {
    const promos = [
      promo({ id: "a", isActive: false, value: 50 }),
      promo({ id: "b", startsAt: new Date("2026-07-01"), value: 50 }),
      promo({ id: "c", endsAt: new Date("2026-06-01"), value: 50 }),
    ];
    expect(unitPriceFor(v(), promos, now).unitPrice).toBe(10000);
  });

  it("matches product-level promotions only for that product", () => {
    const p = promo({ categoryId: null, productId: "other", value: 50 });
    expect(unitPriceFor(v(), [p], now).unitPrice).toBe(10000);
    expect(unitPriceFor(v(), [{ ...p, productId: "p1" }], now).unitPrice).toBe(5000);
  });

  it("fixed promotions never go below zero", () => {
    expect(unitPriceFor(v({ price: 500 }), [promo({ type: "FIXED", value: 900 })], now).unitPrice).toBe(0);
  });

  it("rounds percentage discounts to whole agorot", () => {
    // 33% of 19.99 = 6.5967 → 6.60 off → 13.39
    expect(unitPriceFor(v({ price: 1999 }), [promo({ value: 33 })], now).unitPrice).toBe(1339);
  });
});

describe("priceCart", () => {
  it("sums line totals with quantities", () => {
    const r = priceCart({ lines: [{ variant: v(), quantity: 3 }, { variant: v({ variantId: "v2", price: 2550 }), quantity: 2 }], promotions: [], now });
    expect(r.subtotal).toBe(35100);
    expect(r.total).toBe(35100);
    expect(r.shippingTotal).toBeNull();
  });

  it("applies a percent coupon to eligible lines only", () => {
    const r = priceCart({
      lines: [{ variant: v(), quantity: 1 }, { variant: v({ variantId: "v2", salePrice: 5000 }), quantity: 1 }],
      promotions: [],
      coupon: coupon({ value: 10 }),
      now,
    });
    // Sale line excluded (combineWithSales=false): 10% of 100.00
    expect(r.discountTotal).toBe(1000);
    expect(r.total).toBe(15000 - 1000);
  });

  it("applies coupons on sale items when combineWithSales is set", () => {
    const r = priceCart({ lines: [{ variant: v({ salePrice: 5000 }), quantity: 2 }], promotions: [], coupon: coupon({ combineWithSales: true }), now });
    expect(r.discountTotal).toBe(1000);
  });

  it("caps a fixed coupon at the eligible subtotal", () => {
    const r = priceCart({ lines: [{ variant: v({ price: 1500 }), quantity: 1 }], promotions: [], coupon: coupon({ type: "FIXED", value: 5000 }), now });
    expect(r.discountTotal).toBe(1500);
    expect(r.total).toBe(0);
  });

  it("rejects coupons below the minimum order total", () => {
    const r = priceCart({ lines: [{ variant: v(), quantity: 1 }], promotions: [], coupon: coupon({ minOrderTotal: 20000 }), now });
    expect(r.couponError).toBe("MIN_TOTAL");
    expect(r.discountTotal).toBe(0);
  });

  it("rejects expired, future, inactive and exhausted coupons", () => {
    const lines = [{ variant: v(), quantity: 1 }];
    expect(priceCart({ lines, promotions: [], coupon: coupon({ endsAt: new Date("2026-01-01") }), now }).couponError).toBe("EXPIRED");
    expect(priceCart({ lines, promotions: [], coupon: coupon({ startsAt: new Date("2027-01-01") }), now }).couponError).toBe("NOT_STARTED");
    expect(priceCart({ lines, promotions: [], coupon: coupon({ isActive: false }), now }).couponError).toBe("INACTIVE");
    expect(priceCart({ lines, promotions: [], coupon: coupon({ maxRedemptions: 5 }), couponUsage: { total: 5, byCustomer: 0 }, now }).couponError).toBe("EXHAUSTED");
    expect(priceCart({ lines, promotions: [], coupon: coupon({ perCustomerLimit: 1 }), couponUsage: { total: 1, byCustomer: 1 }, now }).couponError).toBe("CUSTOMER_LIMIT");
  });

  it("scopes coupons to products or categories", () => {
    const lines = [{ variant: v({ productId: "p1", categoryIds: ["c1"] }), quantity: 1 }, { variant: v({ variantId: "v2", productId: "p2", categoryIds: ["c2"] }), quantity: 1 }];
    expect(priceCart({ lines, promotions: [], coupon: coupon({ scope: "PRODUCTS", productIds: ["p2"] }), now }).discountTotal).toBe(1000);
    expect(priceCart({ lines, promotions: [], coupon: coupon({ scope: "CATEGORIES", categoryIds: ["c1"] }), now }).discountTotal).toBe(1000);
    expect(priceCart({ lines, promotions: [], coupon: coupon({ scope: "CATEGORIES", categoryIds: ["zz"] }), now }).couponError).toBe("NOT_APPLICABLE");
  });

  it("computes shipping with a free-shipping threshold after the coupon", () => {
    const lines = [{ variant: v({ price: 30000 }), quantity: 1 }];
    const shipping = { price: 3000, freeShippingThreshold: 30000 };
    expect(priceCart({ lines, promotions: [], shipping, now }).shippingTotal).toBe(0);
    // A 10% coupon drops it below the threshold → shipping is charged.
    const r = priceCart({ lines, promotions: [], coupon: coupon(), shipping, now });
    expect(r.shippingTotal).toBe(3000);
    expect(r.total).toBe(30000 - 3000 + 3000);
  });

  it("reports sale savings", () => {
    expect(priceCart({ lines: [{ variant: v({ salePrice: 8000 }), quantity: 2 }], promotions: [], now }).saleSavings).toBe(4000);
  });
});
