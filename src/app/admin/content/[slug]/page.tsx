import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveContentPageAction } from "@/actions/admin/operations";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, ACheckbox, AInput, ATextarea } from "@/components/admin/form";

export const metadata = { title: "עריכת עמוד" };

export default async function EditContentPage(props: PageProps<"/admin/content/[slug]">) {
  const { slug } = await props.params;
  const page = await db.contentPage.findUnique({ where: { slug } });
  if (!page) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={page.title} description={<Link href={`/pages/${page.slug}`} target="_blank" className="text-teal underline">צפייה באתר ↗</Link>} />
      <Panel>
        <AdminForm action={saveContentPageAction}>
          <input type="hidden" name="slug" value={page.slug} />
          <AInput label="כותרת" name="title" required defaultValue={page.title} />
          <ATextarea label="תוכן" name="body" rows={18} defaultValue={page.body} hint="פסקאות מופרדות בשורה ריקה. כותרת: שורה שמתחילה ב־## . רשימה: שורות שמתחילות ב־- ." />
          <ACheckbox name="approved" label="התוכן נבדק ואושר לפרסום (הסרת סימון הטיוטה)" defaultChecked={!page.isDraft} className="flex" />
        </AdminForm>
      </Panel>
    </div>
  );
}
