import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mailer";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber } from "./status";

/** Best-effort confirmation email after a verified payment. Never throws. */
export async function sendOrderConfirmation(orderId: string) {
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentStatus !== "PAID") return;
    const settings = await db.storeSettings.findUnique({ where: { id: "store" } });
    const link = `${env().NEXT_PUBLIC_SITE_URL}/order/${order.id}?token=${order.accessToken}`;
    const lines = order.items.map((i) => `- ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.quantity} – ${formatPrice(i.lineTotal)}`);
    await sendMail({
      to: order.email,
      subject: `אישור הזמנה ${formatOrderNumber(order.number)} – ${settings?.storeName ?? "שמחות קטנות"}`,
      text: [
        `שלום ${order.customerName},`,
        "",
        `תודה על ההזמנה! התשלום התקבל והזמנה ${formatOrderNumber(order.number)} בטיפול.`,
        "",
        ...lines,
        "",
        `סה״כ: ${formatPrice(order.total)}`,
        order.fulfillment === "PICKUP" ? `איסוף עצמי מ: ${settings?.addressLine ?? ""}. נעדכן כשההזמנה מוכנה.` : `משלוח: ${order.shippingName}`,
        "",
        `לצפייה בהזמנה: ${link}`,
      ].join("\n"),
    });
  } catch (e) {
    logger.error("order.confirmation_email_failed", { orderId, error: e });
  }
}
