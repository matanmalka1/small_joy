"use server";

import { revalidatePath } from "next/cache";
import { cartLineSchema, couponSchema } from "@/lib/validation/cart";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/action-result";
import { addToCart, CartError, removeFromCart, setCartCoupon, setCartQuantity } from "@/server/cart/cart";
import { ensureCurrentCart, currentCartIdentity, getCurrentCart } from "@/server/cart/session";
import { loadCoupon, normalizeCouponCode } from "@/server/pricing/loaders";
import { couponErrorMessages, validateCouponWindow } from "@/server/pricing/engine";

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof CartError) return { ok: false, error: e.message };
  logger.error("cart.action_failed", { error: e });
  return { ok: false, error: "אירעה שגיאה, נסו שוב" };
}

export async function addToCartAction(input: { variantId: string; quantity: number }): Promise<ActionResult<{ quantity: number }>> {
  const parsed = cartLineSchema.safeParse(input);
  if (!parsed.success || parsed.data.quantity < 1) return { ok: false, error: "כמות לא תקינה" };
  if (!(await rateLimitByIp("cart", 120, 60))) return { ok: false, error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
  try {
    const cart = await ensureCurrentCart();
    const quantity = await addToCart(cart.id, parsed.data.variantId, parsed.data.quantity);
    revalidatePath("/", "layout");
    return { ok: true, data: { quantity }, message: "המוצר נוסף לסל" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCartLineAction(input: { variantId: string; quantity: number }): Promise<ActionResult<{ quantity: number }>> {
  const parsed = cartLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "כמות לא תקינה" };
  try {
    const cart = await getCurrentCart();
    if (!cart) return { ok: false, error: "הסל ריק" };
    const quantity = await setCartQuantity(cart.id, parsed.data.variantId, parsed.data.quantity);
    revalidatePath("/", "layout");
    return { ok: true, data: { quantity } };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCartLineAction(variantId: string): Promise<ActionResult> {
  try {
    const cart = await getCurrentCart();
    if (cart) await removeFromCart(cart.id, String(variantId).slice(0, 40));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function applyCouponAction(input: { code: string }): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  // Brute-force protection for coupon guessing.
  if (!(await rateLimitByIp("coupon", 10, 300))) return { ok: false, error: "יותר מדי ניסיונות. נסו שוב בעוד מספר דקות" };
  try {
    const identity = await currentCartIdentity();
    const cart = await getCurrentCart();
    if (!cart) return { ok: false, error: "הסל ריק" };
    const coupon = await loadCoupon(parsed.data.code, { email: identity.email, userId: identity.userId });
    if (!coupon) return { ok: false, error: couponErrorMessages.NOT_FOUND };
    const err = validateCouponWindow(coupon.rule, coupon.usage, new Date());
    if (err) return { ok: false, error: couponErrorMessages[err] };
    await setCartCoupon(cart.id, normalizeCouponCode(parsed.data.code));
    revalidatePath("/", "layout");
    return { ok: true, message: "הקופון נקלט" };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  const cart = await getCurrentCart();
  if (cart) await setCartCoupon(cart.id, null);
  revalidatePath("/", "layout");
  return { ok: true };
}
