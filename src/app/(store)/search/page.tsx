import type { Metadata } from "next";
import { listProducts } from "@/server/catalog/queries";
import { firstValues, listingParamsSchema } from "@/lib/validation/listing";
import { ProductListing } from "@/components/store/listing";
import { SearchIcon } from "@/components/store/icons";

export const metadata: Metadata = { title: "חיפוש מוצרים", robots: { index: false } };

export default async function SearchPage(props: PageProps<"/search">) {
  const raw = firstValues(await props.searchParams);
  const params = listingParamsSchema.parse(raw);
  const result = await listProducts({
    q: params.q,
    minPrice: params.min,
    maxPrice: params.max,
    inStockOnly: params.stock === "1",
    sort: params.sort,
    page: params.page,
  });
  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-3xl">{params.q ? `תוצאות חיפוש: ״${params.q}״` : "כל המוצרים"}</h1>
      <form action="/search" role="search" className="mb-6 max-w-xl">
        <label htmlFor="q-page" className="sr-only">חיפוש מוצרים</label>
        <div className="relative">
          <input id="q-page" name="q" type="search" defaultValue={params.q} placeholder="חיפוש לפי שם מוצר, קטגוריה או מק״ט" className="h-12 w-full rounded-full border border-line bg-surface ps-12 pe-4 text-base focus:border-teal focus:outline-none" />
          <button type="submit" className="absolute inset-y-0 start-0 grid w-12 place-items-center text-ink-soft" aria-label="חיפוש"><SearchIcon /></button>
        </div>
      </form>
      <ProductListing basePath="/search" raw={raw} {...result} emptyTitle={params.q ? `לא מצאנו תוצאות עבור ״${params.q}״` : "לא נמצאו מוצרים"} />
    </div>
  );
}
