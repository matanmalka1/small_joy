import { db } from "@/lib/db";
import { toShekelInput } from "@/lib/money";
import { deleteShippingMethodAction, saveShippingMethodAction } from "@/actions/admin/operations";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, ACheckbox, AInput, ASelect, ATextarea, ConfirmButton } from "@/components/admin/form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "משלוחים" };

type M = Awaited<ReturnType<typeof db.shippingMethod.findMany>>[number];

function MethodFields({ m }: { m?: M }) {
  return (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <AInput label="שם השיטה" name="name" required defaultValue={m?.name} />
        <ASelect label="סוג" name="type" defaultValue={m?.type ?? "DELIVERY"}>
          <option value="DELIVERY">משלוח</option>
          <option value="PICKUP">איסוף עצמי</option>
        </ASelect>
        <AInput label="מחיר (₪)" name="price" inputMode="decimal" dir="ltr" defaultValue={toShekelInput(m?.price)} hint="0 = חינם. ריק = לא הוגדר (השיטה לא תוצג)" />
        <AInput label="משלוח חינם מעל (₪)" name="freeShippingThreshold" inputMode="decimal" dir="ltr" defaultValue={toShekelInput(m?.freeShippingThreshold)} hint="ריק = ללא" />
        <AInput label="זמן אספקה משוער" name="etaText" defaultValue={m?.etaText ?? ""} placeholder="לדוגמה: 3–5 ימי עסקים" />
        <AInput label="סדר תצוגה" name="sortOrder" type="number" min={0} defaultValue={m?.sortOrder ?? 0} />
      </div>
      <AInput label="תיאור ללקוח" name="description" defaultValue={m?.description ?? ""} />
      <ATextarea label="אזורי חלוקה – ערים (מופרדות בפסיק או שורה)" name="zones" rows={2} defaultValue={m?.zones.join(", ")} hint="ריק = כל הארץ" />
      <ACheckbox name="isActive" label="פעילה (מוצגת בקופה)" defaultChecked={m?.isActive ?? false} className="flex" />
    </>
  );
}

export default async function ShippingPage() {
  const methods = await db.shippingMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const unconfigured = methods.some((m) => m.type === "DELIVERY" && (m.price == null || !m.isActive));
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="משלוחים ואיסוף עצמי" description="המחירים וזמני האספקה נקבעים כאן בלבד – אין ערכים קבועים בקוד." />
      {unconfigured && <Alert tone="warning" title="משלוח עד הבית טרם הוגדר">יש לקבוע מחיר, זמן אספקה ולהפעיל את השיטה כדי שלקוחות יוכלו לבחור משלוח.</Alert>}
      {methods.map((m) => (
        <Panel
          key={m.id}
          title={m.name}
          actions={
            <div className="flex items-center gap-2">
              {m.isActive ? <Badge tone="success">פעילה</Badge> : <Badge>כבויה</Badge>}
              <form action={deleteShippingMethodAction}>
                <input type="hidden" name="id" value={m.id} />
                <ConfirmButton message="למחוק את שיטת המשלוח?" className="text-sm text-danger underline">מחיקה</ConfirmButton>
              </form>
            </div>
          }
        >
          <AdminForm action={saveShippingMethodAction}><MethodFields m={m} /></AdminForm>
        </Panel>
      ))}
      <Panel title="שיטה חדשה">
        <AdminForm action={saveShippingMethodAction} submitLabel="הוספה" resetOnSuccess><MethodFields /></AdminForm>
      </Panel>
    </div>
  );
}
