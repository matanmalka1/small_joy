import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { buildCartView, type CartView } from "@/server/cart/cart";
import { couponErrorMessages } from "@/server/pricing/engine";
import { getShippingOption, methodServesCity, type ShippingOption } from "@/server/shipping/methods";
import { getPaymentProvider, PaymentsNotConfiguredError } from "@/server/payments/providers";
import type { CheckoutInput } from "@/lib/validation/checkout";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

/** A pending order for the same cart with the same contents is reused (double submit / back button). */
const REUSE_WINDOW_MS = 30 * 60 * 1000;

function fingerprint(parts: { lines: { variantId: string; quantity: number; unitPrice: number }[]; total: number; shipping: string; email: string }) {
  const lines = [...parts.lines].sort((a, b) => a.variantId.localeCompare(b.variantId)).map((l) => `${l.variantId}:${l.quantity}:${l.unitPrice}`);
  return `${lines.join("|")}#${parts.total}#${parts.shipping}#${parts.email}`;
}

async function resolveShipping(input: CheckoutInput): Promise<ShippingOption> {
  const method = await getShippingOption(input.shippingMethodId);
  if (!method) throw new CheckoutError("שיטת המשלוח שנבחרה אינה זמינה", "shippingMethodId");
  if (method.type !== input.fulfillment) throw new CheckoutError("שיטת המשלוח אינה תואמת לאופן האספקה", "shippingMethodId");
  if (method.type === "DELIVERY") {
    if (!input.address) throw new CheckoutError("יש למלא כתובת למשלוח", "city");
    if (!methodServesCity(method.zones, input.address.city)) throw new CheckoutError("אין משלוח לעיר שנבחרה בשיטה זו", "city");
  }
  return method;
}

export type CheckoutResult = { orderId: string; accessToken: string; redirectUrl: string };

/**
 * Creates (or reuses) an order from the cart and starts a payment attempt.
 * Every price is recomputed here from the database — client values are never trusted.
 */
export async function checkoutCart(cartId: string, input: CheckoutInput, user: { id: string } | null): Promise<CheckoutResult> {
  // Fail fast (before creating an order) when no payment provider is available.
  try {
    getPaymentProvider();
  } catch (e) {
    if (e instanceof PaymentsNotConfiguredError) throw new CheckoutError("התשלום המקוון אינו זמין כרגע. ניתן ליצור קשר עם החנות להשלמת ההזמנה");
    throw e;
  }
  const shipping = await resolveShipping(input);
  const view: CartView = await buildCartView(cartId, {
    email: input.email,
    userId: user?.id,
    shipping: { price: shipping.price, freeShippingThreshold: shipping.freeShippingThreshold },
  });

  if (view.lines.length === 0) throw new CheckoutError("הסל ריק");
  if (view.hasProblems) throw new CheckoutError("חלק מהמוצרים בסל אינם זמינים בכמות המבוקשת. יש לעדכן את הסל");
  if (view.couponCode && view.pricing.couponError) {
    throw new CheckoutError(`${couponErrorMessages[view.pricing.couponError]}. יש להסיר את הקופון כדי להמשיך`);
  }
  if (view.couponCode && !view.pricing.coupon) throw new CheckoutError("הקופון אינו תקף. יש להסירו כדי להמשיך");
  const { pricing } = view;
  if (pricing.shippingTotal == null) throw new CheckoutError("לא ניתן לחשב עלות משלוח", "shippingMethodId");
  if (pricing.total <= 0) throw new CheckoutError("סכום ההזמנה אינו תקין");

  const fp = fingerprint({ lines: pricing.lines, total: pricing.total, shipping: shipping.id, email: input.email });

  const order = await db.$transaction(async (tx) => {
    // Serialize concurrent checkouts of the same cart.
    await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`;

    const pending = await tx.order.findMany({
      where: { cartId, status: "PENDING_PAYMENT", paymentStatus: { not: "PAID" }, createdAt: { gte: new Date(Date.now() - REUSE_WINDOW_MS) } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    for (const p of pending) {
      const pfp = fingerprint({
        lines: p.items.map((i) => ({ variantId: i.variantId ?? "", quantity: i.quantity, unitPrice: i.unitPrice })),
        total: p.total,
        shipping: p.shippingMethodId ?? "",
        email: p.email,
      });
      if (pfp === fp && p.userId === (user?.id ?? null)) return p;
    }
    // Cart changed: older unpaid attempts for this cart are superseded.
    if (pending.length) {
      await tx.order.updateMany({
        where: { id: { in: pending.map((p) => p.id) }, paymentStatus: { not: "PAID" } },
        data: { status: "CANCELLED", cancelledAt: new Date(), adminNotes: "בוטלה אוטומטית – הוחלפה בהזמנה חדשה מאותו סל" },
      });
    }

    const address = input.fulfillment === "DELIVERY" && input.address ? input.address : null;
    return tx.order.create({
      data: {
        userId: user?.id ?? null,
        accessToken: randomBytes(24).toString("base64url"),
        cartId,
        email: input.email,
        customerName: input.fullName,
        phone: input.phone,
        fulfillment: input.fulfillment,
        shippingAddress: address ?? undefined,
        shippingMethodId: shipping.id,
        shippingName: shipping.name,
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        shippingTotal: pricing.shippingTotal!,
        total: pricing.total,
        couponCode: pricing.coupon?.code ?? null,
        customerNotes: input.notes || null,
        items: {
          create: view.lines.map((l) => ({
            variantId: l.variantId,
            productId: l.productId,
            productName: l.productName,
            variantLabel: l.variantLabel,
            sku: l.sku,
            unitPrice: l.unitPrice,
            listPrice: l.listPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            imageUrl: l.imageUrl,
          })),
        },
      },
    });
  });

  if (user && input.saveAddress && input.address) {
    await saveAddressIfNew(user.id, input);
  }

  const { redirectUrl } = await startPayment(order.id);
  return { orderId: order.id, accessToken: order.accessToken, redirectUrl };
}

async function saveAddressIfNew(userId: string, input: CheckoutInput) {
  const a = input.address!;
  const exists = await db.address.findFirst({ where: { userId, city: a.city, street: a.street, houseNumber: a.houseNumber, apartment: a.apartment ?? null } });
  if (exists) return;
  const count = await db.address.count({ where: { userId } });
  await db.address.create({
    data: { userId, fullName: input.fullName, phone: input.phone, ...a, apartment: a.apartment ?? null, floor: a.floor ?? null, zip: a.zip ?? null, notes: a.notes ?? null, isDefault: count === 0 },
  });
}

/**
 * Creates a new payment attempt for an unpaid order and returns the hosted
 * payment page URL. Re-checks stock so we never send a customer to pay for
 * items that are already gone.
 */
export async function startPayment(orderId: string): Promise<{ redirectUrl: string }> {
  const provider = getPaymentProvider();
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true } });
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") throw new CheckoutError("ההזמנה אינה ממתינה לתשלום");

  const variants = await db.productVariant.findMany({
    where: { id: { in: order.items.flatMap((i) => (i.variantId ? [i.variantId] : [])) } },
    select: { id: true, stockQuantity: true },
  });
  for (const item of order.items) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v || v.stockQuantity < item.quantity) throw new CheckoutError(`המוצר "${item.productName}" אינו זמין עוד בכמות המבוקשת`);
  }

  // Previous unfinished attempts are superseded; if one of them still succeeds,
  // the webhook handler refunds it automatically (see processPaymentEvent).
  await db.payment.updateMany({ where: { orderId, status: "CREATED" }, data: { status: "CANCELLED" } });

  const attempt = order.payments.length + 1;
  const payment = await db.payment.create({
    data: {
      orderId,
      provider: provider.id,
      idempotencyKey: `${orderId}:${attempt}`,
      amount: order.total,
    },
  });

  const site = env().NEXT_PUBLIC_SITE_URL;
  const returnUrl = `${site}/checkout/return?order=${order.id}&token=${order.accessToken}`;
  try {
    const session = await provider.createCheckout({
      paymentId: payment.id,
      idempotencyKey: payment.idempotencyKey,
      orderNumber: order.number,
      amount: order.total,
      currency: "ILS",
      description: `הזמנה SK-${order.number} – שמחות קטנות`,
      customer: { name: order.customerName, email: order.email, phone: order.phone },
      returnUrl,
      cancelUrl: returnUrl,
      webhookUrl: `${site}/api/webhooks/payments/${provider.id}`,
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerSessionId: session.providerSessionId } });
    return { redirectUrl: session.redirectUrl };
  } catch (e) {
    logger.error("payment.create_checkout_failed", { orderId, paymentId: payment.id, error: e });
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "create_checkout_failed" } });
    throw new CheckoutError("לא ניתן להתחבר לספק התשלום כרגע. נסו שוב בעוד מספר דקות");
  }
}
