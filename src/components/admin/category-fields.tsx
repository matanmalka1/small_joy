import { ACheckbox, AInput, ASelect, ATextarea } from "./form";

type Cat = { id?: string; name?: string; slug?: string; description?: string | null; imageUrl?: string | null; parentId?: string | null; sortOrder?: number; isActive?: boolean };

export function CategoryFields({ cat = {}, parents }: { cat?: Cat; parents: { id: string; label: string }[] }) {
  return (
    <>
      {cat.id && <input type="hidden" name="id" value={cat.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <AInput label="שם הקטגוריה" name="name" required defaultValue={cat.name} />
        <AInput label="כתובת URL" name="slug" dir="ltr" defaultValue={cat.slug} hint="ריק = אוטומטי" />
        <ASelect label="קטגוריית אב" name="parentId" defaultValue={cat.parentId ?? ""}>
          <option value="">— ללא (קטגוריה ראשית) —</option>
          {parents.filter((p) => p.id !== cat.id).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </ASelect>
        <AInput label="סדר תצוגה" name="sortOrder" type="number" min={0} defaultValue={cat.sortOrder ?? 0} />
      </div>
      <ATextarea label="תיאור" name="description" rows={2} defaultValue={cat.description ?? ""} />
      <AInput label="קישור לתמונה" name="imageUrl" dir="ltr" defaultValue={cat.imageUrl ?? ""} hint="נתיב (/...) או קישור https לתמונה" />
      <ACheckbox name="isActive" label="פעילה (מוצגת באתר)" defaultChecked={cat.isActive ?? true} />
    </>
  );
}
