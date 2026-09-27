import type { Metadata } from "next";
import { getStoreSettings } from "@/server/settings/store-settings";
import { ContactForm } from "@/components/store/contact-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "צור קשר", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getStoreSettings();
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "דף הבית", href: "/" }, { label: "צור קשר" }]} />
      <h1 className="my-5 text-3xl">צור קשר</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-2xl border border-line bg-surface p-5 md:p-8"><ContactForm /></div>
        <aside className="space-y-3 rounded-2xl bg-blush p-6">
          <h2 className="text-lg">{s.storeName}</h2>
          <p>{s.addressLine}</p>
          {s.phone && <p>טלפון: <a className="ltr-nums text-teal hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
          {s.whatsapp && <p>וואטסאפ: <a className="ltr-nums text-teal hover:underline" href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}>{s.whatsapp}</a></p>}
          {s.email && <p>דוא״ל: <a className="text-teal hover:underline" href={`mailto:${s.email}`}>{s.email}</a></p>}
          {s.openingHours && <div><h3 className="font-bold">שעות פתיחה</h3><p className="whitespace-pre-line">{s.openingHours}</p></div>}
        </aside>
      </div>
    </div>
  );
}
