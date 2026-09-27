import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkoutCart, CheckoutError } from "@/server/checkout/checkout";
import { changeOrderStatus, getOrderForViewer, refundOrder } from "@/server/orders/orders";
import { handlePaymentWebhook } from "@/server/payments/webhook";
import { MOCK_SIGNATURE_HEADER } from "@/server/payments/providers/mock";
import { createCart, createDeliveryMethod, createPickupMethod, createProduct, createUser, guestInput, resetDb } from "../support/db";
import { sendWebhook } from "../support/payments";

async function placeOrder(items: { variantId: string; quantity: number }[], opts: { couponCode?: string; email?: string } = {}) {
  const method = (await db.shippingMethod.findFirst({ where: { type: "PICKUP" } })) ?? (await createPickupMethod());
  const cart = await createCart(items, { couponCode: opts.couponCode });
  const res = await checkoutCart(cart.id, { ...guestInput(method.id), email: opts.email ?? "guest@example.com" }, null);
  const payment = await db.payment.findFirstOrThrow({ where: { orderId: res.orderId }, orderBy: { createdAt: "desc" } });
  return { ...res, cart, payment };
}

const stockOf = async (variantId: string) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;

beforeEach(resetDb);

describe("order creation", () => {
  it("creates an order with server-computed prices and immutable item snapshots", async () => {
    const { product, variant } = await createProduct({ price: 4990, salePrice: 3990, stock: 5 });
    const { orderId, redirectUrl } = await placeOrder([{ variantId: variant.id, quantity: 2 }]);
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.subtotal).toBe(7980);
    expect(order.total).toBe(7980);
    expect(order.items[0]).toMatchObject({ productName: product.name, sku: variant.sku, unitPrice: 3990, listPrice: 4990, quantity: 2, lineTotal: 7980 });
    expect(redirectUrl).toContain("/sandbox-pay/");

    // Catalog changes later must not affect the historical order.
    await db.product.update({ where: { id: product.id }, data: { name: "שם חדש" } });
    await db.productVariant.update({ where: { id: variant.id }, data: { price: 99900, salePrice: null } });
    const again = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    expect(again.items[0].productName).toBe(product.name);
    expect(again.items[0].unitPrice).toBe(3990);
    // Stock is NOT reserved/decremented before payment.
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("refuses to check out more than the available stock", async () => {
    const { variant } = await createProduct({ stock: 1 });
    await expect(placeOrder([{ variantId: variant.id, quantity: 3 }])).rejects.toBeInstanceOf(CheckoutError);
  });

  it("reuses the pending order on a double submit instead of creating duplicates", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const method = await createPickupMethod();
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }]);
    const a = await checkoutCart(cart.id, guestInput(method.id), null);
    const b = await checkoutCart(cart.id, guestInput(method.id), null);
    expect(b.orderId).toBe(a.orderId);
    expect(await db.order.count()).toBe(1);
    // A new payment attempt supersedes the old one.
    const payments = await db.payment.findMany({ where: { orderId: a.orderId }, orderBy: { createdAt: "asc" } });
    expect(payments.map((p) => p.status)).toEqual(["CANCELLED", "CREATED"]);
  });

  it("charges delivery unless the free-shipping threshold is reached", async () => {
    const { variant } = await createProduct({ price: 10000, stock: 10 });
    const method = await createDeliveryMethod(3000, 25000);
    const input = { ...guestInput(method.id), fulfillment: "DELIVERY" as const, address: { city: "נתניה", street: "הרצל", houseNumber: "1" } };
    const cheap = await checkoutCart((await createCart([{ variantId: variant.id, quantity: 1 }])).id, input, null);
    const big = await checkoutCart((await createCart([{ variantId: variant.id, quantity: 3 }])).id, input, null);
    expect((await db.order.findUniqueOrThrow({ where: { id: cheap.orderId } })).total).toBe(13000);
    expect((await db.order.findUniqueOrThrow({ where: { id: big.orderId } })).total).toBe(30000);
  });

  it("rejects delivery without a configured price and delivery outside the zones", async () => {
    const { variant } = await createProduct();
    const unpriced = await db.shippingMethod.create({ data: { name: "x", type: "DELIVERY", price: null, isActive: true } });
    const zoned = await db.shippingMethod.create({ data: { name: "y", type: "DELIVERY", price: 1000, isActive: true, zones: ["נתניה"] } });
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }]);
    const addr = { city: "אילת", street: "א", houseNumber: "1" };
    await expect(checkoutCart(cart.id, { ...guestInput(unpriced.id), fulfillment: "DELIVERY", address: addr }, null)).rejects.toThrow("אינה זמינה");
    await expect(checkoutCart(cart.id, { ...guestInput(zoned.id), fulfillment: "DELIVERY", address: addr }, null)).rejects.toThrow("אין משלוח");
  });
});

describe("payment webhooks", () => {
  it("marks the order paid, decrements stock, redeems the coupon and clears the cart", async () => {
    const { variant } = await createProduct({ price: 10000, stock: 5 });
    await db.coupon.create({ data: { code: "TEN", type: "PERCENT", value: 10 } });
    const { orderId, payment, cart } = await placeOrder([{ variantId: variant.id, quantity: 2 }], { couponCode: "TEN" });
    expect(payment.amount).toBe(18000);

    const { outcome } = await sendWebhook({ payment_reference: payment.id, amount: payment.amount });
    expect(outcome).toMatchObject({ status: 200, result: "processed" });

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: "PAID", paymentStatus: "PAID" });
    expect(order.stockCommittedAt).not.toBeNull();
    expect(await stockOf(variant.id)).toBe(3);
    expect(await db.couponRedemption.count({ where: { orderId } })).toBe(1);
    expect(await db.cart.findUnique({ where: { id: cart.id } })).toBeNull();
    expect(await db.inventoryMovement.count({ where: { orderId, reason: "SALE" } })).toBe(1);
  });

  it("is idempotent: a repeated webhook never decrements stock twice", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const { payment } = await placeOrder([{ variantId: variant.id, quantity: 2 }]);
    const first = await sendWebhook({ id: "evt_dup", payment_reference: payment.id, amount: payment.amount });
    const second = await sendWebhook({ id: "evt_dup", payment_reference: payment.id, amount: payment.amount });
    // A different event id for the same already-succeeded payment is also a no-op.
    const third = await sendWebhook({ id: "evt_other", payment_reference: payment.id, amount: payment.amount });
    expect(first.outcome.result).toBe("processed");
    expect(second.outcome.result).toBe("duplicate");
    expect(third.outcome.status).toBe(200);
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("handles concurrent duplicate deliveries of the same event safely", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const { payment } = await placeOrder([{ variantId: variant.id, quantity: 1 }]);
    const results = await Promise.all(Array.from({ length: 5 }, () => sendWebhook({ id: "evt_race", payment_reference: payment.id, amount: payment.amount })));
    expect(results.filter((r) => r.outcome.result === "processed")).toHaveLength(1);
    expect(await stockOf(variant.id)).toBe(4);
  });

  it("a failed payment changes no stock and keeps the order open for retry", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const { orderId, payment } = await placeOrder([{ variantId: variant.id, quantity: 1 }]);
    await sendWebhook({ type: "payment.failed", payment_reference: payment.id, amount: payment.amount, transaction_id: null, failure_reason: "declined" });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: "PENDING_PAYMENT", paymentStatus: "FAILED", stockCommittedAt: null });
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("rejects a webhook with an invalid signature", async () => {
    const { variant } = await createProduct();
    const { orderId, payment } = await placeOrder([{ variantId: variant.id, quantity: 1 }]);
    const body = JSON.stringify({ id: "evt_x", type: "payment.succeeded", payment_reference: payment.id, transaction_id: "t", amount: payment.amount, currency: "ILS" });
    const res = await handlePaymentWebhook("mock", body, new Headers({ [MOCK_SIGNATURE_HEADER]: `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}` }));
    expect(res.status).toBe(401);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).paymentStatus).toBe("PENDING");
  });

  it("rejects a webhook whose amount does not match the order", async () => {
    const { variant } = await createProduct({ price: 10000 });
    const { orderId, payment } = await placeOrder([{ variantId: variant.id, quantity: 1 }]);
    const { outcome } = await sendWebhook({ payment_reference: payment.id, amount: 100 });
    expect(outcome.status).toBe(400);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PENDING_PAYMENT");
  });

  it("concurrent orders for the last unit: exactly one gets it, the other is cancelled and refunded", async () => {
    const { variant } = await createProduct({ stock: 1 });
    const a = await placeOrder([{ variantId: variant.id, quantity: 1 }], { email: "a@example.com" });
    const b = await placeOrder([{ variantId: variant.id, quantity: 1 }], { email: "b@example.com" });
    await Promise.all([
      sendWebhook({ payment_reference: a.payment.id, amount: a.payment.amount }),
      sendWebhook({ payment_reference: b.payment.id, amount: b.payment.amount }),
    ]);
    const orders = await db.order.findMany({ where: { id: { in: [a.orderId, b.orderId] } } });
    const paid = orders.filter((o) => o.status === "PAID");
    const cancelled = orders.filter((o) => o.status === "CANCELLED");
    expect(paid).toHaveLength(1);
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]).toMatchObject({ paymentStatus: "REFUNDED", needsAttention: true });
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("a second successful attempt for an already-paid order is refunded automatically", async () => {
    const { variant } = await createProduct({ stock: 5 });
    const method = await createPickupMethod();
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }]);
    const first = await checkoutCart(cart.id, guestInput(method.id), null);
    const p1 = await db.payment.findFirstOrThrow({ where: { orderId: first.orderId } });
    await checkoutCart(cart.id, guestInput(method.id), null); // retry → new attempt, p1 superseded
    const p2 = await db.payment.findFirstOrThrow({ where: { orderId: first.orderId, status: "CREATED" } });
    await sendWebhook({ payment_reference: p2.id, amount: p2.amount });
    await sendWebhook({ payment_reference: p1.id, amount: p1.amount }); // late success of the old attempt
    const payments = await db.payment.findMany({ where: { orderId: first.orderId } });
    expect(payments.find((p) => p.id === p2.id)?.status).toBe("SUCCEEDED");
    expect(payments.find((p) => p.id === p1.id)?.status).toBe("REFUNDED");
    expect((await db.order.findUniqueOrThrow({ where: { id: first.orderId } })).paymentStatus).toBe("PAID");
    expect(await stockOf(variant.id)).toBe(4);
  });
});

describe("cancellations and refunds", () => {
  it("cancelling a paid order restocks exactly once", async () => {
    const admin = await createUser("ADMIN");
    const { variant } = await createProduct({ stock: 5 });
    const { orderId, payment } = await placeOrder([{ variantId: variant.id, quantity: 2 }]);
    await sendWebhook({ payment_reference: payment.id, amount: payment.amount });
    expect(await stockOf(variant.id)).toBe(3);
    await changeOrderStatus(orderId, "CANCELLED", admin.id);
    expect(await stockOf(variant.id)).toBe(5);
    await expect(changeOrderStatus(orderId, "CANCELLED", admin.id)).rejects.toThrow();
    // Refund after cancel must not restock again.
    await refundOrder(orderId, { restock: true, actorId: admin.id });
    expect(await stockOf(variant.id)).toBe(5);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).paymentStatus).toBe("REFUNDED");
  });

  it("cancelling an unpaid order does not touch stock", async () => {
    const admin = await createUser("ADMIN");
    const { variant } = await createProduct({ stock: 5 });
    const { orderId } = await placeOrder([{ variantId: variant.id, quantity: 2 }]);
    await changeOrderStatus(orderId, "CANCELLED", admin.id);
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("refund with restock returns items to stock", async () => {
    const admin = await createUser("ADMIN");
    const { variant } = await createProduct({ stock: 5 });
    const { orderId, payment } = await placeOrder([{ variantId: variant.id, quantity: 2 }]);
    await sendWebhook({ payment_reference: payment.id, amount: payment.amount });
    await refundOrder(orderId, { restock: true, actorId: admin.id });
    expect(await stockOf(variant.id)).toBe(5);
    expect(await db.inventoryMovement.count({ where: { orderId, reason: "REFUND_RESTOCK" } })).toBe(1);
  });
});

describe("order access (IDOR)", () => {
  it("only the owner or the secret token holder can view an order", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { variant } = await createProduct();
    const method = await createPickupMethod();
    const cart = await createCart([{ variantId: variant.id, quantity: 1 }], { userId: owner.id });
    const { orderId, accessToken } = await checkoutCart(cart.id, guestInput(method.id), { id: owner.id });

    expect(await getOrderForViewer(orderId, { userId: owner.id })).not.toBeNull();
    expect(await getOrderForViewer(orderId, { token: accessToken })).not.toBeNull();
    expect(await getOrderForViewer(orderId, { userId: other.id })).toBeNull();
    expect(await getOrderForViewer(orderId, { token: "guess" })).toBeNull();
    expect(await getOrderForViewer(orderId, {})).toBeNull();
  });
});
