"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { placeOrderAction } from "@/actions/checkout";
import { Input, Textarea, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AddressFields } from "./address-fields";

export type CheckoutShippingOption = {
  id: string;
  name: string;
  description: string | null;
  type: "PICKUP" | "DELIVERY";
  /** Cost for THIS cart (server-computed, includes free-shipping threshold). */
  cost: number;
  etaText: string | null;
  zones: string[];
};

type Defaults = {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: Partial<Record<"city" | "street" | "houseNumber" | "apartment" | "floor" | "zip" | "addressNotes", string>>;
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-3 text-lg">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-teal text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutForm({
  options,
  merchandiseTotal,
  pickupAddress,
  defaults,
  isLoggedIn,
  sandbox,
}: {
  options: CheckoutShippingOption[];
  /** Subtotal after coupon, before shipping (server-computed). */
  merchandiseTotal: number;
  pickupAddress: string;
  defaults: Defaults;
  isLoggedIn: boolean;
  sandbox: boolean;
}) {
  const [state, action] = useActionState(placeOrderAction, null);
  const hasPickup = options.some((o) => o.type === "PICKUP");
  const hasDelivery = options.some((o) => o.type === "DELIVERY");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">(hasPickup ? "PICKUP" : "DELIVERY");
  const methods = options.filter((o) => o.type === fulfillment);
  const [methodId, setMethodId] = useState<string>(methods[0]?.id ?? "");
  const method = options.find((o) => o.id === methodId && o.type === fulfillment) ?? methods[0];
  const fe = state?.fieldErrors ?? {};
  const total = merchandiseTotal + (method?.cost ?? 0);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <Alert tone="danger" title="לא ניתן להשלים את ההזמנה">{state.error}</Alert>}

      <Step n={1} title="פרטי הלקוח">
        {!isLoggedIn && (
          <p className="mb-4 text-sm text-ink-soft">
            רכישה כאורח – אין צורך בהרשמה. כבר יש לך חשבון? <Link href="/account/login?next=/checkout" className="text-teal underline">התחברות</Link>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="שם מלא" name="fullName" autoComplete="name" required defaultValue={defaults.fullName} error={fe.fullName} fieldClassName="sm:col-span-2" />
          <Input label="דוא״ל" name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={defaults.email} error={fe.email} hint="אישור ההזמנה יישלח לכתובת זו" />
          <Input label="טלפון נייד" name="phone" type="tel" autoComplete="tel" dir="ltr" required defaultValue={defaults.phone} error={fe.phone} />
        </div>
      </Step>

      <Step n={2} title="איסוף עצמי או משלוח">
        <fieldset>
          <legend className="sr-only">אופן אספקה</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {hasPickup && (
              <label className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4", fulfillment === "PICKUP" ? "border-teal bg-teal-soft/40" : "border-line")}>
                <span className="flex items-center gap-2 font-bold">
                  <input type="radio" name="fulfillment" value="PICKUP" checked={fulfillment === "PICKUP"} onChange={() => { setFulfillment("PICKUP"); setMethodId(options.find((o) => o.type === "PICKUP")?.id ?? ""); }} className="accent-teal" />
                  איסוף עצמי
                </span>
                <span className="text-sm text-ink-soft">{pickupAddress}</span>
              </label>
            )}
            {hasDelivery && (
              <label className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4", fulfillment === "DELIVERY" ? "border-teal bg-teal-soft/40" : "border-line")}>
                <span className="flex items-center gap-2 font-bold">
                  <input type="radio" name="fulfillment" value="DELIVERY" checked={fulfillment === "DELIVERY"} onChange={() => { setFulfillment("DELIVERY"); setMethodId(options.find((o) => o.type === "DELIVERY")?.id ?? ""); }} className="accent-teal" />
                  משלוח עד הבית
                </span>
                <span className="text-sm text-ink-soft">לכל הארץ</span>
              </label>
            )}
          </div>
          {!hasDelivery && <p className="mt-3 text-sm text-ink-soft">משלוחים אינם זמינים כרגע באתר – ניתן לבחור איסוף עצמי.</p>}
        </fieldset>

        {methods.length > 0 && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold">שיטה</legend>
            <ul className="space-y-2">
              {methods.map((m) => (
                <li key={m.id}>
                  <label className={cn("flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3", method?.id === m.id ? "border-teal" : "border-line")}>
                    <span className="flex items-start gap-2">
                      <input type="radio" name="shippingMethodId" value={m.id} checked={method?.id === m.id} onChange={() => setMethodId(m.id)} className="mt-1.5 accent-teal" />
                      <span>
                        <span className="font-semibold">{m.name}</span>
                        {m.description && <span className="block text-sm text-ink-soft">{m.description}</span>}
                        {m.etaText && <span className="block text-sm text-ink-soft">זמן אספקה משוער: {m.etaText}</span>}
                        {m.zones.length > 0 && <span className="block text-xs text-ink-soft">אזורי חלוקה: {m.zones.join(", ")}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold">{m.cost === 0 ? "חינם" : formatPrice(m.cost)}</span>
                  </label>
                </li>
              ))}
            </ul>
            {fe.shippingMethodId && <p className="mt-2 text-sm text-danger" role="alert">{fe.shippingMethodId[0]}</p>}
          </fieldset>
        )}
      </Step>

      {fulfillment === "DELIVERY" && (
        <Step n={3} title="כתובת למשלוח">
          <AddressFields defaults={defaults.address} errors={fe} />
          {isLoggedIn && <Checkbox name="saveAddress" label="שמירת הכתובת לאזור האישי" className="mt-4" defaultChecked />}
          {fe.address && <p className="mt-2 text-sm text-danger" role="alert">{fe.address[0]}</p>}
        </Step>
      )}

      <Step n={fulfillment === "DELIVERY" ? 4 : 3} title="סיכום ותשלום">
        <Textarea label="הערות להזמנה (לא חובה)" name="notes" rows={2} error={fe.notes} />
        <dl className="my-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt>מוצרים (אחרי הנחות)</dt><dd>{formatPrice(merchandiseTotal)}</dd></div>
          <div className="flex justify-between"><dt>{method?.name ?? "משלוח"}</dt><dd>{!method ? "—" : method.cost === 0 ? "חינם" : formatPrice(method.cost)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>סה״כ לתשלום</dt><dd>{formatPrice(total)}</dd></div>
        </dl>
        <Checkbox
          name="acceptTerms"
          required
          label={<>קראתי ואני מאשר/ת את <Link href="/pages/terms" target="_blank" className="underline">התקנון</Link>, <Link href="/pages/returns" target="_blank" className="underline">מדיניות הביטולים</Link> ו<Link href="/pages/privacy" target="_blank" className="underline">מדיניות הפרטיות</Link></>}
        />
        {fe.acceptTerms && <p className="mt-1 text-sm text-danger" role="alert">{fe.acceptTerms[0]}</p>}
        {sandbox && (
          <Alert tone="warning" className="mt-4" title="סביבת בדיקה">
            התשלום באתר מחובר כרגע לסביבת בדיקה בלבד (Sandbox). לא יבוצע חיוב אמיתי.
          </Alert>
        )}
        <SubmitButton size="lg" className="mt-5 w-full" disabled={!method} pendingText="מעביר לתשלום מאובטח...">
          מעבר לתשלום מאובטח באשראי
        </SubmitButton>
        <p className="mt-2 text-center text-xs text-ink-soft">התשלום מתבצע בעמוד המאובטח של חברת הסליקה. פרטי האשראי אינם נשמרים באתר.</p>
      </Step>
    </form>
  );
}
