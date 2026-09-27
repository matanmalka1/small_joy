import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/server/admin/queries";
import { getStoreSettings } from "@/server/settings/store-settings";
import { allowedAdminTransitions, formatOrderNumber, ORDER_STATUS_LABELS } from "@/server/orders/status";
import { changeOrderStatusAction, refundOrderAction, saveOrderNotesAction } from "@/actions/admin/operations";
import { formatPrice } from "@/lib/money";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { AdminForm, ACheckbox, ASelect, ATextarea } from "@/components/admin/form";
import { Alert } from "@/components/ui/alert";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-status-badges";
import { formatAddress } from "@/components/store/order-details";

export const metadata = { title: "פרטי הזמנה" };

const PAYMENT_ATTEMPT: Record<string, string> = { CREATED: "נוצר", SUCCEEDED: "הצליח", FAILED: "נכשל", REFUNDED: "הוחזר", CANCELLED: "הוחלף" };

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const [order, settings] = await Promise.all([getAdminOrder(id), getStoreSettings()]);
  if (!order) notFound();
  const transitions = allowedAdminTransitions(order.status, order.fulfillment);
  const addr = order.shippingAddress as Parameters<typeof formatAddress>[0];
  const canRefund = order.payments.some((p) => p.status === "SUCCEEDED");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`הזמנה ${formatOrderNumber(order.number)}`}
        description={order.createdAt.toLocaleString("he-IL", { dateStyle: "full", timeStyle: "short" })}
        actions={<><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /></>}
      />
      {order.needsAttention && <Alert tone="danger" title="דורש טיפול">{order.adminNotes ?? "יש לבדוק את ההזמנה"}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <Panel title="מוצרים">
            <Table>
              <thead><tr><th>מוצר</th><th>מק״ט</th><th>מחיר יח׳</th><th>כמות</th><th>סה״כ</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.productId ? <Link href={`/admin/products/${i.productId}`} className="font-semibold hover:text-teal">{i.productName}</Link> : i.productName}
                      {i.variantLabel && <div className="text-xs text-ink-soft">{i.variantLabel}</div>}
                    </td>
                    <td className="text-xs ltr-nums">{i.sku}</td>
                    <td>{formatPrice(i.unitPrice)}{i.listPrice > i.unitPrice && <s className="ms-1 text-xs text-ink-soft">{formatPrice(i.listPrice)}</s>}</td>
                    <td>{i.quantity}</td>
                    <td className="font-semibold">{formatPrice(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="mt-4 ms-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>סכום ביניים</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between"><dt>קופון {order.couponCode}</dt><dd>-{formatPrice(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>משלוח</dt><dd>{formatPrice(order.shippingTotal)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>סה״כ</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="תשלומים">
            {order.payments.length === 0 ? <p className="text-sm text-ink-soft">אין ניסיונות תשלום.</p> : (
              <Table>
                <thead><tr><th>ספק</th><th>סכום</th><th>סטטוס</th><th>מזהה עסקה</th><th>תאריך</th></tr></thead>
                <tbody>
                  {order.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.provider === "mock" ? "Sandbox" : p.provider}</td>
                      <td>{formatPrice(p.amount)}</td>
                      <td>{PAYMENT_ATTEMPT[p.status]}{p.failureReason && <span className="text-xs text-ink-soft"> ({p.failureReason})</span>}</td>
                      <td className="text-xs ltr-nums">{p.providerTransactionId ?? "—"}</td>
                      <td className="text-xs">{p.createdAt.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel title="לקוח ואספקה">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{order.customerName}</p>
              <p><a href={`mailto:${order.email}`} className="text-teal hover:underline">{order.email}</a></p>
              <p><a href={`tel:${order.phone}`} className="text-teal hover:underline ltr-nums">{order.phone}</a></p>
              {order.user && <p><Link href={`/admin/customers/${order.user.id}`} className="text-teal underline">לקוח רשום</Link></p>}
              <hr className="my-2 border-line" />
              <p className="font-semibold">{order.shippingName}</p>
              <p className="text-ink-soft">{order.fulfillment === "PICKUP" ? `איסוף מ: ${settings.addressLine}` : formatAddress(addr)}</p>
              {addr?.notes && <p className="text-ink-soft">הערות לשליח: {addr.notes}</p>}
              {order.customerNotes && <p className="rounded-lg bg-sun-soft p-2">הערת לקוח: {order.customerNotes}</p>}
            </div>
          </Panel>

          <Panel title="עדכון סטטוס הזמנה">
            {transitions.length ? (
              <AdminForm action={changeOrderStatusAction} submitLabel="עדכון סטטוס">
                <input type="hidden" name="orderId" value={order.id} />
                <ASelect label="סטטוס חדש" name="status" defaultValue={transitions[0]}>
                  {transitions.map((t) => <option key={t} value={t}>{ORDER_STATUS_LABELS[t]}</option>)}
                </ASelect>
                <p className="text-xs text-ink-soft">ביטול הזמנה ששולמה מחזיר את המלאי אוטומטית. החזר כספי מתבצע בנפרד למטה.</p>
              </AdminForm>
            ) : (
              <p className="text-sm text-ink-soft">
                {order.status === "PENDING_PAYMENT" ? "ההזמנה תעודכן אוטומטית עם אישור התשלום מספק הסליקה." : "אין מעברי סטטוס נוספים."}
              </p>
            )}
          </Panel>

          {canRefund && (
            <Panel title="החזר כספי">
              <AdminForm action={refundOrderAction} submitLabel="ביצוע החזר מלא">
                <input type="hidden" name="orderId" value={order.id} />
                <ACheckbox name="restock" label="החזרת המוצרים למלאי" defaultChecked={order.status !== "CANCELLED"} />
                <p className="text-xs text-ink-soft">החזר מלא דרך ספק הסליקה. החזר חלקי יש לבצע ישירות במערכת הספק.</p>
              </AdminForm>
            </Panel>
          )}

          <Panel title="הערות פנימיות">
            <AdminForm action={saveOrderNotesAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <ATextarea label="הערות (לא מוצגות ללקוח)" name="adminNotes" rows={3} defaultValue={order.adminNotes ?? ""} />
              <ACheckbox name="needsAttention" label="מסומן כדורש טיפול" defaultChecked={order.needsAttention} />
            </AdminForm>
          </Panel>
        </div>
      </div>
    </div>
  );
}
