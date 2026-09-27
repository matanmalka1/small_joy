/**
 * Pure pricing engine. The single source of truth for every price shown or
 * charged. Framework- and DB-free so it can be unit tested exhaustively.
 * All amounts are integer agorot.
 *
 * Rules:
 *  - A variant's unit price is the lowest of: its regular price, its sale
 *    price, and the regular price after the best active automatic promotion.
 *    Sale price and promotions never stack with each other.
 *  - A coupon applies once per order on top of unit prices. Unless
 *    `combineWithSales` is set, it only applies to lines not already discounted.
 *  - Free-shipping threshold is compared with the subtotal after the coupon.
 */

import { percentOf } from "@/lib/money";

export type DiscountKind = "PERCENT" | "FIXED";

export type PricingVariant = {
  variantId: string;
  productId: string;
  categoryIds: string[];
  price: number;
  salePrice: number | null;
};

export type PromotionRule = {
  id: string;
  type: DiscountKind;
  value: number;
  productId: string | null;
  categoryId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export type CouponRule = {
  code: string;
  type: DiscountKind;
  value: number;
  scope: "ALL" | "PRODUCTS" | "CATEGORIES";
  productIds: string[];
  categoryIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  minOrderTotal: number;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  combineWithSales: boolean;
  isActive: boolean;
};

export type CouponUsage = { total: number; byCustomer: number };

export type ShippingRule = { price: number | null; freeShippingThreshold: number | null };

export type UnitPrice = {
  unitPrice: number;
  listPrice: number;
  onSale: boolean;
  promotionId: string | null;
};

export function isWithinWindow(now: Date, startsAt: Date | null, endsAt: Date | null): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function applyDiscount(amount: number, type: DiscountKind, value: number): number {
  const off = type === "PERCENT" ? percentOf(amount, Math.min(Math.max(value, 0), 100)) : Math.max(value, 0);
  return Math.max(0, amount - off);
}

export function promotionApplies(p: PromotionRule, v: PricingVariant, now: Date): boolean {
  if (!p.isActive || !isWithinWindow(now, p.startsAt, p.endsAt)) return false;
  if (p.productId) return p.productId === v.productId;
  if (p.categoryId) return v.categoryIds.includes(p.categoryId);
  return false;
}

export function unitPriceFor(v: PricingVariant, promotions: PromotionRule[], now: Date): UnitPrice {
  const listPrice = v.price;
  let best = listPrice;
  let promotionId: string | null = null;

  if (v.salePrice != null && v.salePrice >= 0 && v.salePrice < best) best = v.salePrice;

  for (const p of promotions) {
    if (!promotionApplies(p, v, now)) continue;
    const discounted = applyDiscount(listPrice, p.type, p.value);
    if (discounted < best) {
      best = discounted;
      promotionId = p.id;
    }
  }
  return { unitPrice: best, listPrice, onSale: best < listPrice, promotionId };
}

export type CouponError =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "MIN_TOTAL"
  | "EXHAUSTED"
  | "CUSTOMER_LIMIT"
  | "NOT_APPLICABLE";

export const couponErrorMessages: Record<CouponError, string> = {
  NOT_FOUND: "קוד הקופון לא נמצא",
  INACTIVE: "הקופון אינו פעיל",
  NOT_STARTED: "הקופון עדיין אינו בתוקף",
  EXPIRED: "תוקף הקופון הסתיים",
  MIN_TOTAL: "סכום ההזמנה נמוך מהמינימום הנדרש לקופון",
  EXHAUSTED: "הקופון נוצל במלואו",
  CUSTOMER_LIMIT: "כבר מימשת את הקופון הזה",
  NOT_APPLICABLE: "הקופון אינו חל על המוצרים שבסל",
};

export type CartLineInput = { variant: PricingVariant; quantity: number };

export type PricedLine = UnitPrice & {
  variantId: string;
  quantity: number;
  lineTotal: number;
  couponEligible: boolean;
};

export type CartPricing = {
  lines: PricedLine[];
  /** Sum of line totals (after sale prices / promotions). */
  subtotal: number;
  /** Savings from sale prices and promotions, for display only. */
  saleSavings: number;
  /** Coupon discount. */
  discountTotal: number;
  /** null = shipping not selected or not available. */
  shippingTotal: number | null;
  total: number;
  coupon: { code: string; discount: number } | null;
  couponError: CouponError | null;
};

function couponLineEligible(c: CouponRule, line: PricedLine, v: PricingVariant): boolean {
  if (!c.combineWithSales && line.onSale) return false;
  if (c.scope === "PRODUCTS") return c.productIds.includes(v.productId);
  if (c.scope === "CATEGORIES") return v.categoryIds.some((id) => c.categoryIds.includes(id));
  return true;
}

export function validateCouponWindow(c: CouponRule, usage: CouponUsage, now: Date): CouponError | null {
  if (!c.isActive) return "INACTIVE";
  if (c.startsAt && now < c.startsAt) return "NOT_STARTED";
  if (c.endsAt && now > c.endsAt) return "EXPIRED";
  if (c.maxRedemptions != null && usage.total >= c.maxRedemptions) return "EXHAUSTED";
  if (c.perCustomerLimit != null && usage.byCustomer >= c.perCustomerLimit) return "CUSTOMER_LIMIT";
  return null;
}

export function priceCart(input: {
  lines: CartLineInput[];
  promotions: PromotionRule[];
  coupon?: CouponRule | null;
  couponUsage?: CouponUsage;
  shipping?: ShippingRule | null;
  now: Date;
}): CartPricing {
  const { promotions, now } = input;

  const lines: PricedLine[] = input.lines.map(({ variant, quantity }) => {
    const unit = unitPriceFor(variant, promotions, now);
    return {
      ...unit,
      variantId: variant.variantId,
      quantity,
      lineTotal: unit.unitPrice * quantity,
      couponEligible: false,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const saleSavings = lines.reduce((s, l) => s + (l.listPrice - l.unitPrice) * l.quantity, 0);

  let discountTotal = 0;
  let coupon: CartPricing["coupon"] = null;
  let couponError: CouponError | null = null;

  if (input.coupon) {
    const c = input.coupon;
    couponError = validateCouponWindow(c, input.couponUsage ?? { total: 0, byCustomer: 0 }, now);
    if (!couponError && subtotal < c.minOrderTotal) couponError = "MIN_TOTAL";
    if (!couponError) {
      let eligibleSubtotal = 0;
      lines.forEach((l, i) => {
        l.couponEligible = couponLineEligible(c, l, input.lines[i].variant);
        if (l.couponEligible) eligibleSubtotal += l.lineTotal;
      });
      if (eligibleSubtotal === 0) {
        couponError = "NOT_APPLICABLE";
      } else {
        discountTotal =
          c.type === "PERCENT"
            ? percentOf(eligibleSubtotal, Math.min(Math.max(c.value, 0), 100))
            : Math.min(Math.max(c.value, 0), eligibleSubtotal);
        coupon = { code: c.code, discount: discountTotal };
      }
    }
    if (couponError) lines.forEach((l) => (l.couponEligible = false));
  }

  const afterDiscount = subtotal - discountTotal;

  let shippingTotal: number | null = null;
  if (input.shipping && input.shipping.price != null) {
    const { price, freeShippingThreshold } = input.shipping;
    shippingTotal = freeShippingThreshold != null && afterDiscount >= freeShippingThreshold ? 0 : price;
  }

  return {
    lines,
    subtotal,
    saleSavings,
    discountTotal,
    shippingTotal,
    total: afterDiscount + (shippingTotal ?? 0),
    coupon,
    couponError,
  };
}
