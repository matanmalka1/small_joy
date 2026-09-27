import type { Metadata } from "next";
import { listProducts } from "@/server/catalog/queries";
import { firstValues, listingParamsSchema } from "@/lib/validation/listing";
import { ProductListing } from "@/components/store/listing";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "מבצעים", description: "כל המבצעים של שמחות קטנות", alternates: { canonical: "/sale" } };

export default async function SalePage(props: PageProps<"/sale">) {
  const raw = firstValues(await props.searchParams);
  const params = listingParamsSchema.parse(raw);
  const result = await listProducts({
    onSaleOnly: true,
    minPrice: params.min,
    maxPrice: params.max,
    inStockOnly: params.stock === "1",
    sort: params.sort,
    page: params.page,
  });
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "דף הבית", href: "/" }, { label: "מבצעים" }]} />
      <h1 className="my-5 text-3xl">מבצעים</h1>
      <ProductListing basePath="/sale" raw={raw} {...result} emptyTitle="אין כרגע מבצעים פעילים" />
    </div>
  );
}
