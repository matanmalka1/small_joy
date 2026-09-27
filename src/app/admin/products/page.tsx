import Link from "next/link";
import { listAdminProducts, listCategoryOptions } from "@/server/admin/products";
import { firstValues } from "@/lib/validation/listing";
import { formatPrice } from "@/lib/money";
import { FilterBar, PageHeader, Table, filterInput } from "@/components/admin/ui";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination";
import { ProductImage } from "@/components/store/product-image";

export const metadata = { title: "מוצרים" };

const STATUS = { DRAFT: ["טיוטה", "neutral"], ACTIVE: ["פעיל", "success"], ARCHIVED: ["ארכיון", "warning"] } as const;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const sp = firstValues(await props.searchParams);
  const [{ rows, total, page, totalPages }, categories] = await Promise.all([
    listAdminProducts({ q: sp.q, status: sp.status, categoryId: sp.category, stock: sp.stock, page: Number(sp.page) || 1 }),
    listCategoryOptions(),
  ]);
  return (
    <div>
      <PageHeader
        title="מוצרים"
        description={`${total} מוצרים`}
        actions={
          <>
            <LinkButton href="/admin/products/import" variant="outline" size="sm">ייבוא / ייצוא CSV</LinkButton>
            <LinkButton href="/admin/products/new" size="sm">+ מוצר חדש</LinkButton>
          </>
        }
      />
      {sp.archived && <Alert tone="info" className="mb-4">המוצר הועבר לארכיון (קיימות הזמנות שלו ולכן לא נמחק).</Alert>}
      {sp.deleted && <Alert tone="success" className="mb-4">המוצר נמחק.</Alert>}
      <FilterBar action="/admin/products">
        <label className="sr-only" htmlFor="pq">חיפוש</label>
        <input id="pq" name="q" defaultValue={sp.q} placeholder="שם, מק״ט..." className={filterInput} />
        <label className="sr-only" htmlFor="ps">סטטוס</label>
        <select id="ps" name="status" defaultValue={sp.status ?? ""} className={filterInput}>
          <option value="">כל הסטטוסים</option>
          <option value="ACTIVE">פעיל</option>
          <option value="DRAFT">טיוטה</option>
          <option value="ARCHIVED">ארכיון</option>
        </select>
        <label className="sr-only" htmlFor="pc">קטגוריה</label>
        <select id="pc" name="category" defaultValue={sp.category ?? ""} className={filterInput}>
          <option value="">כל הקטגוריות</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="pst">מלאי</label>
        <select id="pst" name="stock" defaultValue={sp.stock ?? ""} className={filterInput}>
          <option value="">כל המלאי</option>
          <option value="low">מלאי נמוך</option>
          <option value="out">אזל</option>
        </select>
      </FilterBar>
      <Table>
        <thead><tr><th>מוצר</th><th>מק״טים</th><th>מחיר</th><th>מלאי</th><th>קטגוריות</th><th>סטטוס</th></tr></thead>
        <tbody>
          {rows.map((p) => {
            const stock = p.variants.reduce((s, v) => s + v.stockQuantity, 0);
            const prices = p.variants.map((v) => v.salePrice ?? v.price);
            const [label, tone] = STATUS[p.status];
            return (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-teal">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-sand"><ProductImage src={p.images[0]?.url ?? null} alt="" sizes="40px" /></span>
                    <span>{p.name}{p.isFeatured && <span className="ms-2 text-xs text-warning">★ מומלץ</span>}</span>
                  </Link>
                </td>
                <td className="text-xs ltr-nums">{p.variants.length === 1 ? p.variants[0].sku : `${p.variants.length} וריאציות`}</td>
                <td>{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatPrice(prices[0]) : `${formatPrice(Math.min(...prices))}–${formatPrice(Math.max(...prices))}`) : "—"}</td>
                <td className={stock === 0 ? "font-bold text-danger" : ""}>{stock}</td>
                <td className="text-xs text-ink-soft">{p.categories.map((c) => c.category.name).join(", ")}</td>
                <td><Badge tone={tone}>{label}</Badge></td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-ink-soft">לא נמצאו מוצרים</td></tr>}
        </tbody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/products" params={sp} />
    </div>
  );
}
