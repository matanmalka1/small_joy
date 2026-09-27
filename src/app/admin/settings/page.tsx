import { getStoreSettings } from "@/server/settings/store-settings";
import { saveSettingsAction } from "@/actions/admin/operations";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AdminForm, AInput, ATextarea } from "@/components/admin/form";

export const metadata = { title: "הגדרות החנות" };

export default async function SettingsPage() {
  const s = await getStoreSettings();
  return (
    <div className="max-w-3xl">
      <PageHeader title="הגדרות החנות" description="פרטים אלה מוצגים באתר (כותרת תחתונה, צור קשר, איסוף עצמי). שדה ריק לא יוצג." />
      <Panel>
        <AdminForm action={saveSettingsAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AInput label="שם החנות" name="storeName" required defaultValue={s.storeName} />
            <AInput label="כתובת" name="addressLine" required defaultValue={s.addressLine} />
            <AInput label="טלפון" name="phone" type="tel" dir="ltr" defaultValue={s.phone ?? ""} />
            <AInput label="וואטסאפ" name="whatsapp" type="tel" dir="ltr" defaultValue={s.whatsapp ?? ""} />
            <AInput label="דוא״ל" name="email" type="email" dir="ltr" defaultValue={s.email ?? ""} />
            <AInput label="מספר עוסק / ח.פ." name="businessId" dir="ltr" defaultValue={s.businessId ?? ""} />
          </div>
          <ATextarea label="שעות פתיחה" name="openingHours" rows={3} defaultValue={s.openingHours ?? ""} placeholder={"א׳–ה׳: ...\nו׳: ..."} />
          <ATextarea label="הנחיות לאיסוף עצמי" name="pickupInstructions" rows={2} defaultValue={s.pickupInstructions ?? ""} />
          <AInput label="הודעה בראש האתר" name="announcement" defaultValue={s.announcement ?? ""} hint="לדוגמה: משלוח חינם בהזמנה מעל... (ריק = ללא)" maxLength={140} />
          <AInput label="סף ברירת מחדל למלאי נמוך" name="lowStockDefault" type="number" min={0} defaultValue={s.lowStockDefault} />
        </AdminForm>
      </Panel>
    </div>
  );
}
