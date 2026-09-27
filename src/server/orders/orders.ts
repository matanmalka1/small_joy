import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { releaseOrderStock } from "@/server/inventory/inventory";
import { refundPayment } from "@/server/payments/webhook";
import { canTransition, type OrderStatusKey } from "./status";

const orderInclude = { items: true, payments: { orderBy: { createdAt: "asc" as const } } };

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Returns an order only to someone allowed to see it: its owner (logged in)
 * or a holder of its secret access token (guest checkout). Prevents IDOR.
 */
export async function getOrderForViewer(orderId: string, viewer: { userId?: string | null; token?: string | null }) {
  if (!orderId || orderId.length > 40) return null;
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) return null;
  if (viewer.userId && order.userId === viewer.userId) return order;
  if (viewer.token && safeEqual(viewer.token, order.accessToken)) return order;
  return null;
}

export async function listOrdersForUser(userId: string) {
  return db.order.findMany({
    where: { userId, NOT: { status: "CANCELLED", paymentStatus: { in: ["PENDING", "FAILED"] } } },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true, quantity: true } } },
  });
}

export class OrderActionError extends Error {}

/** Admin status change with transition rules. Cancelling returns committed stock exactly once. */
export async function changeOrderStatus(orderId: string, to: OrderStatusKey, actorId: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (!canTransition(order.status, to, order.fulfillment)) throw new OrderActionError("מעבר סטטוס לא חוקי");
    await tx.order.update({
      where: { id: orderId },
      data: { status: to, ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}) },
    });
    if (to === "CANCELLED") await releaseOrderStock(tx, orderId, "CANCEL_RESTOCK", actorId);
  });
}

/** Full refund of the order's successful payment(s) via the provider; optionally restocks. */
export async function refundOrder(orderId: string, opts: { restock: boolean; actorId: string }) {
  const payments = await db.payment.findMany({ where: { orderId, status: "SUCCEEDED" } });
  if (!payments.length) throw new OrderActionError("לא נמצא תשלום מוצלח להחזר");
  for (const p of payments) {
    const res = await refundPayment(p.id, { restock: false, actorId: opts.actorId, reason: "admin_refund" });
    if (!res.ok) throw new OrderActionError(`ההחזר נכשל: ${res.error}`);
  }
  if (opts.restock) {
    await db.$transaction((tx) => releaseOrderStock(tx, orderId, "REFUND_RESTOCK", opts.actorId));
  }
}
