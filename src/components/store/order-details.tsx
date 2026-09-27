import Link from "next/link";
import type { Order, OrderItem } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber } from "@/server/orders/status";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-status-badges";
import { ProductImage } from "./product-image";

type Addr = { city: string; street: string; houseNumber: string; apartment?: string | null; floor?: string | null; zip?: string | null; notes?: string | null };

export function formatAddress(a: Addr | null | undefined): string {
  if (!a) return "";
  return [
    `${a.street} ${a.houseNumber}`,
    a.apartment && `דירה ${a.apartment}`,
    a.floor && `קומה ${a.floor}`,
    a.city,
    a.zip,
  ]
    .filter(Boolean)
    .join(", ");
}

export function OrderDetails({ order, pickupAddress }: { order: Order & { items: OrderItem[] }; pickupAddress: string }) {
  const addr = order.shippingAddress as Addr | null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl">הזמנה <span className="ltr-nums">{formatOrderNumber(order.number)}</span></h2>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>
      <p className="text-sm text-ink-soft">בוצעה ב־{order.createdAt.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })}</p>

      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-3 p-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sand">
              <ProductImage src={i.imageUrl} alt="" sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{i.productName}</p>
              {i.variantLabel && <p className="text-sm text-ink-soft">{i.variantLabel}</p>}
              <p className="text-sm text-ink-soft">{i.quantity} × {formatPrice(i.unitPrice)}</p>
            </div>
            <p className="font-bold">{formatPrice(i.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <h3 className="mb-2 text-base">אספקה</h3>
          <p className="font-semibold">{order.shippingName}</p>
          {order.fulfillment === "PICKUP" ? <p className="text-ink-soft">איסוף מ: {pickupAddress}</p> : <p className="text-ink-soft">{formatAddress(addr)}</p>}
          <p className="mt-2 text-ink-soft">{order.customerName} · <span className="ltr-nums">{order.phone}</span></p>
        </div>
        <dl className="space-y-1.5 rounded-2xl border border-line bg-surface p-4 text-sm">
          <div className="flex justify-between"><dt>סכום ביניים</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-success"><dt>הנחת קופון {order.couponCode && `(${order.couponCode})`}</dt><dd>-{formatPrice(order.discountTotal)}</dd></div>
          )}
          <div className="flex justify-between"><dt>משלוח</dt><dd>{order.shippingTotal === 0 ? "חינם" : formatPrice(order.shippingTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>סה״כ</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </div>
      <p className="text-sm text-ink-soft">שאלה לגבי ההזמנה? <Link href="/contact" className="text-teal underline">צרו קשר</Link> וציינו את מספר ההזמנה.</p>
    </div>
  );
}
