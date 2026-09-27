import { db } from "@/lib/db";
import { toggleMessageHandledAction } from "@/actions/admin/operations";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "פניות" };

export default async function MessagesPage() {
  const messages = await db.contactMessage.findMany({ orderBy: [{ isHandled: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div className="max-w-3xl">
      <PageHeader title="פניות מטופס צור קשר" />
      {messages.length === 0 ? <EmptyState title="אין פניות" /> : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-2xl border border-line bg-surface p-4 ${m.isHandled ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{m.name} <span className="text-sm font-normal text-ink-soft">· {m.createdAt.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</span></p>
                {m.isHandled ? <Badge tone="success">טופל</Badge> : <Badge tone="warning">חדש</Badge>}
              </div>
              <p className="text-sm"><a href={`mailto:${m.email}`} className="text-teal underline">{m.email}</a>{m.phone && <> · <a href={`tel:${m.phone}`} className="text-teal underline ltr-nums">{m.phone}</a></>}</p>
              <p className="mt-2 whitespace-pre-line">{m.message}</p>
              <form action={toggleMessageHandledAction} className="mt-2">
                <input type="hidden" name="id" value={m.id} />
                <button className="text-sm text-teal underline">{m.isHandled ? "סימון כלא טופל" : "סימון כטופל"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
