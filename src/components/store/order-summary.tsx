import type { CartPricing } from "@/server/pricing/engine";
import { formatPrice } from "@/lib/money";

export function OrderSummary({ pricing, shippingLabel, showTotal = true }: { pricing: CartPricing; shippingLabel?: string; showTotal?: boolean }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>סכום ביניים</dt><dd>{formatPrice(pricing.subtotal)}</dd></div>
      {pricing.saleSavings > 0 && (
        <div className="flex justify-between text-success"><dt>חסכת במבצעים</dt><dd>{formatPrice(pricing.saleSavings)}</dd></div>
      )}
      {pricing.coupon && (
        <div className="flex justify-between text-success"><dt>הנחת קופון ({pricing.coupon.code})</dt><dd>-{formatPrice(pricing.discountTotal)}</dd></div>
      )}
      <div className="flex justify-between">
        <dt>משלוח</dt>
        <dd>{pricing.shippingTotal == null ? (shippingLabel ?? "יחושב בקופה") : pricing.shippingTotal === 0 ? "חינם" : formatPrice(pricing.shippingTotal)}</dd>
      </div>
      {showTotal && (
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
          <dt>סה״כ לתשלום</dt>
          <dd>{formatPrice(pricing.total)}</dd>
        </div>
      )}
    </dl>
  );
}
