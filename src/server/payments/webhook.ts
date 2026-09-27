import "server-only";
import { db, type Tx } from "@/lib/db";
import { logger } from "@/lib/logger";
import { decrementStock, InsufficientStockError, releaseOrderStock } from "@/server/inventory/inventory";
import { sendOrderConfirmation } from "@/server/orders/notifications";
import { getPaymentProvider } from "./providers";
import { WebhookVerificationError, type VerifiedWebhookEvent } from "./providers/types";

export type WebhookOutcome = { status: number; result: "processed" | "duplicate" | "ignored" | "rejected"; detail?: string };

class DuplicateEvent extends Error {}
class StockShortage extends Error {}

/** Records the event; throws DuplicateEvent if it was already processed (unique constraint). */
async function claimEvent(tx: Tx, provider: string, event: VerifiedWebhookEvent, paymentId: string | null) {
  const inserted = await tx.$executeRaw`
    INSERT INTO "PaymentEvent" (id, provider, "eventId", type, "paymentId", "processedAt")
    VALUES (gen_random_uuid()::text, ${provider}, ${event.eventId}, ${event.type}, ${paymentId}, now())
    ON CONFLICT (provider, "eventId") DO NOTHING`;
  if (inserted === 0) throw new DuplicateEvent();
}

/** Entry point used by the webhook route. Verifies, then processes idempotently. */
export async function handlePaymentWebhook(providerId: string, rawBody: string, headers: Headers): Promise<WebhookOutcome> {
  let provider;
  try {
    provider = getPaymentProvider(providerId);
  } catch (e) {
    logger.warn("webhook.unknown_provider", { providerId, error: e });
    return { status: 404, result: "rejected" };
  }
  let event: VerifiedWebhookEvent;
  try {
    event = await provider.verifyWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      logger.warn("webhook.verification_failed", { providerId, reason: e.message });
      return { status: 401, result: "rejected", detail: "invalid signature" };
    }
    throw e;
  }
  return processPaymentEvent(provider.id, event);
}

export async function processPaymentEvent(providerId: string, event: VerifiedWebhookEvent): Promise<WebhookOutcome> {
  const payment = await db.payment.findUnique({ where: { id: event.paymentId }, include: { order: true } });
  if (!payment || payment.provider !== providerId) {
    logger.warn("webhook.unknown_payment", { providerId, paymentId: event.paymentId, eventId: event.eventId });
    return { status: 404, result: "rejected", detail: "unknown payment" };
  }
  if (event.currency !== "ILS" || event.amount !== payment.amount) {
    // Never mark an order as paid when the amount does not match what we asked for.
    logger.error("webhook.amount_mismatch", { paymentId: payment.id, expected: payment.amount, got: event.amount, currency: event.currency });
    return { status: 400, result: "rejected", detail: "amount mismatch" };
  }

  try {
    switch (event.type) {
      case "payment.succeeded":
        return await onSucceeded(providerId, event, payment.id);
      case "payment.failed":
        return await onFailed(providerId, event, payment.id);
      case "refund.succeeded":
        return await onRefunded(providerId, event, payment.id);
      default:
        return { status: 200, result: "ignored" };
    }
  } catch (e) {
    if (e instanceof DuplicateEvent) return { status: 200, result: "duplicate" };
    throw e;
  }
}

async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
}

async function onSucceeded(providerId: string, event: VerifiedWebhookEvent, paymentId: string): Promise<WebhookOutcome> {
  let needsRefund: { reason: string } | null = null;
  let confirmOrderId: string | null = null;

  try {
    await db.$transaction(async (tx) => {
      await claimEvent(tx, providerId, event, paymentId);
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const order = await lockOrder(tx, payment.orderId);

      if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") return; // already handled via another event id

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "SUCCEEDED", providerTransactionId: event.providerTransactionId },
      });

      // Paid twice (another attempt already succeeded) or paid after the order was cancelled.
      if (order.paymentStatus === "PAID" || order.status === "CANCELLED") {
        needsRefund = { reason: order.paymentStatus === "PAID" ? "duplicate_payment" : "order_cancelled" };
        await tx.order.update({
          where: { id: order.id },
          data: {
            needsAttention: true,
            adminNotes: [order.adminNotes, "התקבל תשלום נוסף/מאוחר להזמנה זו – הופעל החזר כספי אוטומטי."].filter(Boolean).join("\n"),
          },
        });
        return;
      }

      if (!order.stockCommittedAt) {
        for (const item of order.items) {
          if (!item.variantId) throw new StockShortage();
          try {
            await decrementStock(tx, item.variantId, item.quantity, { orderId: order.id, reason: "SALE" });
          } catch (e) {
            if (e instanceof InsufficientStockError) throw new StockShortage();
            throw e;
          }
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paymentStatus: "PAID", paidAt: new Date(), stockCommittedAt: order.stockCommittedAt ?? new Date() },
      });

      if (order.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode } });
        if (coupon) {
          await tx.couponRedemption.upsert({
            where: { orderId: order.id },
            create: { couponId: coupon.id, orderId: order.id, email: order.email, userId: order.userId, amount: order.discountTotal },
            update: {},
          });
        }
      }
      if (order.cartId) await tx.cart.deleteMany({ where: { id: order.cartId } });
      confirmOrderId = order.id;
    });
  } catch (e) {
    if (!(e instanceof StockShortage)) throw e;
    // The whole transaction rolled back (no partial stock changes). Record the
    // payment, cancel the order and refund: we must not keep money for goods we can't supply.
    await db.$transaction(async (tx) => {
      await claimEvent(tx, providerId, event, paymentId);
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      await lockOrder(tx, payment.orderId);
      await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCEEDED", providerTransactionId: event.providerTransactionId } });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "CANCELLED",
          paymentStatus: "PAID",
          paidAt: new Date(),
          cancelledAt: new Date(),
          needsAttention: true,
          adminNotes: "התשלום התקבל אך המלאי אזל בזמן התשלום. ההזמנה בוטלה והחזר כספי הופעל אוטומטית.",
        },
      });
    });
    needsRefund = { reason: "out_of_stock" };
  }

  if (needsRefund) await autoRefund(paymentId, (needsRefund as { reason: string }).reason);
  if (confirmOrderId) await sendOrderConfirmation(confirmOrderId);
  return { status: 200, result: "processed" };
}

async function onFailed(providerId: string, event: VerifiedWebhookEvent, paymentId: string): Promise<WebhookOutcome> {
  await db.$transaction(async (tx) => {
    await claimEvent(tx, providerId, event, paymentId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const order = await lockOrder(tx, payment.orderId);
    if (payment.status !== "CREATED" && payment.status !== "CANCELLED") return;
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", failureReason: event.failureReason?.slice(0, 200) ?? "declined" } });
    // The order stays open so the customer can retry payment.
    if (order.paymentStatus === "PENDING") await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  });
  return { status: 200, result: "processed" };
}

async function onRefunded(providerId: string, event: VerifiedWebhookEvent, paymentId: string): Promise<WebhookOutcome> {
  await db.$transaction(async (tx) => {
    await claimEvent(tx, providerId, event, paymentId);
    await markRefunded(tx, paymentId);
  });
  return { status: 200, result: "processed" };
}

async function markRefunded(tx: Tx, paymentId: string) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status === "REFUNDED") return;
  await lockOrder(tx, payment.orderId);
  await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", refundedAmount: payment.amount } });
  const stillPaid = await tx.payment.count({ where: { orderId: payment.orderId, status: "SUCCEEDED", id: { not: paymentId } } });
  if (stillPaid === 0) {
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "REFUNDED" } });
  }
}

/** Refunds a whole payment through the provider and records it. Used for automatic and admin refunds. */
export async function refundPayment(paymentId: string, opts: { restock: boolean; actorId?: string; reason: string }) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "SUCCEEDED" || !payment.providerTransactionId) return { ok: false as const, error: "אין תשלום מוצלח להחזר" };
  const provider = getPaymentProvider(payment.provider);
  const res = await provider.refund({
    providerTransactionId: payment.providerTransactionId,
    amount: payment.amount - payment.refundedAmount,
    idempotencyKey: `refund:${payment.id}`,
  });
  if (!res.ok) {
    logger.error("payment.refund_failed", { paymentId, error: res.error });
    await db.order.update({ where: { id: payment.orderId }, data: { needsAttention: true } });
    return { ok: false as const, error: res.error };
  }
  await db.$transaction(async (tx) => {
    await markRefunded(tx, paymentId);
    if (opts.restock) await releaseOrderStock(tx, payment.orderId, "REFUND_RESTOCK", opts.actorId);
  });
  logger.info("payment.refunded", { paymentId, reason: opts.reason });
  return { ok: true as const };
}

async function autoRefund(paymentId: string, reason: string) {
  try {
    const res = await refundPayment(paymentId, { restock: false, reason });
    if (!res.ok) logger.error("payment.auto_refund_failed", { paymentId, reason });
  } catch (e) {
    logger.error("payment.auto_refund_error", { paymentId, reason, error: e });
    const p = await db.payment.findUnique({ where: { id: paymentId } });
    if (p) await db.order.update({ where: { id: p.orderId }, data: { needsAttention: true } });
  }
}
