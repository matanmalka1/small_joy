import { ProductGrid } from "./product-card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton, buttonClass } from "@/components/ui/button";
import type { ProductCard } from "@/server/catalog/queries";

const SORTS = [
  { value: "new", label: "החדשים ביותר" },
  { value: "price-asc", label: "מחיר: מהנמוך לגבוה" },
  { value: "price-desc", label: "מחיר: מהגבוה לנמוך" },
  { value: "name", label: "שם (א–ת)" },
];

type Raw = Record<string, string | undefined>;

function FilterFields({ raw, idPrefix }: { raw: Raw; idPrefix: string }) {
  const field = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base focus:border-teal focus:outline-none";
  return (
    <>
      {raw.q && <input type="hidden" name="q" value={raw.q} />}
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-sort`} className="text-sm font-semibold">מיון</label>
        <select id={`${idPrefix}-sort`} name="sort" defaultValue={raw.sort ?? "new"} className={field}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-semibold">טווח מחירים (₪)</legend>
        <div className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-min`} className="sr-only">מחיר מינימלי</label>
          <input id={`${idPrefix}-min`} name="min" inputMode="decimal" placeholder="מ־" defaultValue={raw.min} className={field} />
          <span aria-hidden="true">–</span>
          <label htmlFor={`${idPrefix}-max`} className="sr-only">מחיר מקסימלי</label>
          <input id={`${idPrefix}-max`} name="max" inputMode="decimal" placeholder="עד" defaultValue={raw.max} className={field} />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="1" defaultChecked={raw.stock === "1"} className="size-4.5 accent-teal" />
        במלאי בלבד
      </label>
      <button type="submit" className={buttonClass("secondary", "md", "w-full")}>הצגת תוצאות</button>
    </>
  );
}

export function ProductListing({
  basePath,
  raw,
  items,
  total,
  page,
  totalPages,
  emptyTitle = "לא נמצאו מוצרים",
}: {
  basePath: string;
  raw: Raw;
  items: ProductCard[];
  total: number;
  page: number;
  totalPages: number;
  emptyTitle?: string;
}) {
  const hasFilters = Boolean(raw.min || raw.max || raw.stock);
  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <aside aria-label="סינון ומיון">
        <details className="rounded-2xl border border-line bg-surface lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold">
            סינון ומיון {hasFilters && <span className="text-teal">(פעיל)</span>}
          </summary>
          <form action={basePath} className="space-y-4 border-t border-line p-4">
            <FilterFields raw={raw} idPrefix="m" />
          </form>
        </details>
        <form action={basePath} className="sticky top-36 hidden space-y-4 rounded-2xl border border-line bg-surface p-4 lg:block">
          <FilterFields raw={raw} idPrefix="d" />
          {hasFilters && (
            <LinkButton href={raw.q ? `${basePath}?q=${encodeURIComponent(raw.q)}` : basePath} variant="ghost" size="sm" className="w-full">
              ניקוי סינון
            </LinkButton>
          )}
        </form>
      </aside>
      <div>
        <p className="mb-4 text-sm text-ink-soft" role="status">{total} מוצרים</p>
        {items.length ? (
          <>
            <ProductGrid products={items} priorityCount={4} />
            <Pagination page={page} totalPages={totalPages} basePath={basePath} params={raw} />
          </>
        ) : (
          <EmptyState title={emptyTitle}>נסו לשנות את הסינון או לחפש מילה אחרת.</EmptyState>
        )}
      </div>
    </div>
  );
}
