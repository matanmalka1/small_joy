"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "לוח בקרה", exact: true },
  { href: "/admin/orders", label: "הזמנות" },
  { href: "/admin/products", label: "מוצרים" },
  { href: "/admin/categories", label: "קטגוריות" },
  { href: "/admin/inventory", label: "מלאי" },
  { href: "/admin/coupons", label: "קופונים" },
  { href: "/admin/promotions", label: "מבצעים" },
  { href: "/admin/customers", label: "לקוחות" },
  { href: "/admin/shipping", label: "משלוחים" },
  { href: "/admin/content", label: "עמודי תוכן" },
  { href: "/admin/messages", label: "פניות" },
  { href: "/admin/settings", label: "הגדרות החנות" },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ניהול">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold",
                  active ? "bg-ink text-white" : "text-ink hover:bg-sand",
                )}
              >
                {n.label}
                {badges[n.href] ? (
                  <span className="rounded-full bg-brand px-2 text-xs text-white">{badges[n.href]}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
