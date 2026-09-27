import Link from "next/link";
import { listCustomers } from "@/server/admin/queries";
import { firstValues } from "@/lib/validation/listing";
import { formatPrice } from "@/lib/money";
import { FilterBar, PageHeader, Table, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "לקוחות" };

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const sp = firstValues(await props.searchParams);
  const c = await listCustomers({ q: sp.q, page: Number(sp.page) || 1 });
  return (
    <div>
      <PageHeader title="לקוחות רשומים" description={`${c.total} לקוחות. רכישות אורח מופיעות בהזמנות.`} />
      <FilterBar action="/admin/customers">
        <label className="sr-only" htmlFor="cq">חיפוש</label>
        <input id="cq" name="q" defaultValue={sp.q} placeholder="שם, דוא״ל או טלפון" className={filterInput} />
      </FilterBar>
      <Table>
        <thead><tr><th>שם</th><th>דוא״ל</th><th>טלפון</th><th>הזמנות</th><th>סך רכישות</th><th>הצטרף</th></tr></thead>
        <tbody>
          {c.rows.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/admin/customers/${u.id}`} className="font-semibold text-teal hover:underline">{u.name}</Link></td>
              <td>{u.email}</td>
              <td className="ltr-nums">{u.profile?.phone ?? "—"}</td>
              <td>{u.orderCount}</td>
              <td>{formatPrice(u.totalSpent)}</td>
              <td className="text-xs">{u.createdAt.toLocaleDateString("he-IL")}</td>
            </tr>
          ))}
          {c.rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-ink-soft">לא נמצאו לקוחות</td></tr>}
        </tbody>
      </Table>
      <Pagination page={c.page} totalPages={c.totalPages} basePath="/admin/customers" params={sp} />
    </div>
  );
}
