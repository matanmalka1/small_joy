/** Order / payment status rules and Hebrew labels. Pure — safe for client import. */

export type OrderStatusKey = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "READY_FOR_PICKUP" | "SHIPPED" | "COMPLETED" | "CANCELLED";
export type PaymentStatusKey = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export const ORDER_STATUS_LABELS: Record<OrderStatusKey, string> = {
  PENDING_PAYMENT: "ממתינה לתשלום",
  PAID: "שולמה",
  PROCESSING: "בטיפול",
  READY_FOR_PICKUP: "מוכנה לאיסוף",
  SHIPPED: "נשלחה",
  COMPLETED: "הושלמה",
  CANCELLED: "בוטלה",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusKey, string> = {
  PENDING: "ממתין",
  PAID: "שולם",
  FAILED: "נכשל",
  REFUNDED: "הוחזר",
  PARTIALLY_REFUNDED: "הוחזר חלקית",
};

export const ORDER_STATUS_TONE: Record<OrderStatusKey, "info" | "success" | "warning" | "danger" | "neutral"> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PROCESSING: "info",
  READY_FOR_PICKUP: "success",
  SHIPPED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatusKey, "info" | "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
};

/**
 * Transitions an admin may perform. PENDING_PAYMENT → PAID happens only
 * through a verified payment webhook, never manually.
 */
const ADMIN_TRANSITIONS: Record<OrderStatusKey, OrderStatusKey[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "SHIPPED", "COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedAdminTransitions(from: OrderStatusKey, fulfillment: "PICKUP" | "DELIVERY"): OrderStatusKey[] {
  return ADMIN_TRANSITIONS[from].filter((to) =>
    fulfillment === "PICKUP" ? to !== "SHIPPED" : to !== "READY_FOR_PICKUP",
  );
}

export function canTransition(from: OrderStatusKey, to: OrderStatusKey, fulfillment: "PICKUP" | "DELIVERY"): boolean {
  return allowedAdminTransitions(from, fulfillment).includes(to);
}

export function formatOrderNumber(n: number): string {
  return `SK-${n}`;
}
