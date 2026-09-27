import Link from "next/link";
import { listMovements } from "@/server/admin/queries";
import { firstValues } from "@/lib/validation/listing";
import { formatOrderNumber } from "@/server/orders/status";
import { PageHeader, Table } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "יומן מלאי" };

const REASONS: Record<string, string> = {
  INITIAL: "מלאי פתיחה",
  SALE: "מכירה",
  CANCEL_RESTOCK: "החזרה למלאי – ביטול",
  REFUND_RESTOCK: "החזרה למלאי – החזר",
  ADJUSTMENT: "עדכון ידני",
  IMPORT: "ייבוא CSV",
};

export default async function MovementsPage(props: PageProps<"/admin/inventory/movements">) {
  const sp = firstValues(await props.searchParams);
  const m = await listMovements({ variantId: sp.variant, page: Number(sp.page) || 1 });
  return (
    <div>
      <PageHeader title="יומן תנועות מלאי" description={sp.variant ? <Link href="/admin/inventory/movements" className="text-teal underline">הצגת כל התנועות</Link> : undefined} />
      <Table>
        <thead><tr><th>תאריך</th><th>מוצר</th><th>מק״ט</th><th>שינוי</th><th>סיבה</th><th>הזמנה</th><th>הערה</th></tr></thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{r.createdAt.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</td>
              <td>{r.variant.product.name}</td>
              <td className="text-xs ltr-nums">{r.variant.sku}</td>
              <td className={`font-bold ltr-nums ${r.delta < 0 ? "text-danger" : "text-success"}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
              <td>{REASONS[r.reason]}</td>
              <td>{r.orderId && r.orderNumber ? <Link href={`/admin/orders/${r.orderId}`} className="text-teal underline ltr-nums">{formatOrderNumber(r.orderNumber)}</Link> : "—"}</td>
              <td className="text-xs text-ink-soft">{r.note}</td>
            </tr>
          ))}
          {m.rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-ink-soft">אין תנועות</td></tr>}
        </tbody>
      </Table>
      <Pagination page={m.page} totalPages={m.totalPages} basePath="/admin/inventory/movements" params={sp} />
    </div>
  );
}
