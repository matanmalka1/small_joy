import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "עמודי תוכן" };

export default async function ContentListPage() {
  const pages = await db.contentPage.findMany({ orderBy: { title: "asc" } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="עמודי תוכן ומסמכים" description="מסמכים משפטיים (תקנון, פרטיות, החזרות) דורשים בדיקת עורך דין לפני אישור." />
      <Table>
        <thead><tr><th>עמוד</th><th>סטטוס</th><th>עודכן</th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/content/${p.slug}`} className="font-semibold text-teal hover:underline">{p.title}</Link></td>
              <td>{p.isDraft ? <Badge tone="warning">טיוטה – טעון אישור</Badge> : <Badge tone="success">מאושר</Badge>}</td>
              <td className="text-xs">{p.updatedAt.toLocaleDateString("he-IL")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
