import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { getCurrentCart } from "@/server/cart/session";
import { buildCartView } from "@/server/cart/cart";
import { listShippingOptions } from "@/server/shipping/methods";
import { getStoreSettings } from "@/server/settings/store-settings";
import { paymentsAreSandbox, paymentsAvailable } from "@/server/payments/providers";
import { CheckoutForm, type CheckoutShippingOption } from "@/components/store/checkout-form";
import { OrderSummary } from "@/components/store/order-summary";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "קופה", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCurrentCart(), getCurrentUser()]);
  if (!cart) redirect("/cart");
  const view = await buildCartView(cart.id, { email: user?.email, userId: user?.id });
  if (view.lines.length === 0) redirect("/cart");

  const [shipping, settings, profile, address] = await Promise.all([
    listShippingOptions(),
    getStoreSettings(),
    user ? db.customerProfile.findUnique({ where: { userId: user.id } }) : null,
    user ? db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : null,
  ]);

  const merchandiseTotal = view.pricing.subtotal - view.pricing.discountTotal;
  const options: CheckoutShippingOption[] = shipping.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type,
    etaText: s.etaText,
    zones: s.zones,
    cost: s.freeShippingThreshold != null && merchandiseTotal >= s.freeShippingThreshold ? 0 : s.price,
  }));

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl">קופה</h1>
      {view.hasProblems && (
        <Alert tone="warning" className="mb-4" title="יש לעדכן את הסל">
          חלק מהמוצרים אינם זמינים בכמות שנבחרה. <LinkButton href="/cart" variant="ghost" size="sm">לעדכון הסל</LinkButton>
        </Alert>
      )}
      {!paymentsAvailable() ? (
        <Alert tone="warning" title="התשלום המקוון טרם הופעל">
          לא ניתן להשלים רכישה באתר כרגע. ניתן ליצור איתנו קשר להשלמת ההזמנה.
        </Alert>
      ) : options.length === 0 ? (
        <Alert tone="danger" title="לא ניתן להשלים הזמנה כרגע">לא הוגדרו שיטות אספקה פעילות. אנא צרו קשר עם החנות.</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <CheckoutForm
            options={options}
            merchandiseTotal={merchandiseTotal}
            pickupAddress={settings.addressLine}
            isLoggedIn={Boolean(user)}
            sandbox={paymentsAreSandbox()}
            defaults={{
              fullName: user?.name,
              email: user?.email,
              phone: profile?.phone ?? address?.phone ?? undefined,
              address: address
                ? { city: address.city, street: address.street, houseNumber: address.houseNumber, apartment: address.apartment ?? undefined, floor: address.floor ?? undefined, zip: address.zip ?? undefined, addressNotes: address.notes ?? undefined }
                : undefined,
            }}
          />
          <aside aria-label="פריטים בהזמנה" className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
            <h2 className="text-lg">ההזמנה שלך</h2>
            <ul className="space-y-2 text-sm">
              {view.lines.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-3">
                  <span>
                    {l.productName} {l.variantLabel && <span className="text-ink-soft">({l.variantLabel})</span>} × {l.quantity}
                  </span>
                  <span className="shrink-0">{formatPrice(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <OrderSummary pricing={view.pricing} shippingLabel="לפי השיטה שנבחרה" showTotal={false} />
            <LinkButton href="/cart" variant="ghost" size="sm" className="w-full">עריכת הסל</LinkButton>
          </aside>
        </div>
      )}
    </div>
  );
}
