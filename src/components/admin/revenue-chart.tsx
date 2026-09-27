"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/money";

type Point = { key: string; label: string; revenue: number; orders: number };

/** Round a max value up to a "nice" axis number. */
function niceMax(v: number) {
  if (v <= 0) return 10000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Single-series daily revenue columns (brand coral, validated for chroma and
 * contrast). Hover/focus tooltip per column; table view for screen readers.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { top: 12, bottom: 28, start: 64, end: 8 };
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const plotW = W - pad.start - pad.end;
  const plotH = H - pad.top - pad.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(16, slot - 2);
  const ticks = [0, max / 2, max];
  // RTL: newest day on the left edge reads naturally right-to-left in time order.
  const x = (i: number) => pad.start + (data.length - 1 - i) * slot + (slot - barW) / 2;
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const hovered = active != null ? data[active] : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="הכנסות יומיות ב־30 הימים האחרונים">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.start} x2={W - pad.end} y1={y(t)} y2={y(t)} stroke="#ece5da" strokeWidth={1} />
              <text x={pad.start - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5d5a66" direction="ltr">
                ₪{(t / 100).toLocaleString("he-IL")}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = Math.max(0, y(0) - y(d.revenue));
            const r = Math.min(4, h);
            const bx = x(i);
            const top = y(d.revenue);
            return (
              <g key={d.key}>
                {h > 0 && (
                  <path
                    d={`M${bx},${y(0)} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + barW - r} Q${bx + barW},${top} ${bx + barW},${top + r} V${y(0)} Z`}
                    fill="#c4452f"
                    opacity={active == null || active === i ? 1 : 0.45}
                  />
                )}
                {/* Hit target: the full column slot, larger than the mark. */}
                <rect
                  x={pad.start + (data.length - 1 - i) * slot}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${formatPrice(d.revenue)}, ${d.orders} הזמנות`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                {(data.length - 1 - i) % 7 === 0 && (
                  <text x={bx + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5d5a66">{d.label}</text>
                )}
              </g>
            );
          })}
          <line x1={pad.start} x2={W - pad.end} y1={y(0)} y2={y(0)} stroke="#d8cfc2" strokeWidth={1} />
        </svg>
        {hovered && active != null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-[var(--shadow-pop)]"
            style={{ left: `${((x(active) + barW / 2) / W) * 100}%`, transform: "translateX(-50%)" }}
          >
            <p className="font-bold">{hovered.label}</p>
            <p>{formatPrice(hovered.revenue)} · {hovered.orders} הזמנות</p>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">הצגה כטבלה</summary>
        <table className="mt-2 w-full text-sm">
          <thead><tr><th className="text-start">יום</th><th className="text-start">הכנסות</th><th className="text-start">הזמנות</th></tr></thead>
          <tbody>
            {data.filter((d) => d.orders > 0).map((d) => (
              <tr key={d.key}><td>{d.label}</td><td>{formatPrice(d.revenue)}</td><td>{d.orders}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
