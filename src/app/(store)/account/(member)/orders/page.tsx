import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { listOrdersForUser } from "@/server/orders/orders";
import { formatOrderNumber } from "@/server/orders/status";
import { formatPrice } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/store/order-status-badges";

export const metadata: Metadata = { title: "ההזמנות שלי", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);
  if (!orders.length) {
    return <EmptyState title="עדיין אין הזמנות" action={<LinkButton href="/">להתחיל לקנות</LinkButton>}>ההזמנות שתבצעו כשאתם מחוברים יופיעו כאן.</EmptyState>;
  }
  return (
    <section>
      <h2 className="mb-4 text-xl">ההזמנות שלי</h2>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-teal">
              <div>
                <p className="font-bold ltr-nums">{formatOrderNumber(o.number)}</p>
                <p className="text-sm text-ink-soft">{o.createdAt.toLocaleDateString("he-IL")} · {o.items.reduce((s, i) => s + i.quantity, 0)} פריטים</p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="font-bold">{formatPrice(o.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
