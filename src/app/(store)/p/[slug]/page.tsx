import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog/queries";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductGrid } from "@/components/store/product-card";
import { Section } from "@/components/store/section";
import { siteUrl } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "מוצר לא נמצא" };
  const description = p.seoDescription || p.description.slice(0, 160) || p.name;
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined },
  };
}

export default async function ProductPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const primaryCat = product.categories.find((c) => !c.parentId) ?? product.categories[0];
  const related = await getRelatedProducts(product.id, product.categories.map((c) => c.id));

  const prices = product.variants.map((v) => v.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => new URL(i.url, siteUrl()).toString()),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "שמחות קטנות" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ILS",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: new URL(`/p/${product.slug}`, siteUrl()).toString(),
    },
  };

  return (
    <div className="container-page py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs
        items={[
          { label: "דף הבית", href: "/" },
          ...(primaryCat ? [{ label: primaryCat.name, href: `/c/${primaryCat.slug}` }] : []),
          { label: product.name },
        ]}
      />
      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl">{product.name}</h1>
          <ProductPurchase variants={product.variants} productName={product.name} kind={product.kind} />
          {product.description && (
            <section aria-labelledby="desc" className="border-t border-line pt-5">
              <h2 id="desc" className="mb-2 text-lg">תיאור המוצר</h2>
              <p className="whitespace-pre-line text-ink-soft">{product.description}</p>
            </section>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <Section title="מוצרים שאולי יעניינו אותך" className="!px-0">
          <ProductGrid products={related.slice(0, 4)} />
        </Section>
      )}
    </div>
  );
}
