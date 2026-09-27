import Link from "next/link";
import { getCategoryTree } from "@/server/catalog/queries";
import { getStoreSettings } from "@/server/settings/store-settings";
import { CONTENT_PAGES } from "@/server/content/pages";
import { Logo } from "./logo";

export async function Footer() {
  const [categories, settings] = await Promise.all([getCategoryTree(), getStoreSettings()]);
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-ink-soft">כלי בית, מצעים, חד־פעמי ומוצרי אירוח ומסיבות – בחנות השכונתית שלכם ובאתר.</p>
        </div>
        <nav aria-labelledby="f-cats">
          <h2 id="f-cats" className="mb-3 text-base">קטגוריות</h2>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/c/${c.slug}`} className="text-ink-soft hover:text-teal hover:underline">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="f-info">
          <h2 id="f-info" className="mb-3 text-base">מידע ושירות</h2>
          <ul className="space-y-2 text-sm">
            {CONTENT_PAGES.map((p) => (
              <li key={p.slug}><Link href={`/pages/${p.slug}`} className="text-ink-soft hover:text-teal hover:underline">{p.title}</Link></li>
            ))}
            <li><Link href="/contact" className="text-ink-soft hover:text-teal hover:underline">צור קשר</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 text-base">החנות</h2>
          <address className="space-y-2 text-sm not-italic text-ink-soft">
            <p>{settings.addressLine}</p>
            {settings.phone && <p>טלפון: <a href={`tel:${settings.phone}`} className="ltr-nums hover:text-teal">{settings.phone}</a></p>}
            {settings.email && <p>דוא״ל: <a href={`mailto:${settings.email}`} className="hover:text-teal">{settings.email}</a></p>}
            {settings.openingHours && <p className="whitespace-pre-line">{settings.openingHours}</p>}
          </address>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-4 text-center text-xs text-ink-soft">
          © {new Date().getFullYear()} {settings.storeName}. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
