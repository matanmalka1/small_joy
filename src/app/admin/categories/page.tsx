import Link from "next/link";
import { db } from "@/lib/db";
import { listCategoryOptions } from "@/server/admin/products";
import { moveCategoryAction, saveCategoryAction } from "@/actions/admin/catalog";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/form";
import { CategoryFields } from "@/components/admin/category-fields";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "קטגוריות" };

export default async function CategoriesPage(props: PageProps<"/admin/categories">) {
  const sp = await props.searchParams;
  const [cats, options] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
    listCategoryOptions(),
  ]);
  const roots = cats.filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId));
  const children = (id: string) => cats.filter((c) => c.parentId === id);

  const Row = ({ c, depth }: { c: (typeof cats)[number]; depth: number }) => (
    <li>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5" style={{ paddingInlineStart: `${0.75 + depth * 1.5}rem` }}>
        <Link href={`/admin/categories/${c.id}`} className="font-semibold hover:text-teal">{c.name}</Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">{c._count.products} מוצרים</span>
          {!c.isActive && <Badge tone="neutral">מוסתרת</Badge>}
          <form action={moveCategoryAction} className="flex">
            <input type="hidden" name="id" value={c.id} />
            <button name="dir" value="up" className="grid size-8 place-items-center rounded-lg hover:bg-sand" aria-label={`הזזת ${c.name} למעלה`}>▲</button>
            <button name="dir" value="down" className="grid size-8 place-items-center rounded-lg hover:bg-sand" aria-label={`הזזת ${c.name} למטה`}>▼</button>
          </form>
        </div>
      </div>
      {children(c.id).length > 0 && <ul>{children(c.id).map((ch) => <Row key={ch.id} c={ch} depth={depth + 1} />)}</ul>}
    </li>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <div>
        <PageHeader title="קטגוריות" description="הסדר כאן הוא סדר התצוגה בתפריט האתר" />
        {sp.deleted && <Alert tone="success" className="mb-4">הקטגוריה נמחקה.</Alert>}
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface [&>li:first-child>div]:border-t-0">
          {roots.map((c) => <Row key={c.id} c={c} depth={0} />)}
        </ul>
      </div>
      <Panel title="קטגוריה חדשה" className="h-fit">
        <AdminForm action={saveCategoryAction} submitLabel="יצירת קטגוריה" resetOnSuccess>
          <CategoryFields parents={options} />
        </AdminForm>
      </Panel>
    </div>
  );
}
