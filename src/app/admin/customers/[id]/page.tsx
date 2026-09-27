import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/server/admin/queries";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber } from "@/server/orders/status";
import { PageHeader, Panel, StatCard, Table } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-status-badges";
import { formatAddress } from "@/components/store/order-details";

export const metadata = { title: "פרטי לקוח" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const c = await getCustomer(id);
  if (!c) notFound();
  return (
    <div className="space-y-5">
      <PageHeader title={c.name} description={`${c.email}${c.profile?.phone ? ` · ${c.profile.phone}` : ""}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="סך רכישות" value={formatPrice(c.totalSpent)} />
        <StatCard label="הזמנות ששולמו" value={c.paidOrders} />
        <StatCard label="לקוח מאז" value={c.createdAt.toLocaleDateString("he-IL")} />
        <StatCard label="דיוור" value={c.profile?.marketingOptIn ? "מאשר/ת" : "לא"} />
      </div>
      <Panel title="הזמנות">
        <Table>
          <thead><tr><th>מס׳</th><th>תאריך</th><th>סכום</th><th>תשלום</th><th>סטטוס</th></tr></thead>
          <tbody>
            {c.orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-teal hover:underline ltr-nums">{formatOrderNumber(o.number)}</Link></td>
                <td className="text-xs">{o.createdAt.toLocaleDateString("he-IL")}</td>
                <td>{formatPrice(o.total)}</td>
                <td><PaymentStatusBadge status={o.paymentStatus} /></td>
                <td><OrderStatusBadge status={o.status} /></td>
              </tr>
            ))}
            {c.orders.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-soft">אין הזמנות</td></tr>}
          </tbody>
        </Table>
      </Panel>
      <Panel title="כתובות שמורות">
        {c.addresses.length ? <ul className="space-y-1 text-sm">{c.addresses.map((a) => <li key={a.id}>{a.fullName} – {formatAddress(a)} · <span className="ltr-nums">{a.phone}</span></li>)}</ul> : <p className="text-sm text-ink-soft">אין כתובות שמורות.</p>}
      </Panel>
    </div>
  );
}
