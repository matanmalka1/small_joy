import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listCategoryOptions } from "@/server/admin/products";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin/catalog";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, ConfirmButton } from "@/components/admin/form";
import { CategoryFields } from "@/components/admin/category-fields";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "עריכת קטגוריה" };

export default async function EditCategoryPage(props: PageProps<"/admin/categories/[id]">) {
  const { id } = await props.params;
  const [cat, options] = await Promise.all([db.category.findUnique({ where: { id } }), listCategoryOptions()]);
  if (!cat) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={cat.name}
        actions={
          <form action={deleteCategoryAction}>
            <input type="hidden" name="id" value={cat.id} />
            <ConfirmButton message="למחוק את הקטגוריה? המוצרים לא יימחקו, רק השיוך אליה. תת־קטגוריות יהפכו לראשיות." className={buttonClass("outline", "sm", "text-danger")}>מחיקה</ConfirmButton>
          </form>
        }
      />
      <Panel>
        <AdminForm action={saveCategoryAction}>
          <CategoryFields cat={cat} parents={options} />
        </AdminForm>
      </Panel>
    </div>
  );
}
