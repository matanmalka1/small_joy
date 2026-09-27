import Link from "next/link";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-line bg-surface p-4 md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-4";
  return href ? <Link href={href} className={cn(cls, "hover:border-teal")}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Horizontally scrollable table wrapper for mobile. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-start [&_th]:font-semibold [&_thead]:bg-sand [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-canvas">
        {children}
      </table>
    </div>
  );
}

export function FilterBar({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3">
      {children}
      <button className="h-11 rounded-xl bg-teal px-4 font-semibold text-white">סינון</button>
      <Link href={action} className="grid h-11 place-items-center px-2 text-sm text-ink-soft underline">ניקוי</Link>
    </form>
  );
}

export const filterInput = "h-11 rounded-xl border border-line bg-surface px-3 text-sm focus:border-teal focus:outline-none";
