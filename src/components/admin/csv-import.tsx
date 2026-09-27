"use client";

import { useActionState, useRef, useState } from "react";
import { importCsvAction } from "@/actions/admin/products";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function CsvImport() {
  const [state, action] = useActionState(importCsvAction, null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const r = state?.report;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="csv" className="mb-1.5 block text-sm font-semibold">קובץ CSV (UTF-8)</label>
        <input ref={inputRef} id="csv" name="file" type="file" accept=".csv,text/csv" required onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} className="block text-sm" />
      </div>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {r && (
        <Alert tone={r.errors ? "danger" : r.applied ? "success" : "info"} title={r.applied ? "הייבוא הושלם" : r.errors ? "נמצאו שגיאות – דבר לא נשמר" : "בדיקה הושלמה – ניתן לייבא"}>
          {r.created} חדשים · {r.updated} עדכונים · {r.errors} שגיאות
        </Alert>
      )}
      {r && r.rows.some((x) => x.action === "error") && (
        <ul className="max-h-64 space-y-1 overflow-auto rounded-xl border border-line bg-surface p-3 text-sm">
          {r.rows.filter((x) => x.action === "error").map((x) => (
            <li key={x.line}>שורה {x.line} {x.sku && <span className="ltr-nums">({x.sku})</span>}: <span className="text-danger">{x.message}</span></li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="mode" value="dry" variant="outline" pendingText="בודק...">בדיקה בלבד (ללא שמירה)</SubmitButton>
        <SubmitButton name="mode" value="apply" pendingText="מייבא..." disabled={!fileName}>ייבוא ושמירה</SubmitButton>
      </div>
      <p className="text-xs text-ink-soft">הייבוא הוא ״הכל או כלום״: אם יש שגיאה באחת השורות, שום שינוי לא נשמר.</p>
    </form>
  );
}
