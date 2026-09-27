import Link from "next/link";
import Image from "next/image";
import { getCategoryTree, listProducts } from "@/server/catalog/queries";
import { getStoreSettings } from "@/server/settings/store-settings";
import { listShippingOptions } from "@/server/shipping/methods";
import { ProductGrid } from "@/components/store/product-card";
import { Section } from "@/components/store/section";
import { LinkButton } from "@/components/ui/button";
import { HeartIcon, ShieldIcon, StoreIcon, TruckIcon } from "@/components/store/icons";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await getCategoryTree();
  const bySlug = new Map(categories.flatMap((c) => [c, ...c.children]).map((c) => [c.slug, c.id]));
  const ids = (...slugs: string[]) => slugs.flatMap((s) => (bySlug.get(s) ? [bySlug.get(s)!] : []));

  const [sale, fresh, featured, home, party, bedding, settings, shipping] = await Promise.all([
    listProducts({ onSaleOnly: true, pageSize: 8, sort: "new" }),
    listProducts({ pageSize: 8, sort: "new" }),
    listProducts({ featuredOnly: true, pageSize: 8 }),
    listProducts({ categoryIds: ids("housewares", "kitchen", "storage"), pageSize: 4 }),
    listProducts({ categoryIds: ids("hosting", "birthdays", "disposable"), pageSize: 4 }),
    listProducts({ categoryIds: ids("bedding", "textile"), pageSize: 4 }),
    getStoreSettings(),
    listShippingOptions(),
  ]);

  const delivery = shipping.filter((s) => s.type === "DELIVERY");
  const pickup = shipping.find((s) => s.type === "PICKUP");
  const freeFrom = delivery.map((d) => d.freeShippingThreshold).filter((x): x is number => x != null).sort((a, b) => a - b)[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-blush">
        <div className="container-page grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="space-y-5">
            <p className="inline-block rounded-full bg-surface px-3 py-1 text-sm font-semibold text-teal">החנות השכונתית שלכם – עכשיו גם אונליין</p>
            <h1 className="text-4xl leading-tight md:text-5xl">
              כל מה שצריך <span className="text-brand-hover">לבית ולשמחות</span>, במקום אחד
            </h1>
            <p className="max-w-lg text-lg text-ink-soft">
              כלים חד־פעמיים, כלי בית ומטבח, מצעים, מוצרי אירוח ומסיבות – במחירים של שכונה ועם איסוף עצמי מנתניה או משלוח עד הבית.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/sale" size="lg">למבצעים</LinkButton>
              <LinkButton href="/c/hosting" size="lg" variant="outline">מוצרי אירוח</LinkButton>
            </div>
          </div>
          <div className="relative hidden aspect-[4/3] md:block">
            <div className="absolute inset-0 grid grid-cols-2 gap-4">
              {["/demo/categories/hosting.svg", "/demo/categories/bedding.svg", "/demo/categories/birthdays.svg", "/demo/categories/kitchen.svg"].map((src, i) => (
                <div key={src} className={`relative overflow-hidden rounded-3xl shadow-[var(--shadow-card)] ${i % 2 ? "translate-y-6" : ""}`}>
                  <Image src={src} alt="" fill unoptimized priority={i < 2} className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <Section title="קטגוריות פופולריות">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center hover:bg-surface">
                <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-sand">
                  {c.imageUrl && <Image src={c.imageUrl} alt="" fill unoptimized className="object-cover transition-transform group-hover:scale-105" />}
                </span>
                <span className="text-sm font-semibold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {sale.items.length > 0 && (
        <Section title="מבצעים חמים" href="/sale" linkLabel="לכל המבצעים" className="rounded-3xl">
          <ProductGrid products={sale.items} />
        </Section>
      )}

      {/* Benefits */}
      <section aria-label="היתרונות שלנו" className="bg-surface py-10">
        <ul className="container-page grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { icon: <StoreIcon />, title: "איסוף עצמי", text: `מהחנות – ${settings.addressLine}` },
            { icon: <TruckIcon />, title: "משלוחים לכל הארץ", text: freeFrom != null ? `משלוח חינם מעל ${formatPrice(freeFrom)}` : "עלות וזמני אספקה מוצגים בקופה" },
            { icon: <ShieldIcon />, title: "תשלום מאובטח", text: "סליקה בעמוד מאובטח של חברת האשראי" },
            { icon: <HeartIcon />, title: "שירות שכונתי", text: "יחס אישי ומחירים הוגנים" },
          ].map((b) => (
            <li key={b.title} className="flex flex-col items-center gap-2 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-teal-soft text-teal">{b.icon}</span>
              <h3 className="text-base">{b.title}</h3>
              <p className="text-sm text-ink-soft">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {fresh.items.length > 0 && (
        <Section title="חדש בחנות" href="/search?sort=new">
          <ProductGrid products={fresh.items} />
        </Section>
      )}

      {featured.items.length > 0 && (
        <Section title="המומלצים שלנו">
          <ProductGrid products={featured.items} />
        </Section>
      )}

      {home.items.length > 0 && (
        <Section title="לבית ולמטבח" href="/c/housewares">
          <ProductGrid products={home.items} />
        </Section>
      )}

      {party.items.length > 0 && (
        <Section title="מסיבות ואירוח" href="/c/hosting">
          <ProductGrid products={party.items} />
        </Section>
      )}

      {bedding.items.length > 0 && (
        <Section title="מצעים וטקסטיל" href="/c/bedding">
          <ProductGrid products={bedding.items} />
        </Section>
      )}

      {/* Pickup & shipping */}
      <Section title="איסוף עצמי ומשלוחים">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg"><StoreIcon className="size-6 text-teal" /> איסוף עצמי מהחנות</h3>
            <p className="text-ink-soft">{settings.addressLine}</p>
            {settings.openingHours && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{settings.openingHours}</p>}
            {pickup?.description && <p className="mt-2 text-sm">{pickup.description}</p>}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg"><TruckIcon className="size-6 text-teal" /> משלוח עד הבית</h3>
            {delivery.length > 0 ? (
              <ul className="space-y-1 text-ink-soft">
                {delivery.map((d) => (
                  <li key={d.id}>
                    {d.name}: {d.price === 0 ? "חינם" : formatPrice(d.price)}
                    {d.etaText && ` · ${d.etaText}`}
                    {d.freeShippingThreshold != null && ` · חינם מעל ${formatPrice(d.freeShippingThreshold)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">משלוחים לכל הארץ – פרטים יעודכנו בקרוב.</p>
            )}
            <Link href="/pages/shipping" className="mt-3 inline-block text-sm font-semibold text-teal hover:underline">מדיניות משלוחים ‹</Link>
          </div>
        </div>
      </Section>
    </>
  );
}
