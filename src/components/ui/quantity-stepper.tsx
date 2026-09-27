"use client";

import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  name,
  label = "כמות",
  disabled,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  name?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const clamp = (v: number) => Math.max(min, max != null ? Math.min(max, v) : v);
  const btn = "grid size-10 place-items-center text-xl font-bold hover:bg-sand disabled:opacity-40";
  return (
    <div className={cn("inline-flex h-11 items-center overflow-hidden rounded-xl border border-line bg-surface", className)}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={disabled || (max != null && value >= max)} aria-label="הגדלת כמות">
        +
      </button>
      <input
        type="number"
        inputMode="numeric"
        name={name}
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        className="h-full w-12 border-x border-line bg-transparent text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="הקטנת כמות">
        −
      </button>
    </div>
  );
}
