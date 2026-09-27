"use client";

import { useState } from "react";
import { ACheckbox, AInput, ASelect, FieldError } from "./form";
import { toShekelInput } from "@/lib/money";

type Promo = { id?: string; name?: string; type?: "PERCENT" | "FIXED"; value?: number; productId?: string | null; categoryId?: string | null; isActive?: boolean; startsAtInput?: string; endsAtInput?: string };

export function PromotionFields({ promo = {}, products, categories }: { promo?: Promo; products: { id: string; name: string }[]; categories: { id: string; label: string }[] }) {
  const [target, setTarget] = useState(promo.productId ? "PRODUCT" : "CATEGORY");
  const value = promo.value == null ? "" : promo.type === "FIXED" ? toShekelInput(promo.value) : String(promo.value);
  return (
    <>
      {promo.id && <input type="hidden" name="id" value={promo.id} />}
      <AInput label="שם המבצע" name="name" required defaultValue={promo.name} hint="לשימוש פנימי" />
      <div className="grid gap-4 sm:grid-cols-2">
        <ASelect label="סוג הנחה" name="type" defaultValue={promo.type ?? "PERCENT"}>
          <option value="PERCENT">אחוזים (%)</option>
          <option value="FIXED">סכום קבוע ליחידה (₪)</option>
        </ASelect>
        <AInput label="ערך ההנחה" name="value" required inputMode="decimal" dir="ltr" defaultValue={value} />
        <ASelect label="חל על" name="target" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="CATEGORY">קטגוריה</option>
          <option value="PRODUCT">מוצר</option>
        </ASelect>
        {target === "PRODUCT" ? (
          <ASelect label="מוצר" name="productId" defaultValue={promo.productId ?? ""}>
            <option value="">— בחירה —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </ASelect>
        ) : (
          <ASelect label="קטגוריה" name="categoryId" defaultValue={promo.categoryId ?? ""}>
            <option value="">— בחירה —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </ASelect>
        )}
        <AInput label="תאריך התחלה" name="startsAt" type="datetime-local" defaultValue={promo.startsAtInput} />
        <AInput label="תאריך סיום" name="endsAt" type="datetime-local" defaultValue={promo.endsAtInput} />
      </div>
      <FieldError name="target" />
      <ACheckbox name="isActive" label="פעיל" defaultChecked={promo.isActive ?? true} className="flex" />
      <p className="text-xs text-ink-soft">המבצע מחושב מהמחיר הרגיל. אם למוצר מוגדר גם ״מחיר מבצע״, הלקוח מקבל את המחיר הנמוך מביניהם (ללא כפל הנחות).</p>
    </>
  );
}
