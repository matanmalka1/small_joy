import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryWithDescendants, getCategoryBySlug, listProducts } from "@/server/catalog/queries";
import { firstValues, listingParamsSchema } from "@/lib/validation/listing";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProductListing } from "@/components/store/listing";

export async function generateMetadata(props: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "קטגוריה לא נמצאה" };
  return {
    title: cat.name,
    description: cat.description ?? `${cat.name} – מבחר מוצרים בשמחות קטנות`,
    alternates: { canonical: `/c/${cat.slug}` },
    openGraph: { title: cat.name, images: cat.imageUrl ? [cat.imageUrl] : undefined },
  };
}

export default async function CategoryPage(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const raw = firstValues(await props.searchParams);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const params = listingParamsSchema.parse(raw);
  const categoryIds = await categoryWithDescendants(cat.id);
  const result = await listProducts({
    categoryIds,
    minPrice: params.min,
    maxPrice: params.max,
    inStockOnly: params.stock === "1",
    sort: params.sort,
    page: params.page,
  });

  return (
    <div className="container-page py-6">
      <Breadcrumbs
        items={[
          { label: "דף הבית", href: "/" },
          ...(cat.parent?.isActive ? [{ label: cat.parent.name, href: `/c/${cat.parent.slug}` }] : []),
          { label: cat.name },
        ]}
      />
      <header className="my-5 space-y-2">
        <h1 className="text-3xl">{cat.name}</h1>
        {cat.description && <p className="max-w-2xl text-ink-soft">{cat.description}</p>}
        {cat.children.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2" aria-label="תת־קטגוריות">
            {cat.children.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="inline-block rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold hover:border-teal hover:text-teal">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>
      <ProductListing basePath={`/c/${cat.slug}`} raw={raw} {...result} />
    </div>
  );
}
