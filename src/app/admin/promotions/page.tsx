import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { savePromotionAction } from "@/actions/admin/catalog";
import { listCategoryOptions } from "@/server/admin/products";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/form";
import { PromotionFields } from "@/components/admin/promotion-fields";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "מבצעים" };

export default async function PromotionsPage() {
  const [promos, products, categories] = await Promise.all([
    db.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } }, category: { select: { name: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listCategoryOptions(),
  ]);
  const now = new Date();
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
      <div>
        <PageHeader title="מבצעים אוטומטיים" description="הנחה לפי מוצר או קטגוריה, ללא קוד. מוצגת באתר כמחיר מבצע." />
        <Table>
          <thead><tr><th>שם</th><th>הנחה</th><th>חל על</th><th>תוקף</th><th>סטטוס</th></tr></thead>
          <tbody>
            {promos.map((p) => {
              const live = p.isActive && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now);
              return (
                <tr key={p.id}>
                  <td><Link href={`/admin/promotions/${p.id}`} className="font-semibold text-teal hover:underline">{p.name}</Link></td>
                  <td>{p.type === "PERCENT" ? `${p.value}%` : formatPrice(p.value)}</td>
                  <td>{p.product ? `מוצר: ${p.product.name}` : p.category ? `קטגוריה: ${p.category.name}` : "—"}</td>
                  <td className="text-xs">{p.startsAt?.toLocaleDateString("he-IL") ?? "—"} – {p.endsAt?.toLocaleDateString("he-IL") ?? "—"}</td>
                  <td>{live ? <Badge tone="success">פעיל עכשיו</Badge> : <Badge>לא פעיל</Badge>}</td>
                </tr>
              );
            })}
            {promos.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-ink-soft">אין מבצעים</td></tr>}
          </tbody>
        </Table>
      </div>
      <Panel title="מבצע חדש" className="h-fit">
        <AdminForm action={savePromotionAction} submitLabel="יצירת מבצע">
          <PromotionFields products={products} categories={categories} />
        </AdminForm>
      </Panel>
    </div>
  );
}
