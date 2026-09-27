import Link from "next/link";
import { getDashboardData } from "@/server/admin/queries";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber, ORDER_STATUS_LABELS } from "@/server/orders/status";
import { variantLabel } from "@/server/catalog/options";
import { PageHeader, Panel, StatCard, Table } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Alert } from "@/components/ui/alert";
import { OrderStatusBadge } from "@/components/store/order-status-badges";

export const metadata = { title: "לוח בקרה" };

export default async function AdminDashboard() {
  const d = await getDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader title="לוח בקרה" description="נתוני אמת מתוך מסד הנתונים. הכנסות נספרות מהזמנות ששולמו (לפי מועד התשלום, שעון ישראל)." />
      {d.attention > 0 && (
        <Alert tone="danger" title={`${d.attention} הזמנות דורשות טיפול`}>
          <Link href="/admin/orders?attention=1" className="underline">לצפייה בהזמנות</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="מכירות היום" value={formatPrice(d.today.revenue)} hint={`${d.today.orders} הזמנות`} />
        <StatCard label="7 ימים אחרונים" value={formatPrice(d.week.revenue)} hint={`${d.week.orders} הזמנות`} />
        <StatCard label="30 ימים אחרונים" value={formatPrice(d.month.revenue)} hint={`${d.month.orders} הזמנות`} />
        <StatCard label="הזמנות חדשות לטיפול" value={d.newOrders} hint="בסטטוס ״שולמה״" href="/admin/orders?status=PAID" />
      </div>
      <Panel title="הכנסות יומיות – 30 ימים">
        <RevenueChart data={d.series} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="מוצרים פופולריים (30 יום)">
          {d.topProducts.length ? (
            <ol className="space-y-2 text-sm">
              {d.topProducts.map((p, i) => (
                <li key={`${p.productId}-${i}`} className="flex justify-between gap-3">
                  <span>{i + 1}. {p.productId ? <Link href={`/admin/products/${p.productId}`} className="hover:text-teal hover:underline">{p.name}</Link> : p.name}</span>
                  <span className="text-ink-soft">{p.qty} יח׳ · {formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-soft">אין עדיין מכירות בתקופה זו.</p>
          )}
        </Panel>
        <Panel title="מלאי נמוך" actions={<Link href="/admin/inventory" className="text-sm text-teal hover:underline">לניהול מלאי</Link>}>
          {d.lowStock.length ? (
            <ul className="space-y-2 text-sm">
              {d.lowStock.map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${v.productId}`} className="hover:text-teal hover:underline">
                    {v.productName} <span className="text-ink-soft">{variantLabel(v.options)}</span>
                  </Link>
                  <span className={v.stockQuantity === 0 ? "font-bold text-danger" : "font-bold text-warning"}>{v.stockQuantity === 0 ? "אזל" : `${v.stockQuantity} יח׳`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">אין מוצרים במלאי נמוך.</p>
          )}
        </Panel>
      </div>
      <Panel title="הזמנות אחרונות" actions={<Link href="/admin/orders" className="text-sm text-teal hover:underline">לכל ההזמנות</Link>}>
        {d.recentOrders.length ? (
          <Table>
            <thead><tr><th>מס׳</th><th>לקוח</th><th>סכום</th><th>סטטוס</th><th>תאריך</th></tr></thead>
            <tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-teal hover:underline ltr-nums">{formatOrderNumber(o.number)}</Link></td>
                  <td>{o.customerName}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td><OrderStatusBadge status={o.status} /><span className="sr-only">{ORDER_STATUS_LABELS[o.status]}</span></td>
                  <td>{o.createdAt.toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-ink-soft">אין עדיין הזמנות.</p>
        )}
      </Panel>
      {d.pendingPayment > 0 && <p className="text-xs text-ink-soft">{d.pendingPayment} הזמנות ממתינות לתשלום מהיממה האחרונה (לא נספרות כהכנסה).</p>}
    </div>
  );
}
