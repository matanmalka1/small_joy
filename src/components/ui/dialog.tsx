"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Accessible modal built on native <dialog>: focus trapping, Esc to close and
 * inert background come from the browser. `side` turns it into a drawer.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  side,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: "start" | "end";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cn(
        "m-auto max-h-[90dvh] w-[min(34rem,calc(100%-2rem))] rounded-2xl bg-surface p-0 text-ink shadow-[var(--shadow-pop)]",
        side && "m-0 h-dvh max-h-dvh w-[min(24rem,88vw)] rounded-none",
        side === "start" && "ms-0 me-auto",
        side === "end" && "ms-auto me-0",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-sand" aria-label="סגירה">
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
      </div>
      <div className="overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
