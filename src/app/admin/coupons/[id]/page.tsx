import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteCouponAction, saveCouponAction } from "@/actions/admin/catalog";
import { listCategoryOptions } from "@/server/admin/products";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, ConfirmButton } from "@/components/admin/form";
import { CouponFields } from "@/components/admin/coupon-fields";
import { toDateInput } from "@/components/admin/date-input";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "עריכת קופון" };

export default async function EditCouponPage(props: PageProps<"/admin/coupons/[id]">) {
  const { id } = await props.params;
  const [c, products, categories] = await Promise.all([
    db.coupon.findUnique({ where: { id }, include: { products: true, categories: true, _count: { select: { redemptions: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listCategoryOptions(),
  ]);
  if (!c) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`קופון ${c.code}`}
        description={`מומש ${c._count.redemptions} פעמים`}
        actions={
          <form action={deleteCouponAction}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton message="למחוק את הקופון? קופון שמומש יושבת במקום להימחק." className={buttonClass("outline", "sm", "text-danger")}>מחיקה</ConfirmButton>
          </form>
        }
      />
      <Panel>
        <AdminForm action={saveCouponAction}>
          <CouponFields
            coupon={{ ...c, productIds: c.products.map((p) => p.productId), categoryIds: c.categories.map((x) => x.categoryId), startsAtInput: toDateInput(c.startsAt), endsAtInput: toDateInput(c.endsAt) }}
            products={products}
            categories={categories}
          />
        </AdminForm>
      </Panel>
    </div>
  );
}
