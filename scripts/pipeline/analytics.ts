import type { Observation } from "./schema.ts";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_RANK: Record<Observation["status"], number> = {
  final: 6,
  revised: 5,
  estimated: 4,
  live: 3,
  reference: 2,
  projection: 1,
};

/** Which tracker wins when several report the same figure. */
export const SOURCE_PRIORITY: Record<string, string[]> = {
  ramayana: ["sacnilk", "koimoi", "bollywoodhungama", "businessstandard", "freepressjournal", "tracktollywood", "deadline", "screendaily"],
  godzilla: ["boxofficemojo", "thenumbers", "imax", "variety", "thr", "deadline", "worldofreel", "rollingout", "screenrant"],
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekday = (iso: string) => WEEKDAYS[new Date(iso + "T00:00:00Z").getUTCDay()];
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

export function periodKey(o: Observation): string {
  const p = o.period;
  switch (p.type) {
    case "day":
      return `day:${p.day}`;
    case "cume":
      return `cume:${p.throughDay ?? "?"}`;
    case "weekend":
      return `wknd:${p.start}..${p.end}`;
    case "lifetime":
      return "lifetime";
    case "advance":
      return `adv:${p.showDate}@${p.cutoff}`;
  }
}

/** Two observations share a key when they describe the same figure. */
export function figureKey(o: Observation): string {
  return [o.film, o.metric, o.territory, o.region ?? "", o.city ?? "", o.language ?? "", o.format ?? "", periodKey(o), o.unit].join("|");
}

export function pickPrimary(obs: Observation[]): Observation {
  const prio = SOURCE_PRIORITY[obs[0].film] ?? [];
  return [...obs].sort((a, b) => {
    const s = STATUS_RANK[b.status] - STATUS_RANK[a.status];
    if (s !== 0 && (a.status === "projection" || b.status === "projection")) return s;
    const pa = prio.indexOf(a.source), pb = prio.indexOf(b.source);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb) || s;
  })[0];
}

/* ------------------------------------------------------------------ */
/* Conflicts and revisions                                             */
/* ------------------------------------------------------------------ */

export interface Conflict {
  key: string;
  film: string;
  label: string;
  primary: { source: string; amount: number; status: string };
  values: { source: string; amount: number; status: string; url?: string }[];
  spreadPct: number;
}

export function findConflicts(all: Observation[], describe: (o: Observation) => string): Conflict[] {
  const groups = new Map<string, Observation[]>();
  for (const o of all) {
    if (o.status === "projection" || o.status === "live") continue; // forecasts and intraday estimates are not competing reports
    const k = figureKey(o);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const out: Conflict[] = [];
  for (const [key, g] of groups) {
    const sources = new Set(g.map((o) => o.source));
    if (sources.size < 2) continue;
    const amounts = g.map((o) => o.amount);
    const min = Math.min(...amounts), max = Math.max(...amounts);
    const spread = (max - min) / min;
    if (spread < 0.005) continue;
    const p = pickPrimary(g);
    out.push({
      key,
      film: g[0].film,
      label: describe(g[0]),
      primary: { source: p.source, amount: p.amount, status: p.status },
      values: g.map((o) => ({ source: o.source, amount: o.amount, status: o.status, url: o.url })),
      spreadPct: round(spread * 100, 1),
    });
  }
  return out.sort((a, b) => b.spreadPct - a.spreadPct);
}

export interface Revision {
  id: string;
  label: string;
  from: number;
  to: number;
  source: string;
  detectedAt: string;
}

export function detectRevisions(prev: Observation[], next: Observation[], now: string, describe: (o: Observation) => string): Revision[] {
  const old = new Map(prev.map((o) => [o.id, o]));
  const out: Revision[] = [];
  for (const o of next) {
    const p = old.get(o.id);
    if (p && p.amount !== o.amount) out.push({ id: o.id, label: describe(o), from: p.amount, to: o.amount, source: o.source, detectedAt: now });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ramayana                                                            */
/* ------------------------------------------------------------------ */

export interface DailyRow {
  day: number;
  date: string;
  weekday: string;
  net: number | null;
  netSource: string | null;
  netStatus: string | null;
  netUrl?: string;
  altNet: { source: string; amount: number }[];
  gross: number | null;
  hindiNet: number | null;
  overseas: number | null;
  worldwide: number | null;
  cumNet: number | null;
  cumWorldwide: number | null;
  cumWorldwideSource: string | null;
  changePct: number | null;
  shows: null;
  occupancy: null;
  isWeekend: boolean;
}

const sel = (obs: Observation[], f: Partial<Record<"metric" | "territory" | "region" | "language" | "format" | "city", string | undefined>>, ptype: string) =>
  obs.filter(
    (o) =>
      o.period.type === ptype &&
      o.unit === "INR_CR" &&
      (f.metric === undefined || o.metric === f.metric) &&
      (f.territory === undefined || o.territory === f.territory) &&
      o.region === f.region &&
      o.language === f.language &&
      o.format === f.format &&
      o.city === f.city,
  );

function byDay(obs: Observation[]) {
  const m = new Map<number, Observation[]>();
  for (const o of obs) if (o.period.type === "day") m.set(o.period.day, [...(m.get(o.period.day) ?? []), o]);
  return m;
}
function byThroughDay(obs: Observation[]) {
  const m = new Map<number, Observation[]>();
  for (const o of obs) if (o.period.type === "cume" && o.period.throughDay) m.set(o.period.throughDay, [...(m.get(o.period.throughDay) ?? []), o]);
  return m;
}

export function buildRamayana(obs: Observation[], releaseDate: string, today: string) {
  // Live intraday figures are shown as "today" but never counted as a completed day.
  const allNet = sel(obs, { metric: "net", territory: "IN" }, "day");
  const liveNet = allNet.filter((o) => o.status === "live");
  const net = byDay(allNet.filter((o) => o.status !== "live"));
  const gross = byDay(sel(obs, { metric: "gross", territory: "IN" }, "day").filter((o) => o.status !== "live"));
  const hindi = byDay(sel(obs, { metric: "net", territory: "IN", language: "Hindi" }, "day"));
  const osDay = byDay(sel(obs, { metric: "gross", territory: "OS" }, "day"));
  const wwCume = byThroughDay(sel(obs, { metric: "gross", territory: "WW" }, "cume"));
  const osCume = byThroughDay(sel(obs, { metric: "gross", territory: "OS" }, "cume"));

  const lastDay = Math.max(...net.keys());
  const rows: DailyRow[] = [];
  let cum = 0;
  for (let d = 1; d <= lastDay; d++) {
    const date = addDays(releaseDate, d - 1);
    const g = net.get(d);
    const p = g ? pickPrimary(g) : null;
    const prev = rows[rows.length - 1];
    if (p) cum += p.amount;
    const ww = wwCume.get(d);
    const wwP = ww ? pickPrimary(ww) : null;
    const wd = weekday(date);
    rows.push({
      day: d,
      date,
      weekday: wd,
      net: p?.amount ?? null,
      netSource: p?.source ?? null,
      netStatus: p?.status ?? null,
      netUrl: p?.url,
      altNet: (g ?? []).filter((o) => o !== p).map((o) => ({ source: o.source, amount: o.amount })),
      gross: gross.get(d) ? pickPrimary(gross.get(d)!).amount : null,
      hindiNet: hindi.get(d) ? pickPrimary(hindi.get(d)!).amount : null,
      overseas: osDay.get(d) ? pickPrimary(osDay.get(d)!).amount : null,
      worldwide: null, // no source publishes a full worldwide figure for a single day
      cumNet: p ? round(cum) : null,
      cumWorldwide: wwP?.amount ?? null,
      cumWorldwideSource: wwP?.source ?? null,
      changePct: p && prev?.net ? round(((p.amount - prev.net) / prev.net) * 100, 1) : null,
      shows: null,
      occupancy: null,
      isWeekend: ["Friday", "Saturday", "Sunday"].includes(wd),
    });
  }

  // Worldwide / overseas checkpoints. India gross is derived as WW − overseas
  // only where ONE source published both figures for the same day.
  const checkpoints: { day: number; date: string; worldwide: number | null; overseas: number | null; indiaGross: number | null; indiaGrossDerived: boolean; source: string; url?: string; status: string }[] = [];
  const days = new Set([...wwCume.keys(), ...osCume.keys()]);
  for (const d of [...days].sort((a, b) => a - b)) {
    const ww = wwCume.get(d) ?? [];
    const os = osCume.get(d) ?? [];
    const sources = new Set([...ww, ...os].map((o) => o.source));
    for (const s of sources) {
      const w = ww.find((o) => o.source === s);
      const o = os.find((x) => x.source === s);
      const ig = sel(obs, { metric: "gross", territory: "IN" }, "cume").find((x) => x.source === s && x.period.type === "cume" && x.period.throughDay === d);
      checkpoints.push({
        day: d,
        date: addDays(releaseDate, d - 1),
        worldwide: w?.amount ?? null,
        overseas: o?.amount ?? null,
        indiaGross: ig?.amount ?? (w && o ? round(w.amount - o.amount) : null),
        indiaGrossDerived: !ig && !!(w && o),
        source: s,
        url: (w ?? o)?.url,
        status: (w ?? o)!.status,
      });
    }
  }

  // Latest consistent worldwide state: prefer a day where WW and OS come from
  // sources tracking the same ledger (Sacnilk-based reports) at the latest day.
  const latestWW = [...wwCume.entries()].sort((a, b) => b[0] - a[0])[0];
  const latestOS = [...osCume.entries()].sort((a, b) => b[0] - a[0])[0];
  const wwP = latestWW ? pickPrimary(latestWW[1]) : null;
  const osP = latestOS ? pickPrimary(latestOS[1]) : null;
  const sameDay = latestWW && latestOS && latestWW[0] === latestOS[0];
  const cumNetAt = (d: number) => rows.find((r) => r.day === d)?.cumNet ?? null;
  const grossRatio = sameDay && wwP && osP && cumNetAt(latestWW[0]) ? (wwP.amount - osP.amount) / cumNetAt(latestWW[0])! : null;
  const overseasToNet = sameDay && osP && cumNetAt(latestOS[0]) ? osP.amount / cumNetAt(latestOS[0])! : null;

  const withNet = rows.filter((r) => r.net !== null) as (DailyRow & { net: number })[];
  const sumDays = (a: number, b: number) => round(withNet.filter((r) => r.day >= a && r.day <= b).reduce((s, r) => s + r.net, 0));
  const highest = withNet.reduce((m, r) => (r.net > m.net ? r : m));
  const changes = withNet.filter((r) => r.changePct !== null);
  const biggestUp = changes.reduce((m, r) => (r.changePct! > m.changePct! ? r : m));
  const biggestDown = changes.reduce((m, r) => (r.changePct! < m.changePct! ? r : m));
  const latest = withNet[withNet.length - 1];
  const prevDay = withNet[withNet.length - 2];
  const todayDay = Math.round((Date.parse(today) - Date.parse(releaseDate)) / 864e5) + 1;

  const weeks: { week: number; label: string; net: number; days: number; complete: boolean }[] = [];
  for (let w = 0; w * 7 < lastDay; w++) {
    const a = w * 7 + 1, b = Math.min(w * 7 + 7, lastDay);
    weeks.push({ week: w + 1, label: `Week ${w + 1} (Day ${a}–${w * 7 + 7})`, net: sumDays(a, b), days: b - a + 1, complete: b === w * 7 + 7 });
  }
  // Same-weekday holds: day N vs day N−7
  const holds = withNet.filter((r) => r.day > 7).map((r) => {
    const base = withNet.find((x) => x.day === r.day - 7)!;
    return { day: r.day, weekday: r.weekday, vsDay: base.day, holdPct: round((r.net / base.net) * 100, 1) };
  });

  const weekend = withNet.filter((r) => r.isWeekend);
  const weekdayRows = withNet.filter((r) => !r.isWeekend);
  const avg = (a: { net: number }[]) => (a.length ? round(a.reduce((s, r) => s + r.net, 0) / a.length) : null);

  return {
    releaseDate,
    rows,
    checkpoints,
    lastReportedDay: latest.day,
    todayDay,
    headline: {
      latestDay: { day: latest.day, date: latest.date, net: latest.net, status: latest.netStatus, source: latest.netSource },
      previousDay: { day: prevDay.day, date: prevDay.date, net: prevDay.net, status: prevDay.netStatus, source: prevDay.netSource },
      latestChangePct: latest.changePct,
      totalNet: latest.cumNet!,
      totalNetSource: "sacnilk",
      worldwide: wwP ? { amount: wwP.amount, day: latestWW[0], source: wwP.source, status: wwP.status, url: wwP.url } : null,
      overseas: osP ? { amount: osP.amount, day: latestOS[0], source: osP.source, status: osP.status, url: osP.url } : null,
      indiaGross: (() => {
        if (!(sameDay && wwP && osP)) return null;
        const d = latestWW[0];
        const pub = sel(obs, { metric: "gross", territory: "IN" }, "cume").filter((o) => o.period.type === "cume" && o.period.throughDay === d);
        if (pub.length) {
          const p = pickPrimary(pub);
          return { amount: p.amount, day: d, derived: false, source: p.source, status: p.status, url: p.url, note: p.note ?? null };
        }
        return { amount: round(wwP.amount - osP.amount), day: d, derived: true, source: null, status: "derived", url: null, note: `Worldwide (${wwP.source}) minus overseas (${osP.source}) for Day ${d}.` };
      })(),
      openingDay: withNet[0].net,
      openingDayGross: rows[0].gross,
      openingWeekend: { net: sumDays(1, 4), label: "Extended opening weekend, Thu–Sun (Day 1–4)" },
      firstWeek: { net: sumDays(1, 7), label: "Day 1–7 (Thu–Wed)" },
      secondWeekend: lastDay >= 11 ? { net: sumDays(9, 11), label: "Second weekend Fri–Sun (Day 9–11)", complete: true } : { net: sumDays(9, lastDay), label: `Second weekend so far (Day 9–${lastDay})`, complete: false },
      currentWeek: weeks[weeks.length - 1],
      highestDay: { day: highest.day, date: highest.date, net: highest.net },
      biggestIncrease: { day: biggestUp.day, date: biggestUp.date, pct: biggestUp.changePct },
      biggestDecline: { day: biggestDown.day, date: biggestDown.date, pct: biggestDown.changePct },
      runningAverage: round(latest.cumNet! / latest.day),
      today: (() => {
        const day = Math.max(0, ...liveNet.map((o) => (o.period as { day: number }).day));
        const at = (o: Observation) => o.period.type === "day" && o.period.day === day && o.status === "live" && !o.region && !o.language;
        const n = liveNet.filter((o) => (o.period as { day: number }).day === day);
        if (!n.length || day <= lastDay) return null;
        const p = pickPrimary(n);
        const find = (metric: string) => obs.find((o) => at(o) && o.metric === metric && o.source === p.source);
        return {
          day,
          date: addDays(releaseDate, day - 1),
          net: p.amount,
          gross: find("gross")?.amount ?? null,
          shows: find("shows")?.amount ?? null,
          occupancy: find("occupancy")?.amount ?? null,
          source: p.source,
          url: p.url,
          note: p.note ?? null,
          others: n.filter((o) => o !== p).map((o) => ({ source: o.source, amount: o.amount })),
        };
      })(),
      tickets: null,
      shows: null,
      occupancy: null,
    },
    weeks,
    holds,
    weekendVsWeekday: { weekendAvg: avg(weekend), weekdayAvg: avg(weekdayRows), weekendDays: weekend.length, weekdayDays: weekdayRows.length },
    ratios: { grossToNet: grossRatio ? round(grossRatio, 3) : null, overseasToNet: overseasToNet ? round(overseasToNet, 3) : null, basisDay: sameDay ? latestWW[0] : null },
  };
}

export type RamayanaModel = ReturnType<typeof buildRamayana>;
