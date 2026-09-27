import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deletePromotionAction, savePromotionAction } from "@/actions/admin/catalog";
import { listCategoryOptions } from "@/server/admin/products";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, ConfirmButton } from "@/components/admin/form";
import { PromotionFields } from "@/components/admin/promotion-fields";
import { toDateInput } from "@/components/admin/date-input";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "עריכת מבצע" };

export default async function EditPromotionPage(props: PageProps<"/admin/promotions/[id]">) {
  const { id } = await props.params;
  const [p, products, categories] = await Promise.all([
    db.promotion.findUnique({ where: { id } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listCategoryOptions(),
  ]);
  if (!p) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={p.name}
        actions={
          <form action={deletePromotionAction}>
            <input type="hidden" name="id" value={p.id} />
            <ConfirmButton message="למחוק את המבצע?" className={buttonClass("outline", "sm", "text-danger")}>מחיקה</ConfirmButton>
          </form>
        }
      />
      <Panel>
        <AdminForm action={savePromotionAction}>
          <PromotionFields promo={{ ...p, startsAtInput: toDateInput(p.startsAt), endsAtInput: toDateInput(p.endsAt) }} products={products} categories={categories} />
        </AdminForm>
      </Panel>
    </div>
  );
}
