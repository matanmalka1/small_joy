"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyCouponAction, removeCouponAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";

export function CouponForm({ code, message }: { code: string | null; message: string | null }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (code) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span>קופון: <strong className="ltr-nums">{code}</strong></span>
          <button type="button" disabled={pending} className="text-ink-soft underline hover:text-danger" onClick={() => start(async () => { await removeCouponAction(); router.refresh(); })}>
            הסרה
          </button>
        </div>
        {message && <p className="text-danger" role="alert">{message}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await applyCouponAction({ code: value });
          if (res.ok) {
            setError(null);
            setValue("");
            router.refresh();
          } else setError(res.error);
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm font-semibold">קוד קופון</label>
      <div className="flex gap-2">
        <input id="coupon" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" className={inputClass} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? "coupon-error" : undefined} />
        <Button type="submit" variant="outline" disabled={pending || !value.trim()}>החלה</Button>
      </div>
      {error && <p id="coupon-error" className="text-sm text-danger" role="alert">{error}</p>}
    </form>
  );
}
