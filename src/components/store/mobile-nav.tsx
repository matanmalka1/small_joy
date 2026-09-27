"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { MenuIcon } from "./icons";

type Cat = { slug: string; name: string; children: { slug: string; name: string }[] };

export function MobileNav({ categories, isLoggedIn }: { categories: Cat[]; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-xl hover:bg-sand lg:hidden"
        aria-label="פתיחת תפריט"
        aria-expanded={open}
      >
        <MenuIcon />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="תפריט" side="start">
        <nav
          aria-label="קטגוריות"
          onClick={(e) => {
            // Close after choosing a link.
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <ul className="space-y-1">
            <li>
              <Link href="/sale" className="block rounded-lg px-3 py-2.5 font-bold text-brand-hover hover:bg-sand">
                מבצעים
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-sand">
                  {c.name}
                </Link>
                {c.children.length > 0 && (
                  <ul className="ms-4 border-s border-line ps-2">
                    {c.children.map((ch) => (
                      <li key={ch.slug}>
                        <Link href={`/c/${ch.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                          {ch.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <hr className="my-4 border-line" />
          <ul className="space-y-1 text-sm">
            <li><Link href={isLoggedIn ? "/account" : "/account/login"} className="block rounded-lg px-3 py-2 hover:bg-sand">{isLoggedIn ? "האזור האישי" : "התחברות / הרשמה"}</Link></li>
            <li><Link href="/pages/shipping" className="block rounded-lg px-3 py-2 hover:bg-sand">משלוחים ואיסוף</Link></li>
            <li><Link href="/contact" className="block rounded-lg px-3 py-2 hover:bg-sand">צור קשר</Link></li>
          </ul>
        </nav>
      </Dialog>
    </>
  );
}
