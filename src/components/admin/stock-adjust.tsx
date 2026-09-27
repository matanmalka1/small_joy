"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adjustStockAction } from "@/actions/admin/operations";
import { toast } from "@/components/ui/toast";
import { inputClass } from "@/components/ui/field";

/** Inline "set stock to" control for one variant. */
export function StockAdjust({ variantId, current, label }: { variantId: string; current: number; label: string }) {
  const [state, action, pending] = useActionState(adjustStockAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "עודכן");
      router.refresh();
    } else if (state?.error) toast(state.error, "error");
  }, [state, router]);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <label className="sr-only" htmlFor={`q-${variantId}`}>כמות חדשה – {label}</label>
      <input id={`q-${variantId}`} name="quantity" type="number" min={0} defaultValue={current} className={`${inputClass} h-9 w-20 text-sm`} dir="ltr" />
      <label className="sr-only" htmlFor={`n-${variantId}`}>סיבה</label>
      <input id={`n-${variantId}`} name="note" placeholder="סיבה (לא חובה)" className={`${inputClass} h-9 w-36 text-sm`} />
      <button disabled={pending} className="h-9 rounded-lg bg-teal px-3 text-sm font-semibold text-white disabled:opacity-50">עדכון</button>
    </form>
  );
}
