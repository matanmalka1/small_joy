import Link from "next/link";
import type { Order, OrderItem, Payment } from "@/generated/prisma/client";
import { retryPaymentAction } from "@/actions/checkout";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatOrderNumber } from "@/server/orders/status";
import { OrderDetails } from "./order-details";
import { PaymentStatusPoller } from "./payment-status-poller";

type FullOrder = Order & { items: OrderItem[]; payments: Payment[] };

/**
 * Shows the order's REAL state (from the DB, updated only by verified webhooks).
 * Arriving here from the payment page never marks anything as paid.
 */
export function OrderResult({ order, pickupAddress, showRetryError }: { order: FullOrder; pickupAddress: string; showRetryError?: boolean }) {
  const lastPayment = order.payments.at(-1);
  const paid = order.paymentStatus === "PAID" && order.status !== "CANCELLED";
  const waiting = order.status === "PENDING_PAYMENT" && lastPayment?.status === "CREATED";
  const failed = order.status === "PENDING_PAYMENT" && !waiting;

  return (
    <div className="space-y-6">
      {paid && (
        <div className="rounded-3xl bg-success-soft p-6 text-center">
          <p aria-hidden="true" className="text-4xl">🎉</p>
          <h1 className="mt-2 text-3xl text-success">תודה! ההזמנה התקבלה</h1>
          <p className="mt-2">מספר הזמנה: <strong className="ltr-nums">{formatOrderNumber(order.number)}</strong></p>
          <p className="mt-1 text-sm text-ink-soft">
            {order.fulfillment === "PICKUP" ? "נעדכן אותך כשההזמנה תהיה מוכנה לאיסוף." : "נעדכן אותך כשההזמנה תישלח."}
          </p>
        </div>
      )}
      {waiting && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-8 text-center" role="status">
          <Spinner className="size-8 text-teal" />
          <h1 className="text-2xl">ממתינים לאישור התשלום...</h1>
          <p className="max-w-md text-sm text-ink-soft">אם השלמת את התשלום, האישור יתקבל בתוך מספר שניות. אין לבצע תשלום נוסף.</p>
          <PaymentStatusPoller />
        </div>
      )}
      {failed && (
        <div className="space-y-4 rounded-3xl border border-line bg-surface p-6">
          <h1 className="text-2xl">התשלום לא הושלם</h1>
          {showRetryError && <Alert tone="danger">לא ניתן להתחיל תשלום חדש כרגע. ייתכן שחלק מהמוצרים אזלו – נסו שוב או צרו קשר.</Alert>}
          <p className="text-ink-soft">
            {lastPayment?.status === "FAILED" ? "העסקה נדחתה או בוטלה. ניתן לנסות שוב באמצעי תשלום אחר." : "התשלום בוטל."} לא בוצע חיוב.
          </p>
          <form action={retryPaymentAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="token" value={order.accessToken} />
            <SubmitButton pendingText="מעביר לתשלום...">ניסיון תשלום נוסף</SubmitButton>
          </form>
        </div>
      )}
      {order.status === "CANCELLED" && (
        <Alert tone="warning" title="ההזמנה בוטלה">
          {order.paymentStatus === "REFUNDED" ? "החיוב בוטל והכסף יוחזר לאמצעי התשלום." : "לפרטים נוספים ניתן ליצור קשר עם החנות."}
        </Alert>
      )}
      <OrderDetails order={order} pickupAddress={pickupAddress} />
      <p className="text-sm text-ink-soft">
        כדאי לשמור את הקישור לעמוד זה כדי לעקוב אחר ההזמנה.{" "}
        <Link href="/" className="text-teal underline">חזרה לחנות</Link>
      </p>
    </div>
  );
}
