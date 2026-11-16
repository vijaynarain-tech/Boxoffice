/**
 * Day-wise ledgers. Every cell records where its value came from:
 *  - "reported": published by the ledger's tracker (or a report citing it)
 *  - "derived":  arithmetic on that same tracker's published figures (shown with the formula)
 *  - "fallback": the tracker has no figure, so another source fills the cell (named)
 * Nothing is estimated from ratios or trends.
 */
import type { Observation, Source } from "./schema.ts";
import { STATUS_RANK, addDays, round, weekday } from "./analytics.ts";

export type Kind = "reported" | "derived" | "fallback";
export interface Cell {
  v: number;
  src: string;
  kind: Kind;
  status?: string;
  how?: string;
  url?: string;
}

const usable = (o: Observation) => o.status !== "projection" && o.status !== "live";
const plain = (o: Observation) => !o.region && !o.city && !o.format;
const best = (a: Observation[]) => [...a].sort((x, y) => STATUS_RANK[y.status] - STATUS_RANK[x.status])[0];

function makeFinder(obs: Observation[]) {
  return (fam: Set<string> | null, metric: string, territory: string, ptype: "day" | "cume", d: number, language?: string) => {
    const c = obs.filter(
      (o) =>
        usable(o) &&
        plain(o) &&
        o.metric === metric &&
        o.territory === territory &&
        o.language === language &&
        (fam === null || fam.has(o.source)) &&
        ((ptype === "day" && o.period.type === "day" && o.period.day === d) || (ptype === "cume" && o.period.type === "cume" && o.period.throughDay === d)),
    );
    return c.length ? best(c) : null;
  };
}

const cellOf = (o: Observation | null, kind: Kind = "reported"): Cell | null => (o ? { v: o.amount, src: o.source, kind, status: o.status, url: o.url } : null);

export function buildLedgers(obs: Observation[], sources: Source[], releaseDate: string, lastDay: number) {
  const find = makeFinder(obs.filter((o) => o.film === "ramayana" && (o.unit === "INR_CR" || o.unit === "COUNT" || o.unit === "PCT")));
  const family = (id: string) => new Set(sources.filter((s) => s.id === id || s.cites === id).map((s) => s.id));
  const FAM: Record<string, Set<string>> = { sacnilk: family("sacnilk"), koimoi: family("koimoi") };
  const all = new Set(sources.map((s) => s.id));

  const build = (ledger: "sacnilk" | "koimoi") => {
    const F = FAM[ledger];
    const otherLedger = FAM[ledger === "sacnilk" ? "koimoi" : "sacnilk"];
    // Fallbacks are tried one source at a time so a derived value never mixes outlets.
    const independent = [...all].filter((s) => !F.has(s) && !otherLedger.has(s));
    const fallbacks = [...independent.map((s) => new Set([s])), otherLedger];

    // Money columns from one family: reported first, then derived from that family's own figures.
    const fromFamily = (fam: Set<string>, d: number) => {
      const r = {
        ig: cellOf(find(fam, "gross", "IN", "day", d)),
        os: cellOf(find(fam, "gross", "OS", "day", d)),
        ww: cellOf(find(fam, "gross", "WW", "day", d)),
        cww: cellOf(find(fam, "gross", "WW", "cume", d)),
      };
      // A family's running total on day k: published, or Day 1's own figure, or
      // worked back from the next day's published total minus that day's figure.
      const cumeAt = (t: string, k: number): number | null => {
        if (k === 0) return 0;
        const c = find(fam, "gross", t, "cume", k);
        if (c) return c.amount;
        if (k === 1) return find(fam, "gross", t, "day", 1)?.amount ?? null;
        const next = find(fam, "gross", t, "cume", k + 1), nd = find(fam, "gross", t, "day", k + 1);
        return next && nd ? round(next.amount - nd.amount) : null;
      };
      const prev = (t: string) => cumeAt(t, d - 1);
      const cos = find(fam, "gross", "OS", "cume", d) ?? (d > 1 && cumeAt("OS", d) !== null ? ({ amount: cumeAt("OS", d)!, source: [...fam][0] } as Observation) : null);
      const cig = find(fam, "gross", "IN", "cume", d);
      const pw = prev("WW"), po = prev("OS"), pi = prev("IN");
      if (!r.ww && r.cww && pw !== null) r.ww = { v: round(r.cww.v - pw), src: r.cww.src, kind: "derived", how: d === 1 ? "Day 1 worldwide total" : `Worldwide total Day ${d} − Day ${d - 1}` };
      if (!r.os && cos && po !== null) r.os = { v: round(cos.amount - po), src: cos.source, kind: "derived", how: `Overseas total Day ${d} − Day ${d - 1}` };
      if (!r.ig && cig && pi !== null) r.ig = { v: round(cig.amount - pi), src: cig.source, kind: "derived", how: `India gross total Day ${d} − Day ${d - 1}` };
      if (!r.ww && r.ig && r.os) r.ww = { v: round(r.ig.v + r.os.v), src: r.ig.src, kind: "derived", how: "India gross + overseas" };
      if (!r.os && r.ww && r.ig) r.os = { v: round(r.ww.v - r.ig.v), src: r.ww.src, kind: "derived", how: "Worldwide − India gross" };
      if (!r.ig && r.ww && r.os) r.ig = { v: round(r.ww.v - r.os.v), src: r.ww.src, kind: "derived", how: "Worldwide − overseas" };
      return r;
    };

    const rows: Record<string, unknown>[] = [];
    let cumNet = 0;
    let prevNet: number | null = null;
    let prevCww: Cell | null = null;
    for (let d = 1; d <= lastDay; d++) {
      const date = addDays(releaseDate, d - 1);
      const netO = find(F, "net", "IN", "day", d) ?? find(null, "net", "IN", "day", d);
      const net: Cell | null = netO ? { ...cellOf(netO)!, kind: F.has(netO.source) ? "reported" : "fallback" } : null;
      const alt = obs.filter((o) => o.film === "ramayana" && usable(o) && plain(o) && !o.language && o.metric === "net" && o.territory === "IN" && o.period.type === "day" && o.period.day === d && o !== netO).map((o) => ({ src: o.source, v: o.amount }));
      if (net) cumNet += net.v;

      const own = fromFamily(F, d);
      const fill = (key: keyof typeof own) => {
        if (own[key]) return own[key];
        for (const fam of fallbacks) {
          const c = fromFamily(fam, d)[key];
          if (c) return { ...c, kind: "fallback" as Kind };
        }
        return null;
      };
      const ig = fill("ig"), os = fill("os"), ww = fill("ww");
      let cww = own.cww;
      if (!cww && prevCww && prevCww.kind !== "fallback" && own.ww) cww = { v: round(prevCww.v + own.ww.v), src: own.ww.src, kind: "derived", how: `Day ${d - 1} total + Day ${d} worldwide` };
      if (!cww) cww = fill("cww");
      prevCww = cww;

      const pick = (metric: string, language?: string) => {
        for (const fam of [F, otherLedger, new Set(independent)]) {
          const o = find(fam, metric, "IN", "day", d, language);
          if (o) return { ...cellOf(o)!, kind: (fam === F ? "reported" : "fallback") as Kind };
        }
        return null;
      };
      let occupancy = pick("occupancy");
      let occScope = "all languages";
      if (!occupancy) {
        const h = pick("occupancy", "Hindi");
        if (h) { occupancy = h; occScope = "Hindi only"; }
      }
      let shows = pick("shows");
      let showsScope = "all languages";
      if (!shows) {
        // All-language shows = sum of every language's shows when all five are published.
        const langs = ["Hindi", "Kannada", "Telugu", "Tamil", "Malayalam"].map((l) => find(null, "shows", "IN", "day", d, l));
        if (langs.every(Boolean)) shows = { v: langs.reduce((s, o) => s + o!.amount, 0), src: "sacnilk", kind: "derived", how: "Sum of language show counts" };
        else if (langs[0]) { shows = cellOf(langs[0]); showsScope = "Hindi only"; }
      }

      rows.push({
        day: d,
        date,
        weekday: weekday(date),
        isWeekend: ["Friday", "Saturday", "Sunday"].includes(weekday(date)),
        net,
        alt,
        cumNet: net ? round(cumNet) : null,
        changePct: net && prevNet ? round(((net.v - prevNet) / prevNet) * 100, 1) : null,
        indiaGross: ig,
        overseas: os,
        worldwide: ww,
        cumWorldwide: cww,
        shows,
        showsScope,
        occupancy,
        occScope,
        tickets: pick("tickets"),
      });
      if (net) prevNet = net.v;
    }
    const filled = (k: string) => rows.filter((r) => r[k]).length;
    return {
      rows,
      coverage: Object.fromEntries(["net", "indiaGross", "overseas", "worldwide", "cumWorldwide", "shows", "occupancy", "tickets"].map((k) => [k, { filled: filled(k), total: rows.length }])),
    };
  };

  return { sacnilk: build("sacnilk"), koimoi: build("koimoi") };
}

/* ------------------------------------------------------------------ */
/* Language-wise                                                       */
/* ------------------------------------------------------------------ */

export const LANGS = ["Hindi", "Kannada", "Telugu", "Tamil", "Malayalam"];

export function buildLanguages(obs: Observation[], releaseDate: string, lastDay: number) {
  const ro = obs.filter((o) => o.film === "ramayana" && o.status !== "projection" && plain(o));
  const at = (metric: string, d: number, language?: string, live = false) => {
    const c = ro.filter((o) => o.metric === metric && o.territory === "IN" && o.language === language && o.period.type === "day" && o.period.day === d && (live ? o.status === "live" : o.status !== "live"));
    if (!c.length) return null;
    return c.find((o) => o.source === "sacnilk") ?? best(c);
  };
  const days = Math.max(lastDay, ...ro.filter((o) => o.language && o.period.type === "day").map((o) => (o.period as { day: number }).day));
  const table = [];
  for (let d = 1; d <= days; d++) {
    const live = d > lastDay;
    const total = at("net", d, undefined, live);
    const by: Record<string, { net: Cell | null; shows: number | null; occupancy: number | null }> = {};
    for (const l of LANGS) {
      const n = at("net", d, l, live);
      by[l] = { net: n ? { v: n.amount, src: n.source, kind: "reported", status: n.status, url: n.url } : null, shows: at("shows", d, l, live)?.amount ?? null, occupancy: at("occupancy", d, l, live)?.amount ?? null };
    }
    // If exactly one language is missing and the all-language total is published, derive it.
    const missing = LANGS.filter((l) => !by[l].net);
    if (total && missing.length === 1) {
      const rest = LANGS.filter((l) => by[l].net).reduce((s, l) => s + by[l].net!.v, 0);
      const v = round(total.amount - rest);
      if (v > 0) by[missing[0]].net = { v, src: total.source, kind: "derived", how: "All-language net minus the other four languages", status: live ? "live" : total.status };
    }
    table.push({ day: d, date: addDays(releaseDate, d - 1), live, total: total?.amount ?? null, by });
  }
  // A language's total through day k minus every other published day in 1..k
  // gives the one missing day, when exactly one is missing.
  for (const l of LANGS) {
    const points = ro.filter((o) => o.metric === "net" && o.language === l && o.period.type === "cume").sort((a, b) => (a.period as { throughDay: number }).throughDay - (b.period as { throughDay: number }).throughDay);
    for (const p of points) {
      const k = (p.period as { throughDay: number }).throughDay;
      const span = table.filter((t) => t.day <= k && !t.live);
      const miss = span.filter((t) => !t.by[l].net);
      if (miss.length === 1) {
        const v = round(p.amount - span.filter((t) => t.by[l].net).reduce((s, t) => s + t.by[l].net!.v, 0));
        if (v > 0) miss[0].by[l].net = { v, src: p.source, kind: "derived", how: `${l} total through Day ${k} minus the other days`, status: "estimated" };
      }
    }
  }
  const cume = Object.fromEntries(
    LANGS.map((l) => [
      l,
      ro
        .filter((o) => o.metric === "net" && o.language === l && o.period.type === "cume")
        .map((o) => ({ day: (o.period as { throughDay: number }).throughDay, v: o.amount, src: o.source, url: o.url, note: o.note ?? null }))
        .sort((a, b) => a.day - b.day),
    ]),
  );
  const latestDay = Math.max(...Object.values(cume).flatMap((c) => c.map((x) => x.day)), 0);
  const totals = LANGS.map((l) => ({ language: l, v: cume[l].find((x) => x.day === latestDay)?.v ?? null }));
  const sum = totals.reduce((s, t) => s + (t.v ?? 0), 0);
  return {
    table,
    cume,
    latestDay,
    totals: totals.map((t) => ({ ...t, sharePct: t.v && sum ? round((t.v / sum) * 100, 1) : null })),
  };
}
