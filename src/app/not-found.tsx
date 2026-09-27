import Link from "next/link";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-7xl font-extrabold text-brand">404</p>
      <h1 className="text-3xl">אופס, העמוד לא נמצא</h1>
      <p className="max-w-md text-ink-soft">ייתכן שהקישור שגוי או שהמוצר הוסר מהחנות. אפשר לחפש מוצר או לחזור לדף הבית.</p>
      <form action="/search" role="search" className="flex w-full max-w-sm gap-2">
        <label htmlFor="q404" className="sr-only">חיפוש</label>
        <input id="q404" name="q" type="search" placeholder="חיפוש מוצר" className="h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
        <button className="h-11 rounded-xl bg-teal px-4 font-semibold text-white">חיפוש</button>
      </form>
      <LinkButton href="/">לדף הבית</LinkButton>
      <Link href="/contact" className="text-sm text-teal hover:underline">צריכים עזרה? צרו קשר</Link>
    </main>
  );
}
