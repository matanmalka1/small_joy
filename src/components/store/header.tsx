import Link from "next/link";
import { getCategoryTree } from "@/server/catalog/queries";
import { getStoreSettings } from "@/server/settings/store-settings";
import { cartItemCount } from "@/server/cart/cart";
import { currentCartIdentity } from "@/server/cart/session";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { BagIcon, SearchIcon, UserIcon } from "./icons";

export async function Header() {
  const [categories, settings, identity] = await Promise.all([getCategoryTree(), getStoreSettings(), currentCartIdentity()]);
  const count = await cartItemCount(identity);
  const isLoggedIn = Boolean(identity.userId);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      {settings.announcement && (
        <p className="bg-teal px-4 py-1.5 text-center text-sm font-medium text-white">{settings.announcement}</p>
      )}
      <div className="container-page flex h-16 items-center gap-2 md:h-18 md:gap-4">
        <MobileNav categories={categories} isLoggedIn={isLoggedIn} />
        <Logo />
        <form action="/search" role="search" className="mx-auto hidden w-full max-w-md md:block">
          <label htmlFor="q-desktop" className="sr-only">חיפוש מוצרים</label>
          <div className="relative">
            <input
              id="q-desktop"
              name="q"
              type="search"
              placeholder="מה מחפשים היום?"
              className="h-11 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-base focus:border-teal focus:outline-none"
            />
            <button type="submit" className="absolute inset-y-0 start-0 grid w-11 place-items-center text-ink-soft" aria-label="חיפוש">
              <SearchIcon />
            </button>
          </div>
        </form>
        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <Link href="/search" className="grid size-11 place-items-center rounded-xl hover:bg-sand md:hidden" aria-label="חיפוש">
            <SearchIcon className="size-6" />
          </Link>
          <Link
            href={isLoggedIn ? "/account" : "/account/login"}
            className="grid size-11 place-items-center rounded-xl hover:bg-sand"
            aria-label={isLoggedIn ? "האזור האישי" : "התחברות"}
          >
            <UserIcon />
          </Link>
          <Link href="/cart" className="relative grid size-11 place-items-center rounded-xl hover:bg-sand" aria-label={`סל הקניות, ${count} פריטים`}>
            <BagIcon />
            {count > 0 && (
              <span aria-hidden="true" className="absolute -top-0.5 -end-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-5 text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
      <nav aria-label="קטגוריות ראשיות" className="hidden border-t border-line lg:block">
        <ul className="container-page flex h-12 items-center gap-1 overflow-x-auto text-sm font-semibold">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="block whitespace-nowrap rounded-lg px-3 py-2 hover:bg-sand hover:text-teal">
                {c.name}
              </Link>
            </li>
          ))}
          <li className="ms-auto">
            <Link href="/sale" className="block rounded-lg px-3 py-2 text-brand-hover hover:bg-brand-soft">מבצעים</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
