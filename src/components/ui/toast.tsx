"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
type Listener = (t: Toast) => void;

const listeners = new Set<Listener>();
let seq = 0;

/** Fire-and-forget toast from any client component. */
export function toast(message: string, tone: Toast["tone"] = "success") {
  const t = { id: ++seq, message, tone };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast: Listener = (t) => {
      setItems((cur) => [...cur.slice(-2), t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow-pop)]",
            t.tone === "success" && "bg-ink text-white",
            t.tone === "error" && "bg-danger text-white",
            t.tone === "info" && "bg-teal text-white",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
