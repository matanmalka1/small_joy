import Link from "next/link";
import { listAdminOrders } from "@/server/admin/queries";
import { firstValues } from "@/lib/validation/listing";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/server/orders/status";
import { FilterBar, PageHeader, Table, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-status-badges";

export const metadata = { title: "הזמנות" };

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const sp = firstValues(await props.searchParams);
  const { rows, total, page, totalPages } = await listAdminOrders({ ...sp, page: Number(sp.page) || 1 });
  return (
    <div>
      <PageHeader title="הזמנות" description={`${total} הזמנות`} />
      <FilterBar action="/admin/orders">
        <label className="sr-only" htmlFor="oq">חיפוש</label>
        <input id="oq" name="q" defaultValue={sp.q} placeholder="מס׳ הזמנה, שם, טלפון, דוא״ל" className={filterInput} />
        <label className="sr-only" htmlFor="os">סטטוס הזמנה</label>
        <select id="os" name="status" defaultValue={sp.status ?? ""} className={filterInput}>
          <option value="">כל סטטוסי ההזמנה</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="sr-only" htmlFor="op">סטטוס תשלום</label>
        <select id="op" name="payment" defaultValue={sp.payment ?? ""} className={filterInput}>
          <option value="">כל סטטוסי התשלום</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="sr-only" htmlFor="of">אספקה</label>
        <select id="of" name="fulfillment" defaultValue={sp.fulfillment ?? ""} className={filterInput}>
          <option value="">איסוף + משלוח</option>
          <option value="PICKUP">איסוף עצמי</option>
          <option value="DELIVERY">משלוח</option>
        </select>
        <label className="flex flex-col text-xs">מתאריך<input type="date" name="from" defaultValue={sp.from} className={filterInput} /></label>
        <label className="flex flex-col text-xs">עד תאריך<input type="date" name="to" defaultValue={sp.to} className={filterInput} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="attention" value="1" defaultChecked={sp.attention === "1"} className="accent-teal" />דורש טיפול</label>
      </FilterBar>
      <Table>
        <thead><tr><th>מס׳</th><th>תאריך</th><th>לקוח</th><th>מוצרים</th><th>סכום</th><th>אספקה</th><th>תשלום</th><th>סטטוס</th></tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/admin/orders/${o.id}`} className="font-semibold text-teal hover:underline ltr-nums">{formatOrderNumber(o.number)}</Link>
                {o.needsAttention && <Badge tone="danger" className="ms-1">!</Badge>}
              </td>
              <td className="whitespace-nowrap text-xs">{o.createdAt.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</td>
              <td>{o.customerName}<div className="text-xs text-ink-soft ltr-nums">{o.phone}</div></td>
              <td className="max-w-56 truncate text-xs text-ink-soft" title={o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}>
                {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
              </td>
              <td className="font-semibold">{formatPrice(o.total)}</td>
              <td className="text-xs">{o.fulfillment === "PICKUP" ? "איסוף" : "משלוח"}</td>
              <td><PaymentStatusBadge status={o.paymentStatus} /></td>
              <td><OrderStatusBadge status={o.status} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-ink-soft">לא נמצאו הזמנות</td></tr>}
        </tbody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/orders" params={sp} />
    </div>
  );
}
