import { listCategoryOptions } from "@/server/admin/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { newProductValues } from "@/components/admin/product-form-values";

export const metadata = { title: "מוצר חדש" };

export default async function NewProductPage() {
  const categories = await listCategoryOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title="מוצר חדש" />
      <ProductForm initial={newProductValues()} categories={categories} />
    </div>
  );
}
