import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addToCart, buildCartView, CartError, mergeGuestCart, setCartQuantity } from "@/server/cart/cart";
import { createCart, createProduct, createUser, resetDb } from "../support/db";

beforeEach(resetDb);

describe("cart", () => {
  it("adds items and caps quantity at available stock", async () => {
    const { variant } = await createProduct({ stock: 3 });
    const cart = await createCart([]);
    expect(await addToCart(cart.id, variant.id, 2)).toBe(2);
    expect(await addToCart(cart.id, variant.id, 5)).toBe(3);
    await expect(addToCart(cart.id, variant.id, 1)).rejects.toBeInstanceOf(CartError);
  });

  it("refuses out-of-stock and unpublished products", async () => {
    const { variant: empty } = await createProduct({ stock: 0 });
    const { variant: draft } = await createProduct({ status: "DRAFT" });
    const cart = await createCart([]);
    await expect(addToCart(cart.id, empty.id, 1)).rejects.toThrow("אזל");
    await expect(addToCart(cart.id, draft.id, 1)).rejects.toThrow("אינו זמין");
  });

  it("updates and removes quantities", async () => {
    const { variant } = await createProduct({ stock: 10 });
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }]);
    expect(await setCartQuantity(cart.id, variant.id, 4)).toBe(4);
    expect(await setCartQuantity(cart.id, variant.id, 0)).toBe(0);
    expect(await db.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
  });

  it("flags lines whose stock dropped after they were added", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const cart = await createCart([{ variantId: variant.id, quantity: 4 }]);
    await db.productVariant.update({ where: { id: variant.id }, data: { stockQuantity: 2 } });
    const view = await buildCartView(cart.id);
    expect(view.hasProblems).toBe(true);
    expect(view.lines[0].problem).toContain("2");
  });

  it("prices the cart on the server including promotions and coupons", async () => {
    const cat = await db.category.create({ data: { slug: "c", name: "c" } });
    const { variant } = await createProduct({ price: 10000, categoryId: cat.id });
    await db.promotion.create({ data: { name: "p", type: "PERCENT", value: 20, categoryId: cat.id } });
    await db.coupon.create({ data: { code: "ALL5", type: "FIXED", value: 500, combineWithSales: true } });
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }], { couponCode: "ALL5" });
    const view = await buildCartView(cart.id);
    expect(view.lines[0].unitPrice).toBe(8000);
    expect(view.pricing.discountTotal).toBe(500);
    expect(view.pricing.total).toBe(7500);
  });

  it("merges a guest cart into the user's cart on login", async () => {
    const user = await createUser();
    const { variant: a } = await createProduct({ stock: 5 });
    const { variant: b } = await createProduct({ stock: 5 });
    await createCart([{ variantId: a.id, quantity: 2 }], { userId: user.id });
    const guest = await createCart([{ variantId: a.id, quantity: 4 }, { variantId: b.id, quantity: 1 }]);
    await mergeGuestCart(guest.token, user.id);
    const merged = await db.cart.findFirstOrThrow({ where: { userId: user.id }, include: { items: true } });
    expect(merged.items.find((i) => i.variantId === a.id)?.quantity).toBe(5); // capped by stock
    expect(merged.items.find((i) => i.variantId === b.id)?.quantity).toBe(1);
    expect(await db.cart.findUnique({ where: { id: guest.id } })).toBeNull();
  });
});
