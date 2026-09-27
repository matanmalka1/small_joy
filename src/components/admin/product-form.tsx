"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProductAction, uploadProductImagesAction } from "@/actions/admin/products";
import { KIND_LABELS, type ProductKindKey } from "@/server/catalog/options";
import { emptyVariant, type ProductFormValues, type ProductFormVariant } from "./product-form-values";
import { Input, Select, Textarea, Checkbox, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { ProductImage } from "@/components/store/product-image";

export function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: { id: string; label: string }[] }) {
  const [state, action] = useActionState(saveProductAction, null);
  const [v, setV] = useState<ProductFormValues>(initial);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "נשמר");
      router.refresh();
    }
  }, [state, router]);

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const setVariant = (i: number, patch: Partial<ProductFormVariant>) =>
    setV((cur) => ({ ...cur, variants: cur.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const payload = JSON.stringify({
    name: v.name,
    slug: v.slug,
    description: v.description,
    kind: v.kind,
    status: v.status,
    isFeatured: v.isFeatured,
    categoryIds: v.categoryIds,
    seoTitle: v.seoTitle,
    seoDescription: v.seoDescription,
    images: v.images,
    variants: v.variants.map((x) => ({
      id: x.id,
      sku: x.sku,
      options: Object.fromEntries(x.options.filter((o) => o.key.trim() && o.value.trim()).map((o) => [o.key.trim(), o.value.trim()])),
      price: x.price,
      salePrice: x.salePrice || null,
      stockQuantity: x.stockQuantity,
      lowStockThreshold: x.lowStockThreshold,
      isActive: true,
    })),
  });

  const err = (path: string) => fe[path]?.[0];

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="payload" value={payload} />
      {v.id && <input type="hidden" name="productId" value={v.id} />}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg">פרטי מוצר</h2>
        <Input label="שם המוצר" name="name" required value={v.name} onChange={(e) => set("name", e.target.value)} error={err("name")} />
        <Textarea label="תיאור" name="description" rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} error={err("description")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="סוג מוצר" name="kind" value={v.kind} onChange={(e) => set("kind", e.target.value as ProductKindKey)} hint="קובע אילו מאפייני וריאציה מוצעים">
            {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
          <Select label="סטטוס פרסום" name="status" value={v.status} onChange={(e) => set("status", e.target.value as ProductFormValues["status"])}>
            <option value="DRAFT">טיוטה (לא מוצג באתר)</option>
            <option value="ACTIVE">פעיל (מוצג באתר)</option>
            <option value="ARCHIVED">בארכיון</option>
          </Select>
          <div className="flex items-end pb-2">
            <Checkbox name="isFeatured" label="מוצר מומלץ (בעמוד הבית)" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg">קטגוריות</h2>
        {categories.length === 0 && <p className="text-sm text-ink-soft">אין קטגוריות. יש ליצור קטגוריה תחילה.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Checkbox
              key={c.id}
              name="cat"
              label={c.label}
              checked={v.categoryIds.includes(c.id)}
              onChange={(e) => set("categoryIds", e.target.checked ? [...v.categoryIds, c.id] : v.categoryIds.filter((x) => x !== c.id))}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">תמונות</h2>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              id="img-upload"
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const fd = new FormData();
                Array.from(files).forEach((f) => fd.append("files", f));
                startUpload(async () => {
                  const res = await uploadProductImagesAction(fd);
                  if (res.ok) set("images", [...v.images, ...res.images.map((i) => ({ ...i, alt: v.name }))]);
                  else toast(res.error, "error");
                  if (fileRef.current) fileRef.current.value = "";
                });
              }}
            />
            <label htmlFor="img-upload" className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-line px-4 text-sm font-semibold hover:bg-sand">
              {uploading ? "מעלה..." : "העלאת תמונות"}
            </label>
          </div>
        </div>
        <p className="text-xs text-ink-soft">JPG / PNG / WEBP עד 5MB. התמונות מוקטנות ומומרות אוטומטית. התמונה הראשונה היא הראשית.</p>
        {v.images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {v.images.map((img, i) => (
              <li key={img.id ?? img.url} className="space-y-2 rounded-xl border border-line p-2">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-sand"><ProductImage src={img.url} alt="" sizes="160px" /></div>
                <label className="sr-only" htmlFor={`alt-${i}`}>טקסט חלופי</label>
                <input id={`alt-${i}`} className={`${inputClass} h-9 text-sm`} placeholder="תיאור התמונה (נגישות)" value={img.alt} onChange={(e) => set("images", v.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                <div className="flex justify-between text-xs">
                  <button type="button" disabled={i === 0} className="underline disabled:opacity-40" onClick={() => { const arr = [...v.images]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; set("images", arr); }}>הקדמה</button>
                  <button type="button" className="text-danger underline" onClick={() => set("images", v.images.filter((_, j) => j !== i))}>הסרה</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">וריאציות, מחירים ומלאי</h2>
          <Button variant="outline" size="sm" onClick={() => set("variants", [...v.variants, emptyVariant(v.kind)])}>+ הוספת וריאציה</Button>
        </div>
        <p className="text-xs text-ink-soft">מחירים בש״ח כולל מע״מ. למוצר ללא אפשרויות – השאירו וריאציה אחת עם מאפיינים ריקים. שינוי מלאי כאן נרשם ביומן המלאי.</p>
        {(err("variants") || err("form")) && <Alert tone="danger">{err("variants") ?? err("form")}</Alert>}
        {v.variants.map((x, i) => (
          <fieldset key={x.id ?? `new-${i}`} className="space-y-3 rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-bold">וריאציה {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-5">
              <Input label="מק״ט (SKU)" name={`sku-${i}`} dir="ltr" required value={x.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} error={err(`variants.${i}.sku`)} />
              <Input label="מחיר (₪)" name={`price-${i}`} inputMode="decimal" dir="ltr" required value={x.price} onChange={(e) => setVariant(i, { price: e.target.value })} error={err(`variants.${i}.price`)} />
              <Input label="מחיר מבצע (₪)" name={`sale-${i}`} inputMode="decimal" dir="ltr" value={x.salePrice} onChange={(e) => setVariant(i, { salePrice: e.target.value })} error={err(`variants.${i}.salePrice`)} />
              <Input label="מלאי" name={`stock-${i}`} type="number" min={0} dir="ltr" value={x.stockQuantity} onChange={(e) => setVariant(i, { stockQuantity: e.target.value })} error={err(`variants.${i}.stockQuantity`)} />
              <Input label="התראת מלאי נמוך" name={`low-${i}`} type="number" min={0} dir="ltr" value={x.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: e.target.value })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">מאפיינים</p>
              {x.options.map((o, k) => (
                <div key={k} className="flex gap-2">
                  <label className="sr-only" htmlFor={`ok-${i}-${k}`}>שם מאפיין</label>
                  <input id={`ok-${i}-${k}`} className={inputClass} placeholder="שם (למשל: צבע)" value={o.key} onChange={(e) => setVariant(i, { options: x.options.map((y, m) => (m === k ? { ...y, key: e.target.value } : y)) })} />
                  <label className="sr-only" htmlFor={`ov-${i}-${k}`}>ערך</label>
                  <input id={`ov-${i}-${k}`} className={inputClass} placeholder="ערך (למשל: לבן)" value={o.value} onChange={(e) => setVariant(i, { options: x.options.map((y, m) => (m === k ? { ...y, value: e.target.value } : y)) })} />
                  <button type="button" className="px-2 text-danger" aria-label="הסרת מאפיין" onClick={() => setVariant(i, { options: x.options.filter((_, m) => m !== k) })}>×</button>
                </div>
              ))}
              {err(`variants.${i}.options`) && <p className="text-sm text-danger">{err(`variants.${i}.options`)}</p>}
              <div className="flex flex-wrap gap-3 text-sm">
                <button type="button" className="text-teal underline" onClick={() => setVariant(i, { options: [...x.options, { key: "", value: "" }] })}>+ מאפיין</button>
                <button type="button" className="text-teal underline" onClick={() => set("variants", [...v.variants.slice(0, i + 1), { ...x, id: undefined, sku: "" }, ...v.variants.slice(i + 1)])}>שכפול וריאציה</button>
                {v.variants.length > 1 && (
                  <button type="button" className="text-danger underline" onClick={() => set("variants", v.variants.filter((_, j) => j !== i))}>הסרת וריאציה</button>
                )}
              </div>
            </div>
          </fieldset>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg">קידום במנועי חיפוש (לא חובה)</h2>
        <Input label="כתובת URL" name="slug" dir="ltr" value={v.slug} onChange={(e) => set("slug", e.target.value)} hint="אותיות באנגלית, ספרות ומקפים. ריק = יווצר אוטומטית מהשם" error={err("slug")} />
        <Input label="כותרת SEO" name="seoTitle" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} />
        <Textarea label="תיאור SEO" name="seoDescription" rows={2} value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={170} />
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex gap-3 border-t border-line bg-canvas/95 px-1 py-3 backdrop-blur">
        <SubmitButton size="lg" pendingText="שומר...">שמירת מוצר</SubmitButton>
      </div>
    </form>
  );
}
