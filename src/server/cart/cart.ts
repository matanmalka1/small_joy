import "server-only";
import { randomBytes } from "node:crypto";
import { db, type Tx } from "@/lib/db";
import { variantLabel, type VariantOptions } from "@/server/catalog/options";
import { priceCart, couponErrorMessages, type CartPricing, type ShippingRule } from "@/server/pricing/engine";
import { loadActivePromotions, loadCoupon, toPricingVariant } from "@/server/pricing/loaders";

export const CART_COOKIE = "sj_cart";
export const MAX_LINE_QUANTITY = 99;

type Client = Tx | typeof db;

export type CartIdentity = { userId?: string | null; token?: string | null };

export class CartError extends Error {}

export function newCartToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Finds the cart for a user (preferred) or a guest token. Never creates. */
export async function findCart(identity: CartIdentity, client: Client = db) {
  if (identity.userId) {
    return client.cart.findFirst({ where: { userId: identity.userId }, orderBy: { updatedAt: "desc" } });
  }
  if (identity.token) {
    return client.cart.findFirst({ where: { token: identity.token, userId: null } });
  }
  return null;
}

export async function findOrCreateCart(identity: CartIdentity): Promise<{ id: string; token: string; created: boolean }> {
  const existing = await findCart(identity);
  if (existing) return { id: existing.id, token: existing.token, created: false };
  const cart = await db.cart.create({ data: { token: newCartToken(), userId: identity.userId ?? null } });
  return { id: cart.id, token: cart.token, created: true };
}

async function loadSellableVariant(variantId: string, client: Client) {
  const v = await client.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!v || !v.isActive || v.product.status !== "ACTIVE") throw new CartError("המוצר אינו זמין למכירה");
  return v;
}

/** Adds to the cart; quantity is capped at available stock. Returns the resulting line quantity. */
export async function addToCart(cartId: string, variantId: string, quantity: number): Promise<number> {
  return db.$transaction(async (tx) => {
    const v = await loadSellableVariant(variantId, tx);
    if (v.stockQuantity <= 0) throw new CartError("המוצר אזל מהמלאי");
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
    const desired = (existing?.quantity ?? 0) + quantity;
    const finalQty = Math.min(desired, v.stockQuantity, MAX_LINE_QUANTITY);
    if (existing && finalQty === existing.quantity) {
      throw new CartError(`ניתן להזמין עד ${finalQty} יחידות ממוצר זה`);
    }
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity: finalQty },
      update: { quantity: finalQty },
    });
    await tx.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
    return finalQty;
  });
}

export async function setCartQuantity(cartId: string, variantId: string, quantity: number): Promise<number> {
  if (quantity <= 0) {
    await db.cartItem.deleteMany({ where: { cartId, variantId } });
    return 0;
  }
  return db.$transaction(async (tx) => {
    const v = await loadSellableVariant(variantId, tx);
    const finalQty = Math.min(quantity, v.stockQuantity, MAX_LINE_QUANTITY);
    if (finalQty <= 0) {
      await tx.cartItem.deleteMany({ where: { cartId, variantId } });
      return 0;
    }
    await tx.cartItem.updateMany({ where: { cartId, variantId }, data: { quantity: finalQty } });
    return finalQty;
  });
}

export async function removeFromCart(cartId: string, variantId: string) {
  await db.cartItem.deleteMany({ where: { cartId, variantId } });
}

export async function setCartCoupon(cartId: string, code: string | null) {
  await db.cart.update({ where: { id: cartId }, data: { couponCode: code } });
}

/** Moves a guest cart into the user's cart after login (quantities merged, capped by stock). */
export async function mergeGuestCart(token: string | null | undefined, userId: string) {
  if (!token) return;
  const guest = await db.cart.findFirst({ where: { token, userId: null }, include: { items: true } });
  if (!guest) return;
  const userCart = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { items: true } });
  if (!userCart) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }
  await db.$transaction(async (tx) => {
    for (const item of guest.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) continue;
      const current = userCart.items.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
      const qty = Math.min(current + item.quantity, variant.stockQuantity, MAX_LINE_QUANTITY);
      if (qty <= 0) continue;
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, quantity: qty },
        update: { quantity: qty },
      });
    }
    if (guest.couponCode && !userCart.couponCode) {
      await tx.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

// ───────────── Cart view (priced) ─────────────

export type CartLineView = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  unitPrice: number;
  listPrice: number;
  lineTotal: number;
  onSale: boolean;
  /** Line cannot be purchased as-is (out of stock / unavailable / exceeds stock). */
  problem: string | null;
};

export type CartView = {
  cartId: string;
  lines: CartLineView[];
  itemCount: number;
  pricing: CartPricing;
  couponCode: string | null;
  couponMessage: string | null;
  hasProblems: boolean;
};

export async function buildCartView(
  cartId: string,
  opts: { email?: string | null; userId?: string | null; shipping?: ShippingRule | null; client?: Client } = {},
): Promise<CartView> {
  const client = opts.client ?? db;
  const now = new Date();
  const cart = await client.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              product: {
                include: {
                  categories: { select: { categoryId: true } },
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  const promotions = await loadActivePromotions(client, now);
  const coupon = cart.couponCode ? await loadCoupon(cart.couponCode, { email: opts.email, userId: opts.userId }, client) : null;

  const pricing = priceCart({
    lines: cart.items.map((i) => ({ variant: toPricingVariant(i.variant), quantity: i.quantity })),
    promotions,
    coupon: coupon?.rule ?? null,
    couponUsage: coupon?.usage,
    shipping: opts.shipping ?? null,
    now,
  });

  const lines: CartLineView[] = cart.items.map((item, idx) => {
    const v = item.variant;
    const priced = pricing.lines[idx];
    let problem: string | null = null;
    if (!v.isActive || v.product.status !== "ACTIVE") problem = "המוצר אינו זמין עוד";
    else if (v.stockQuantity <= 0) problem = "אזל מהמלאי";
    else if (item.quantity > v.stockQuantity) problem = `נותרו רק ${v.stockQuantity} יחידות במלאי`;
    return {
      variantId: v.id,
      productId: v.productId,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantLabel: variantLabel(v.options as VariantOptions),
      sku: v.sku,
      imageUrl: v.product.images[0]?.url ?? null,
      quantity: item.quantity,
      stock: v.stockQuantity,
      unitPrice: priced.unitPrice,
      listPrice: priced.listPrice,
      lineTotal: priced.lineTotal,
      onSale: priced.onSale,
      problem,
    };
  });

  let couponMessage: string | null = null;
  if (cart.couponCode && !coupon) couponMessage = couponErrorMessages.NOT_FOUND;
  else if (pricing.couponError) couponMessage = couponErrorMessages[pricing.couponError];

  return {
    cartId: cart.id,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    pricing,
    couponCode: cart.couponCode,
    couponMessage,
    hasProblems: lines.some((l) => l.problem),
  };
}

export async function cartItemCount(identity: CartIdentity): Promise<number> {
  const cart = await findCart(identity);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}
