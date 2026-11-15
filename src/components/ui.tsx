import type { ReactNode } from "react";
import { ExternalLink, Info } from "lucide-react";
import { sourceById, sourceName } from "../data";

export function Section({ id, eyebrow, title, intro, children, right }: { id?: string; eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section id={id} className="rise flex flex-col gap-5 scroll-mt-32">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h2>
          {intro && <p className="mt-2 text-sm leading-relaxed text-mute">{intro}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "", title, sub, right }: { children: ReactNode; className?: string; title?: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
            {sub && <div className="mt-0.5 text-xs text-mute">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  final: "border-up/40 text-up",
  revised: "border-godz-2/40 text-godz-2",
  estimated: "border-ram/40 text-ram",
  live: "border-ram-2/50 text-ram-2",
  projection: "border-mute/40 text-mute hatch",
  reference: "border-mute/40 text-mute",
  derived: "border-godz/40 text-godz",
  unconfirmed: "border-down/40 text-down",
};
const STATUS_LABEL: Record<string, string> = { reference: "Unverified", derived: "Derived" };

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status] ?? "border-line text-mute"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function SourceTag({ id, url, compact }: { id: string | null | undefined; url?: string | null; compact?: boolean }) {
  if (!id) return <span className="text-xs text-mute">—</span>;
  const href = url ?? sourceById[id]?.url;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-mute underline decoration-line underline-offset-2 hover:text-fg" title={sourceById[id]?.reliability}>
      {sourceName(id)}
      {!compact && <ExternalLink size={11} aria-hidden />}
    </a>
  );
}

export function NotReported({ label = "Not reported" }: { label?: string }) {
  return <span className="text-sm italic text-mute/80">{label}</span>;
}

export function Stat({ label, value, sub, accent, status, source, url, big }: { label: string; value: string | null; sub?: ReactNode; accent?: "ram" | "godz"; status?: string | null; source?: string | null; url?: string | null; big?: boolean }) {
  const color = accent === "ram" ? "text-ram" : accent === "godz" ? "text-godz-2" : "text-fg";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="eyebrow">{label}</div>
      {value === null ? <NotReported /> : <div className={`num whitespace-nowrap ${big ? "text-2xl xl:text-[28px]" : "text-lg sm:text-xl"} font-semibold ${color}`}>{value}</div>}
      {(sub || status || source) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mute">
          {sub}
          {status && <StatusPill status={status} />}
          {source && <SourceTag id={source} url={url} compact />}
        </div>
      )}
    </div>
  );
}

export function Change({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className="text-mute">—</span>;
  return <span className={`num ${v >= 0 ? "text-up" : "text-down"}`}>{v > 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${tone === "warn" ? "border-ram/30 bg-ram/[0.06] text-ram/90" : "border-line bg-raised/50 text-mute"}`}>
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-ink p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? "bg-raised text-fg shadow" : "text-mute hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Coverage({ have, total, label }: { have: number; total: number; label: string }) {
  const p = total ? Math.round((have / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs text-mute">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-godz-2" style={{ width: `${p}%` }} />
      </div>
      <span>
        {label}: <span className="num text-fg">{have}</span> of {total} ({p}%)
      </span>
    </div>
  );
}
