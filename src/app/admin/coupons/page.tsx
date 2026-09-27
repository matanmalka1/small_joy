import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { saveCouponAction } from "@/actions/admin/catalog";
import { listCategoryOptions } from "@/server/admin/products";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/form";
import { CouponFields } from "@/components/admin/coupon-fields";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "קופונים" };

export default async function CouponsPage() {
  const [coupons, products, categories] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listCategoryOptions(),
  ]);
  const now = new Date();
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_28rem]">
      <div>
        <PageHeader title="קופונים" description="ההנחות מחושבות תמיד בשרת. מימוש נספר רק לאחר תשלום מאושר." />
        <Table>
          <thead><tr><th>קוד</th><th>הנחה</th><th>מינימום</th><th>מימושים</th><th>תוקף</th><th>סטטוס</th></tr></thead>
          <tbody>
            {coupons.map((c) => {
              const expired = c.endsAt && c.endsAt < now;
              return (
                <tr key={c.id}>
                  <td><Link href={`/admin/coupons/${c.id}`} className="font-semibold text-teal hover:underline ltr-nums">{c.code}</Link>{c.description && <div className="text-xs text-ink-soft">{c.description}</div>}</td>
                  <td>{c.type === "PERCENT" ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td>{c.minOrderTotal ? formatPrice(c.minOrderTotal) : "—"}</td>
                  <td>{c._count.redemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="text-xs">{c.endsAt ? c.endsAt.toLocaleDateString("he-IL") : "ללא הגבלה"}</td>
                  <td>{!c.isActive ? <Badge>כבוי</Badge> : expired ? <Badge tone="warning">פג תוקף</Badge> : <Badge tone="success">פעיל</Badge>}</td>
                </tr>
              );
            })}
            {coupons.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-ink-soft">אין קופונים</td></tr>}
          </tbody>
        </Table>
      </div>
      <Panel title="קופון חדש" className="h-fit">
        <AdminForm action={saveCouponAction} submitLabel="יצירת קופון">
          <CouponFields products={products} categories={categories} />
        </AdminForm>
      </Panel>
    </div>
  );
}
