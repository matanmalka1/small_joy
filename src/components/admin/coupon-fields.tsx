"use client";

import { useState } from "react";
import { ACheckbox, AInput, ASelect, FieldError } from "./form";
import { toShekelInput } from "@/lib/money";

type Coupon = {
  id?: string;
  code?: string;
  description?: string | null;
  type?: "PERCENT" | "FIXED";
  value?: number;
  scope?: "ALL" | "PRODUCTS" | "CATEGORIES";
  productIds?: string[];
  categoryIds?: string[];
  minOrderTotal?: number;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  combineWithSales?: boolean;
  isActive?: boolean;
  startsAtInput?: string;
  endsAtInput?: string;
};

export function CouponFields({ coupon = {}, products, categories }: { coupon?: Coupon; products: { id: string; name: string }[]; categories: { id: string; label: string }[] }) {
  const [scope, setScope] = useState(coupon.scope ?? "ALL");
  const value = coupon.value == null ? "" : coupon.type === "FIXED" ? toShekelInput(coupon.value) : String(coupon.value);
  return (
    <>
      {coupon.id && <input type="hidden" name="id" value={coupon.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <AInput label="קוד קופון" name="code" required dir="ltr" defaultValue={coupon.code} hint="אנגלית וספרות, ללא רווחים" />
        <AInput label="תיאור פנימי" name="description" defaultValue={coupon.description ?? ""} />
        <ASelect label="סוג הנחה" name="type" defaultValue={coupon.type ?? "PERCENT"}>
          <option value="PERCENT">אחוזים (%)</option>
          <option value="FIXED">סכום קבוע (₪)</option>
        </ASelect>
        <AInput label="ערך ההנחה" name="value" required inputMode="decimal" dir="ltr" defaultValue={value} />
        <AInput label="תאריך התחלה" name="startsAt" type="datetime-local" defaultValue={coupon.startsAtInput} />
        <AInput label="תאריך סיום" name="endsAt" type="datetime-local" defaultValue={coupon.endsAtInput} />
        <AInput label="סכום הזמנה מינימלי (₪)" name="minOrderTotal" inputMode="decimal" dir="ltr" defaultValue={coupon.minOrderTotal ? toShekelInput(coupon.minOrderTotal) : ""} />
        <AInput label="מספר מימושים מקסימלי (סה״כ)" name="maxRedemptions" type="number" min={1} defaultValue={coupon.maxRedemptions ?? ""} hint="ריק = ללא הגבלה" />
        <AInput label="מימושים ללקוח" name="perCustomerLimit" type="number" min={1} defaultValue={coupon.perCustomerLimit ?? ""} hint="לפי דוא״ל. ריק = ללא הגבלה" />
        <ASelect label="חל על" name="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
          <option value="ALL">כל המוצרים</option>
          <option value="PRODUCTS">מוצרים נבחרים</option>
          <option value="CATEGORIES">קטגוריות נבחרות</option>
        </ASelect>
      </div>
      {scope === "PRODUCTS" && (
        <fieldset className="max-h-56 space-y-1 overflow-auto rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-semibold">מוצרים</legend>
          {products.map((p) => <ACheckbox key={p.id} name="productIds" value={p.id} label={p.name} defaultChecked={coupon.productIds?.includes(p.id)} className="flex" />)}
          <FieldError name="productIds" />
        </fieldset>
      )}
      {scope === "CATEGORIES" && (
        <fieldset className="space-y-1 rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-semibold">קטגוריות</legend>
          {categories.map((c) => <ACheckbox key={c.id} name="categoryIds" value={c.id} label={c.label} defaultChecked={coupon.categoryIds?.includes(c.id)} className="flex" />)}
          <FieldError name="categoryIds" />
        </fieldset>
      )}
      <ACheckbox name="combineWithSales" label="ניתן לשלב עם מוצרים במבצע (אחרת הקופון חל רק על מוצרים שאינם במבצע)" defaultChecked={coupon.combineWithSales ?? false} className="flex" />
      <ACheckbox name="isActive" label="פעיל" defaultChecked={coupon.isActive ?? true} className="flex" />
    </>
  );
}
