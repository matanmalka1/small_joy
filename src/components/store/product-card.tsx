import Link from "next/link";
import type { ProductCard as Card } from "@/server/catalog/queries";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { LinkButton } from "@/components/ui/button";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({ product, priority }: { product: Card; priority?: boolean }) {
  const discountPct = product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-card)]">
      <div className="relative aspect-square overflow-hidden bg-sand">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt}
          sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {discountPct > 0 && <Badge tone="sale">{discountPct}%-</Badge>}
          {product.isNew && <Badge tone="new">חדש</Badge>}
          {!product.inStock && <Badge tone="neutral">אזל מהמלאי</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.8em] text-sm font-semibold leading-snug sm:text-base">
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-baseline gap-1 text-sm">
          {product.priceVaries && <span className="text-ink-soft">החל מ־</span>}
          <Price price={product.price} compareAt={product.compareAt} size="sm" />
        </div>
        <div className="relative z-10">
          {product.singleVariantId ? (
            <AddToCartButton
              variantId={product.singleVariantId}
              disabled={!product.inStock}
              size="sm"
              className="w-full"
              label={product.inStock ? "הוספה לסל" : "אזל"}
              productName={product.name}
            />
          ) : (
            <LinkButton href={`/p/${product.slug}`} variant="outline" size="sm" className="w-full" aria-label={`בחירת אפשרויות – ${product.name}`}>
              בחירת אפשרויות
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <ProductCard product={p} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}
