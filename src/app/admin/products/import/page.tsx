import { CSV_COLUMNS } from "@/server/admin/csv";
import { PageHeader, Panel } from "@/components/admin/ui";
import { CsvImport } from "@/components/admin/csv-import";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "ייבוא וייצוא מוצרים" };

const DOCS: Record<string, string> = {
  sku: "מק״ט ייחודי לכל וריאציה (חובה). קיים = עדכון, חדש = יצירה",
  product_slug: "מזהה המוצר ב־URL (אנגלית). שורות עם אותו ערך שייכות לאותו מוצר",
  product_name: "שם המוצר",
  description: "תיאור",
  kind: "GENERAL / BEDDING / DISPOSABLE / HOUSEWARE",
  status: "DRAFT / ACTIVE / ARCHIVED (ברירת מחדל למוצר חדש: DRAFT)",
  featured: "1 = מומלץ",
  categories: "מזהי קטגוריות מופרדים ב־| (למשל bedding|textile)",
  options: "מאפיינים: מידה=זוגי; צבע=לבן",
  price: "מחיר בש״ח (למשל 49.90)",
  sale_price: "מחיר מבצע (ריק = ללא)",
  stock: "כמות במלאי",
  low_stock_threshold: "סף התראת מלאי נמוך",
  image_url: "קישור https לתמונה (לא חובה)",
};

export default function ImportPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="ייבוא וייצוא מוצרים (CSV)" actions={<LinkButton href="/admin/products/export" variant="outline" size="sm" prefetch={false}>ייצוא כל המוצרים ל־CSV</LinkButton>} />
      <Panel title="ייבוא">
        <CsvImport />
      </Panel>
      <Panel title="מבנה הקובץ">
        <p className="mb-3 text-sm text-ink-soft">שורה לכל וריאציה. מומלץ להתחיל מקובץ הייצוא ולערוך אותו ב־Excel / Google Sheets (לשמור כ־CSV UTF-8).</p>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
          {CSV_COLUMNS.map((c) => (
            <div key={c} className="contents">
              <dt className="font-mono text-xs ltr-nums">{c}</dt>
              <dd className="text-ink-soft">{DOCS[c]}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
