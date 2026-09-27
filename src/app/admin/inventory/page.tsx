import Link from "next/link";
import { listInventory, listLowStock } from "@/server/admin/queries";
import { firstValues } from "@/lib/validation/listing";
import { variantLabel, type VariantOptions } from "@/server/catalog/options";
import { FilterBar, PageHeader, Panel, Table, filterInput } from "@/components/admin/ui";
import { StockAdjust } from "@/components/admin/stock-adjust";
import { Pagination } from "@/components/ui/pagination";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "מלאי" };

export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = firstValues(await props.searchParams);
  const [inv, low] = await Promise.all([listInventory({ q: sp.q, page: Number(sp.page) || 1 }), listLowStock(20)]);
  return (
    <div className="space-y-5">
      <PageHeader
        title="ניהול מלאי"
        description="המלאי יורד אוטומטית רק כשתשלום מאושר, וחוזר אוטומטית בביטול או החזר. כל שינוי נרשם ביומן."
        actions={<LinkButton href="/admin/inventory/movements" variant="outline" size="sm">יומן תנועות מלאי</LinkButton>}
      />
      {low.length > 0 && (
        <Panel title={`התראות מלאי נמוך (${low.length})`}>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {low.map((v) => (
              <li key={v.id} className="flex justify-between gap-2 rounded-lg bg-warning-soft px-3 py-2">
                <Link href={`/admin/products/${v.productId}`} className="hover:underline">{v.productName} <span className="text-ink-soft">{variantLabel(v.options)}</span></Link>
                <strong className={v.stockQuantity === 0 ? "text-danger" : "text-warning"}>{v.stockQuantity} / {v.lowStockThreshold}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <FilterBar action="/admin/inventory">
        <label className="sr-only" htmlFor="iq">חיפוש</label>
        <input id="iq" name="q" defaultValue={sp.q} placeholder="שם מוצר או מק״ט" className={filterInput} />
      </FilterBar>
      <Table>
        <thead><tr><th>מוצר</th><th>מק״ט</th><th>במלאי</th><th>סף התראה</th><th>עדכון כמות</th><th></th></tr></thead>
        <tbody>
          {inv.rows.map((v) => (
            <tr key={v.id}>
              <td><Link href={`/admin/products/${v.product.id}`} className="font-semibold hover:text-teal">{v.product.name}</Link><div className="text-xs text-ink-soft">{variantLabel(v.options as VariantOptions)}</div></td>
              <td className="text-xs ltr-nums">{v.sku}</td>
              <td className={v.stockQuantity === 0 ? "font-bold text-danger" : v.stockQuantity <= v.lowStockThreshold ? "font-bold text-warning" : "font-semibold"}>{v.stockQuantity}</td>
              <td>{v.lowStockThreshold}</td>
              <td><StockAdjust variantId={v.id} current={v.stockQuantity} label={v.sku} /></td>
              <td><Link href={`/admin/inventory/movements?variant=${v.id}`} className="text-xs text-teal underline">היסטוריה</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={inv.page} totalPages={inv.totalPages} basePath="/admin/inventory" params={sp} />
    </div>
  );
}
