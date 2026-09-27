import type { Metadata } from "next";
import { getCurrentCart, currentCartIdentity } from "@/server/cart/session";
import { buildCartView } from "@/server/cart/cart";
import { listShippingOptions } from "@/server/shipping/methods";
import { CartLine } from "@/components/store/cart-line";
import { CouponForm } from "@/components/store/coupon-form";
import { OrderSummary } from "@/components/store/order-summary";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "סל הקניות", robots: { index: false } };

export default async function CartPage() {
  const [cart, identity] = await Promise.all([getCurrentCart(), currentCartIdentity()]);
  const view = cart ? await buildCartView(cart.id, { email: identity.email, userId: identity.userId }) : null;

  if (!view || view.lines.length === 0) {
    return (
      <div className="container-page py-10">
        <h1 className="mb-6 text-3xl">סל הקניות</h1>
        <EmptyState title="הסל שלך ריק" action={<LinkButton href="/">להתחיל לקנות</LinkButton>}>שווה להציץ במבצעים שלנו.</EmptyState>
      </div>
    );
  }

  const shipping = await listShippingOptions();
  const thresholds = shipping.filter((s) => s.type === "DELIVERY" && s.freeShippingThreshold != null).map((s) => s.freeShippingThreshold!);
  const freeFrom = thresholds.length ? Math.min(...thresholds) : null;
  const afterDiscount = view.pricing.subtotal - view.pricing.discountTotal;

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl">סל הקניות <span className="text-lg font-normal text-ink-soft">({view.itemCount} פריטים)</span></h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {view.hasProblems && <Alert tone="warning" title="יש לעדכן את הסל">חלק מהמוצרים אינם זמינים בכמות שנבחרה.</Alert>}
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {view.lines.map((l) => <CartLine key={`${l.variantId}:${l.quantity}`} line={l} />)}
          </ul>
        </div>
        <aside aria-label="סיכום הזמנה" className="h-fit space-y-5 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
          <h2 className="text-xl">סיכום</h2>
          {freeFrom != null && afterDiscount < freeFrom && (
            <p className="rounded-xl bg-teal-soft p-3 text-sm text-teal">עוד {formatPrice(freeFrom - afterDiscount)} ותקבלו משלוח חינם</p>
          )}
          <CouponForm code={view.couponCode} message={view.couponMessage} />
          <OrderSummary pricing={view.pricing} />
          {view.hasProblems ? (
            <p className="text-sm text-danger">יש לעדכן את הסל לפני המעבר לתשלום.</p>
          ) : (
            <LinkButton href="/checkout" size="lg" className="w-full">מעבר לקופה</LinkButton>
          )}
          <LinkButton href="/" variant="ghost" className="w-full">המשך קנייה</LinkButton>
        </aside>
      </div>
    </div>
  );
}
