import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, listCategoryOptions } from "@/server/admin/products";
import { deleteProductAction } from "@/actions/admin/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { productToFormValues } from "@/components/admin/product-form-values";
import { ConfirmButton } from "@/components/admin/form";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "עריכת מוצר" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [product, categories] = await Promise.all([getAdminProduct(id), listCategoryOptions()]);
  if (!product) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={product.name}
        description={product.status === "ACTIVE" ? <Link href={`/p/${product.slug}`} className="text-teal underline" target="_blank">צפייה באתר ↗</Link> : "המוצר אינו מוצג באתר"}
        actions={
          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <ConfirmButton message="למחוק את המוצר? מוצר שהוזמן בעבר יועבר לארכיון במקום להימחק." className={buttonClass("outline", "sm", "text-danger")}>
              מחיקה / ארכיון
            </ConfirmButton>
          </form>
        }
      />
      {sp.created && <Alert tone="success" className="mb-4">המוצר נוצר.</Alert>}
      {product.isDemo && <Alert tone="info" className="mb-4">מוצר הדגמה – יימחק בעת איפוס נתוני הדמו.</Alert>}
      <ProductForm key={product.updatedAt.toISOString()} initial={productToFormValues(product)} categories={categories} />
    </div>
  );
}
