import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/account", label: "הפרטים שלי" },
  { href: "/account/orders", label: "ההזמנות שלי" },
  { href: "/account/addresses", label: "כתובות שמורות" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl">שלום, {user.name}</h1>
      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <nav aria-label="אזור אישי" className="h-fit rounded-2xl border border-line bg-surface p-2">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-sand">{n.label}</Link>
              </li>
            ))}
            {user.role === "ADMIN" && (
              <li><Link href="/admin" className="block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-teal hover:bg-sand">ממשק ניהול</Link></li>
            )}
            <li>
              <form action={logoutAction}>
                <button className="w-full whitespace-nowrap rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-danger hover:bg-sand">התנתקות</button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
