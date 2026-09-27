import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { paymentsAreSandbox } from "@/server/payments/providers";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/toast";
import { logoutAction } from "@/actions/auth";

export const metadata: Metadata = { title: { default: "ניהול", template: "%s | ניהול שמחות קטנות" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [newOrders, messages, attention] = await Promise.all([
    db.order.count({ where: { status: "PAID" } }),
    db.contactMessage.count({ where: { isHandled: false } }),
    db.order.count({ where: { needsAttention: true } }),
  ]);
  const sandbox = paymentsAreSandbox();
  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">דילוג לתוכן</a>
      {sandbox && (
        <p role="status" className="bg-warning-soft px-4 py-2 text-center text-sm font-bold text-warning">
          סליקה במצב בדיקה (Sandbox) – האתר אינו מקבל תשלומים אמיתיים עד לחיבור ספק סליקה.
        </p>
      )}
      <header className="border-b border-line bg-surface">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <Link href="/admin" className="font-extrabold">שמחות קטנות · ניהול</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-soft sm:inline">{admin.email}</span>
            <Link href="/" className="text-teal hover:underline">לחנות</Link>
            <form action={logoutAction}><button className="text-danger hover:underline">התנתקות</button></form>
          </div>
        </div>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-[13rem_1fr] lg:gap-6">
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <AdminNav badges={{ "/admin/orders": newOrders + attention, "/admin/messages": messages }} />
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
