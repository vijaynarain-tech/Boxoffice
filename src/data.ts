import raw from "./generated/site-data.json";

export interface Obs {
  id: string;
  film: string;
  metric: string;
  territory: string;
  region?: string;
  city?: string;
  language?: string;
  format?: string;
  period: { type: string; date?: string; day?: number; asOf?: string | null; throughDay?: number | null; start?: string; end?: string; label?: string; showDate?: string; cutoff?: string };
  amount: number;
  unit: string;
  source: string;
  url?: string;
  retrievedAt: string;
  status: string;
  note?: string;
  theaters?: number;
  screens?: number;
}
type Raw = typeof raw;
export type Site = Omit<Raw, "observations" | "territories"> & { observations: Obs[]; territories: { film: string; territory: string; observations: Obs[] }[] };
export const site = raw as unknown as Site;

export const sourceById = Object.fromEntries(site.sources.map((s) => [s.id, s]));
export const sourceName = (id: string | null | undefined) => (id ? sourceById[id]?.name ?? id : "—");

export const ramMeta = site.films.focus.find((f) => f.id === "ramayana")!;
export const gzMeta = site.films.focus.find((f) => f.id === "godzilla")!;

/* ---------- formatting ---------- */
const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const cr = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? null : `₹${digits === 2 ? inr.format(v) : v.toLocaleString("en-IN", { maximumFractionDigits: digits })} Cr`;
export const usd = (v: number | null | undefined) => {
  if (v === null || v === undefined) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v).toLocaleString("en-US")}`;
  return `$${v.toFixed(0)}`;
};
export const jpy = (v: number | null | undefined) => (v === null || v === undefined ? null : v >= 1e8 ? `¥${(v / 1e9).toFixed(2)}B` : `¥${v.toLocaleString("ja-JP")}`);
export const money = (amount: number | null | undefined, unit: string) => (unit === "INR_CR" ? cr(amount) : unit === "USD" ? usd(amount) : unit === "JPY" ? jpy(amount) : amount?.toLocaleString() ?? null);
export const pct = (v: number | null | undefined, sign = true) => (v === null || v === undefined ? null : `${sign && v > 0 ? "+" : ""}${v.toFixed(1)}%`);
export const date = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", { timeZone: iso.length === 10 ? "UTC" : "Asia/Kolkata", ...opts }) : "—";
export const dateTimeIST = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) + " IST" : "—";

/** Convert using the stored ECB rate only. Returns null until a rate exists. */
export function toUSD(amount: number, unit: string): number | null {
  const r = site.fx.rates as { INR: number; JPY: number } | null;
  if (unit === "USD") return amount;
  if (!r) return null;
  if (unit === "INR_CR") return (amount * 1e7) / r.INR;
  if (unit === "JPY") return amount / r.JPY;
  return null;
}
export function toINRcr(amount: number, unit: string): number | null {
  const r = site.fx.rates as { INR: number; JPY: number } | null;
  if (unit === "INR_CR") return amount;
  if (!r) return null;
  if (unit === "USD") return (amount * r.INR) / 1e7;
  if (unit === "JPY") return ((amount / r.JPY) * r.INR) / 1e7;
  return null;
}

export const TERRITORY: Record<string, string> = {
  IN: "India",
  US: "United States",
  "US-CA": "United States & Canada",
  JP: "Japan",
  CN: "Mainland China",
  OS: "Overseas (all non-India)",
  WW: "Worldwide",
  INTL: "International (outside North America)",
  INTL_OTHER: "Other international (combined)",
};

export const lastUpdate = site.runs.find((r: any) => r.status === "success") as { finishedAt: string; trigger: string } | undefined;

export const addDaysISO = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
