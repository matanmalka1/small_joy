"use client";

import { useMemo, useState } from "react";
import type { ProductDetailVariant } from "@/server/catalog/queries";
import { KIND_ATTRIBUTES, optionMatrix, type ProductKindKey } from "@/server/catalog/options";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { AddToCartButton } from "./add-to-cart-button";

function initialSelection(variants: ProductDetailVariant[]) {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  return { ...(first?.options ?? {}) };
}

export function ProductPurchase({
  variants,
  productName,
  kind,
}: {
  variants: ProductDetailVariant[];
  productName: string;
  kind: ProductKindKey;
}) {
  const matrix = useMemo(() => optionMatrix(variants, KIND_ATTRIBUTES[kind]), [variants, kind]);
  const [selected, setSelected] = useState<Record<string, string>>(() => initialSelection(variants));
  const [qty, setQty] = useState(1);

  const variant =
    variants.length === 1
      ? variants[0]
      : variants.find((v) => matrix.every((m) => (v.options[m.name] ?? "") === (selected[m.name] ?? "")));

  /** Is a value selectable given the other current selections? */
  const isAvailable = (name: string, value: string) =>
    variants.some(
      (v) => v.options[name] === value && matrix.every((m) => m.name === name || !selected[m.name] || v.options[m.name] === selected[m.name]),
    );

  const choose = (name: string, value: string) => {
    const next = { ...selected, [name]: value };
    // If the combination doesn't exist, jump to the first variant matching the new choice.
    if (!variants.some((v) => matrix.every((m) => v.options[m.name] === next[m.name]))) {
      const fallback = variants.find((v) => v.options[name] === value);
      if (fallback) Object.assign(next, fallback.options);
    }
    setSelected(next);
    setQty(1);
  };

  const inStock = (variant?.stock ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {variant ? <Price price={variant.price} compareAt={variant.compareAt} size="lg" /> : <span className="text-ink-soft">בחרו אפשרות</span>}
        {variant?.compareAt && <Badge tone="sale">מבצע</Badge>}
      </div>

      {matrix.length > 0 && variants.length > 1 &&
        matrix.map((m) => (
          <fieldset key={m.name}>
            <legend className="mb-2 text-sm font-semibold">
              {m.name}: <span className="font-normal text-ink-soft">{selected[m.name] ?? "—"}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {m.values.map((val) => {
                const active = selected[m.name] === val;
                const available = isAvailable(m.name, val);
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(m.name, val)}
                    className={cn(
                      "min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors",
                      active ? "border-teal bg-teal text-white" : "border-line bg-surface hover:border-teal",
                      !available && !active && "text-ink-soft line-through decoration-ink-soft/50",
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

      {variants.length === 1 && matrix.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {matrix.map((m) => (
            <div key={m.name} className="contents">
              <dt className="font-semibold">{m.name}</dt>
              <dd className="text-ink-soft">{m.values[0]}</dd>
            </div>
          ))}
        </dl>
      )}

      <p role="status" className="text-sm font-semibold">
        {!variant ? (
          <span className="text-ink-soft">השילוב שנבחר אינו זמין</span>
        ) : !inStock ? (
          <span className="text-danger">אזל מהמלאי</span>
        ) : variant.lowStock ? (
          <span className="text-warning">נותרו {variant.stock} יחידות בלבד</span>
        ) : (
          <span className="text-success">במלאי</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(variant?.stock ?? 1, 99))} disabled={!inStock} />
        <AddToCartButton
          variantId={variant?.id ?? null}
          quantity={qty}
          disabled={!inStock}
          size="lg"
          className="min-w-48 flex-1"
          label={inStock ? "הוספה לסל" : "אזל מהמלאי"}
        />
      </div>
      {variant && <p className="text-xs text-ink-soft">מק״ט: <span className="ltr-nums">{variant.sku}</span></p>}
      <span className="sr-only">{productName}</span>
    </div>
  );
}
