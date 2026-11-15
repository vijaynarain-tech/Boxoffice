import type { ReactNode } from "react";
import { sourceName } from "../data";

export const C = {
  ram: "#F5B942",
  ram2: "#E76F35",
  godz: "#3B82F6",
  godz2: "#22D3EE",
  up: "#22C55E",
  down: "#EF4444",
  mute: "#94A3B8",
  grid: "#1d2940",
  fg: "#F8FAFC",
  scen: ["#94A3B8", "#F5B942", "#E76F35", "#22D3EE"],
};

export const axis = { stroke: C.grid, tick: { fill: C.mute, fontSize: 11 }, tickLine: false } as const;

/** Tooltip that always shows the exact figure, date, source and status of a point. */
export function RichTooltip({ active, payload, label, fmt, labelFmt }: { active?: boolean; payload?: any[]; label?: any; fmt: (v: number, key: string) => string | null; labelFmt?: (l: any, p: any) => ReactNode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[260px] rounded-xl border border-line bg-ink/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      <div className="mb-1.5 font-semibold text-fg">{labelFmt ? labelFmt(label, row) : label}</div>
      {payload.filter((p) => p.value !== null && p.value !== undefined).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-mute">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="num text-fg">{fmt(p.value, p.dataKey)}</span>
        </div>
      ))}
      {(row.source || row.status) && (
        <div className="mt-1.5 border-t border-line pt-1.5 text-mute">
          {row.source && <div>Source: {sourceName(row.source)}</div>}
          {row.status && <div>Status: {row.status}</div>}
          {row.note && <div className="mt-1 leading-snug">{row.note}</div>}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color, height: i.dashed ? 2 : 3 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
