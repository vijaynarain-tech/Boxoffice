/**
 * Data pipeline. Runs three times a day from GitHub Actions (08:00, 15:00, 22:00 IST)
 * and on demand with `npm run pipeline`.
 *
 *  1. Load the source ledger (data/ledger) and any new entries dropped in data/inbox.
 *  2. Validate every observation with Zod plus cross-checks.
 *  3. Fetch exchange rates from a permitted public API (ECB via Frankfurter).
 *  4. Detect revisions against the previous published dataset and flag source conflicts.
 *  5. Rebuild analytics, rankings and forecasts into src/generated/site-data.json.
 *  6. Record the run in data/state/runs.json.
 * If anything fails, the previous site-data.json is left untouched.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Observation, Source, FxState, FrankfurterResponse } from "./schema.ts";
import { buildRamayana, findConflicts, detectRevisions, pickPrimary, round, figureKey } from "./analytics.ts";
import { forecastRamayana, forecastGodzilla, chinaSensitivity } from "./forecast.ts";
import { buildLedgers, buildLanguages } from "./daily.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const P = (...p: string[]) => path.join(ROOT, ...p);
const OUT = P("src/generated/site-data.json");
const RUNS = P("data/state/runs.json");
const FX = P("data/state/fx.json");
const offline = process.argv.includes("--offline");
const trigger = process.env.RUN_TRIGGER ?? (process.env.GITHUB_EVENT_NAME ? `github:${process.env.GITHUB_EVENT_NAME}` : "local");

const readJSON = <T,>(f: string, fallback?: T): T => {
  if (!fs.existsSync(f)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${f}`);
  }
  return JSON.parse(fs.readFileSync(f, "utf8"));
};
const writeJSON = (f: string, v: unknown) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n");

type Step = { name: string; ok: boolean; detail: string };

async function fetchFx(prev: FxState, steps: Step[]): Promise<FxState> {
  if (offline) {
    steps.push({ name: "fx", ok: true, detail: "Skipped (offline run). Kept previous rates." });
    return prev;
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR,JPY,GBP,EUR,CAD", { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = FrankfurterResponse.parse(await res.json());
    steps.push({ name: "fx", ok: true, detail: `USD→INR ${body.rates.INR}, USD→JPY ${body.rates.JPY} (ECB ${body.date})` });
    return { status: "ok", base: "USD", rates: body.rates, date: body.date, source: "frankfurter", fetchedAt: new Date().toISOString() };
  } catch (e) {
    steps.push({ name: "fx", ok: false, detail: `FX fetch failed (${(e as Error).message}). Kept previous rates.` });
    return { ...prev, status: prev.rates ? "stale" : "pending" };
  }
}

function loadLedger(steps: Step[]) {
  const files = ["ramayana.json", "godzilla.json", "records.json"].map((f) => P("data/ledger", f));
  const inbox = fs.existsSync(P("data/inbox")) ? fs.readdirSync(P("data/inbox")).filter((f) => f.endsWith(".json")).map((f) => P("data/inbox", f)) : [];
  const all: Observation[] = [];
  const errors: string[] = [];
  for (const f of [...files, ...inbox]) {
    const raw = readJSON<unknown[]>(f);
    raw.forEach((r, i) => {
      const p = Observation.safeParse(r);
      if (p.success) all.push(p.data);
      else errors.push(`${path.basename(f)}[${i}]: ${p.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    });
  }
  const ids = new Set<string>();
  for (const o of all) {
    if (ids.has(o.id)) errors.push(`Duplicate id ${o.id}`);
    ids.add(o.id);
  }
  steps.push({ name: "validate", ok: errors.length === 0, detail: errors.length ? errors.slice(0, 10).join(" | ") : `${all.length} observations valid (${inbox.length} inbox file(s))` });
  if (errors.length) throw new Error(`Validation failed: ${errors.length} issue(s)`);
  return all;
}

function crossChecks(obs: Observation[], sources: Source[], today: string, steps: Step[]) {
  const issues: string[] = [];
  const srcIds = new Set(sources.map((s) => s.id));
  for (const o of obs) {
    if (!srcIds.has(o.source)) issues.push(`${o.id}: unknown source '${o.source}'`);
    const d = o.period.type === "day" ? o.period.date : o.period.type === "cume" ? o.period.asOf : o.period.type === "weekend" ? o.period.end : null;
    if (d && d > today && o.status !== "projection") issues.push(`${o.id}: date ${d} is in the future but not marked as a projection`);
    if (o.unit === "INR_CR" && o.amount > 5000) issues.push(`${o.id}: ₹${o.amount} Cr is implausible`);
  }
  // Cumulative totals from one source must never fall over time.
  const cumes = obs.filter((o) => o.period.type === "cume" && o.period.throughDay);
  const series = new Map<string, Observation[]>();
  for (const o of cumes) {
    const k = [o.film, o.metric, o.territory, o.region, o.city, o.language, o.format, o.source, o.unit].join("|");
    series.set(k, [...(series.get(k) ?? []), o]);
  }
  for (const [k, s] of series) {
    s.sort((a, b) => (a.period as { throughDay: number }).throughDay - (b.period as { throughDay: number }).throughDay);
    for (let i = 1; i < s.length; i++) if (s[i].amount < s[i - 1].amount) issues.push(`${k}: cumulative fell from ${s[i - 1].amount} to ${s[i].amount}`);
  }
  steps.push({ name: "cross-check", ok: issues.length === 0, detail: issues.length ? issues.slice(0, 10).join(" | ") : "Dates, sources and cumulative series consistent" });
  if (issues.length) throw new Error(`Cross-checks failed: ${issues.length} issue(s)`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toISOString().slice(0, 10);
  const steps: Step[] = [];
  const runs = readJSON<unknown[]>(RUNS, []);
  const prevFx = FxState.parse(readJSON(FX));
  const prevSite = fs.existsSync(OUT) ? readJSON<{ observations: Observation[]; revisions: unknown[] }>(OUT) : null;

  let status: "success" | "failed" = "success";
  let summary = "";
  try {
    const sources = z.array(Source).parse(readJSON(P("data/ledger/sources.json")));
    const films = readJSON<any>(P("data/ledger/films.json"));
    const obs = loadLedger(steps);
    crossChecks(obs, sources, today, steps);
    const fx = await fetchFx(prevFx, steps);
    writeJSON(FX, fx);

    const titles: Record<string, string> = Object.fromEntries([...films.focus.map((f: any) => [f.id, f.title]), ...Object.entries(films.records).map(([k, v]: any) => [k, v.title])]);
    const describe = (o: Observation) => {
      const per = o.period.type === "day" ? `Day ${o.period.day}` : o.period.type === "cume" ? `cumulative through Day ${o.period.throughDay ?? "?"}` : o.period.type === "weekend" ? o.period.label : o.period.type;
      return `${titles[o.film] ?? o.film} · ${o.language ? o.language + " " : ""}${o.format ? o.format + " " : ""}${o.metric} · ${o.region ?? o.city ?? o.territory} · ${per}`;
    };

    const conflicts = findConflicts(obs, describe);
    const newRevisions = prevSite ? detectRevisions(prevSite.observations, obs, startedAt, describe) : [];
    const revisions = [...newRevisions, ...((prevSite?.revisions as any[]) ?? [])].slice(0, 200);
    steps.push({ name: "reconcile", ok: true, detail: `${conflicts.length} source conflict(s), ${newRevisions.length} new revision(s)` });

    /* ---------------- Ramayana ---------------- */
    const ramMeta = films.focus.find((f: any) => f.id === "ramayana");
    const ramObs = obs.filter((o) => o.film === "ramayana");
    const ram = buildRamayana(ramObs, ramMeta.releaseDate, today);
    const ramFc = forecastRamayana(ram);
    const baseWW = ramFc.scenarios[1].lifetimeWorldwide;

    const regions = ramObs.filter((o) => o.region || o.city).map((o) => ({ ...o, label: o.region ?? o.city }));
    const intlWeekend = ramObs.filter((o) => o.period.type === "weekend");

    /* ---------------- Godzilla ---------------- */
    const gzObs = obs.filter((o) => o.film === "godzilla");
    const one = (f: (o: Observation) => boolean) => {
      const g = gzObs.filter(f);
      return g.length ? pickPrimary(g) : null;
    };
    // Most recent cumulative figure: the highest throughDay wins, then source priority.
    const latestCume = (f: (o: Observation) => boolean) => {
      const g = gzObs.filter((o) => f(o) && o.period.type === "cume" && o.status !== "projection");
      if (!g.length) return null;
      const td = (o: Observation) => (o.period.type === "cume" ? o.period.throughDay ?? 0 : 0);
      const max = Math.max(...g.map(td));
      return pickPrimary(g.filter((o) => td(o) === max));
    };
    const gz = {
      naFriday: one((o) => o.territory === "US-CA" && o.period.type === "day" && o.period.day === 1),
      naOpening: one((o) => o.territory === "US-CA" && !o.format && o.period.type === "weekend" && o.period.start === "2026-11-06"),
      naSecondWeekend: one((o) => o.territory === "US-CA" && o.period.type === "weekend" && o.period.start === "2026-11-13"),
      naCume: latestCume((o) => o.territory === "US-CA"),
      japanJPY: one((o) => o.territory === "JP" && o.unit === "JPY"),
      japanUSD: one((o) => o.territory === "JP" && o.unit === "USD" && o.period.type === "cume"),
      japanWeekend: one((o) => o.territory === "JP" && o.period.type === "weekend"),
      wwOpening: one((o) => o.territory === "WW" && !o.format && o.period.type === "weekend"),
      wwLatest: latestCume((o) => o.territory === "WW" && !o.format),
      wwWeekend2: one((o) => o.territory === "WW" && !o.format && o.period.type === "weekend" && o.period.start === "2026-11-13"),
      intlOpening: one((o) => o.territory === "INTL" && o.period.type === "weekend"),
      intlLatest: latestCume((o) => o.territory === "INTL"),
      japanDay1: one((o) => o.territory === "JP" && o.metric === "gross" && o.period.type === "day"),
      japanAdmissionsDay1: one((o) => o.territory === "JP" && o.metric === "footfalls"),
      imaxWW: one((o) => o.territory === "WW" && o.format === "IMAX"),
      imaxNA: one((o) => o.territory === "US-CA" && o.format === "IMAX"),
    };
    const theaters = gz.naOpening?.theaters ?? 3254;
    const impliedJpy = gz.japanJPY && gz.japanUSD ? gz.japanJPY.amount / gz.japanUSD.amount : null;
    const jpyPerUsd = fx.rates?.JPY ?? impliedJpy ?? 0;
    const jpySrc = fx.rates ? `ECB reference rate ${fx.date}` : "implied by Box Office Mojo USD and Deadline JPY figures for the same period; replaced by the ECB rate once fetched";
    const gzFc = forecastGodzilla({
      naCumeThroughW2: gz.naCume!.amount,
      naW2Weekend: gz.naSecondWeekend!.amount,
      japanFirstSixDaysJPY: gz.japanJPY!.amount,
      jpyPerUsd,
      jpyRateSource: jpySrc,
      intlWeekendUSD: gz.intlOpening!.amount,
      japanCumeUSD: gz.japanUSD!.amount,
    });

    /* ---------------- Head to head (same reporting window only) ---------------- */
    const rw = (f: (o: Observation) => boolean) => {
      const g = ramObs.filter(f);
      return g.length ? pickPrimary(g) : null;
    };
    const wk = (o: Observation) => o.period.type === "weekend" && o.period.start === "2026-11-06";
    const ramImax = ramObs.filter((o) => o.format === "IMAX" && wk(o));
    const ramImaxTotal = ramImax.length === 3 ? ramImax.reduce((s, o) => s + o.amount, 0) : null;
    const cmp = (metric: string, window: string, r: Observation | { amount: number; source: string; note?: string } | null, g: Observation | { amount: number; source: string; note?: string } | null, comparable: boolean, why: string) => ({
      metric, window,
      ramayana: r ? { amount: r.amount, source: r.source, note: (r as any).note ?? null } : null,
      godzilla: g ? { amount: g.amount, source: g.source, note: (g as any).note ?? null } : null,
      comparable: comparable && !!r && !!g,
      leader: comparable && r && g ? (r.amount > g.amount ? "ramayana" : r.amount < g.amount ? "godzilla" : "tie") : null,
      why,
    });
    const deadlineWW = (film: Observation[]) => film.find((o) => o.territory === "WW" && !o.format && wk(o) && o.source === "deadline") ?? null;
    const headToHead = [
      cmp("Worldwide gross", "Global weekend Nov 6–8 (Deadline, same report)", deadlineWW(ramObs), deadlineWW(gzObs), true, "Both figures come from one Deadline global-weekend report. Godzilla's total includes Japan grosses from Nov 3; Ramayana's includes India from Nov 5."),
      cmp("Worldwide gross", "Global weekend Nov 13–15 (Comscore via one report)", rw((o) => o.territory === "WW" && o.period.type === "weekend" && o.period.start === "2026-11-13" && o.source === "patrickfrater"), gzObs.find((o) => o.territory === "WW" && o.period.type === "weekend" && o.period.start === "2026-11-13" && o.source === "patrickfrater") ?? null, true, "Second global weekend for both films, from the same Comscore (Rentrak) estimate. Ramayana's second weekend held far better."),
      cmp("Worldwide gross to date", "Running totals through Sun Nov 15 (Deadline)", rw((o) => o.territory === "WW" && o.unit === "USD" && o.period.type === "cume" && o.source === "businesstodaymy"), gzObs.find((o) => o.territory === "WW" && o.period.type === "cume" && o.source === "variety") ?? null, true, "Both totals through Nov 15. Godzilla has two more days in release (Japan opened Nov 3; Ramayana Nov 5)."),
      cmp("North America", "Opening weekend Nov 6–8", rw((o) => o.territory === "US" && wk(o)), gz.naOpening, false, "Ramayana's figure is U.S. only as reported; Godzilla's is U.S. + Canada. Shown side by side, no leader declared."),
      cmp("Global IMAX", "Global weekend Nov 6–8", ramImaxTotal ? { amount: ramImaxTotal, source: "deadline", note: "Sum of India, North America and 32 other territories in one Deadline report." } : null, gz.imaxWW, true, "Global IMAX opening vs global IMAX opening."),
      cmp("North America IMAX", "Opening weekend Nov 6–8", rw((o) => o.territory === "US-CA" && o.format === "IMAX"), gz.imaxNA, true, "Both U.S. + Canada IMAX for the same weekend. Ramayana played 53 IMAX screens."),
      cmp("India", "Global weekend Nov 6–8", rw((o) => o.territory === "IN" && wk(o) && !o.format), null, false, "Godzilla's India gross is not reported."),
      cmp("Japan", "Nov 3–8", null, gz.japanUSD, false, "Ramayana's Japan release and gross are not reported."),
      cmp("International (outside home market)", "Global weekend Nov 6–8", null, gz.intlOpening, false, "Godzilla's 'international' includes Japan, its home market. Ramayana's comparable figure would be overseas excluding India in USD, which Deadline splits only as U.S. + 37 territories."),
    ];

    /* ---------------- Records ---------------- */
    const recObs = obs.filter((o) => !["ramayana", "godzilla"].includes(o.film));
    const board = (filter: (o: Observation) => boolean, ramEntry: { amount: number; source: string; status: string; note?: string } | null) => {
      const rows = recObs.filter(filter).map((o) => ({ film: o.film, title: titles[o.film], year: films.records[o.film]?.year, amount: o.amount, source: o.source, status: o.status, note: o.note ?? null, live: false }));
      if (ramEntry) rows.push({ film: "ramayana", title: ramMeta.title, year: 2026, amount: ramEntry.amount, source: ramEntry.source, status: ramEntry.status as Observation["status"], note: ramEntry.note ?? "Still in theatres", live: true });
      rows.sort((a, b) => b.amount - a.amount);
      return rows.map((r, i) => ({ rank: i + 1, ...r }));
    };
    const latestWW = ram.headline.worldwide!;
    const lb = {
      worldwide: board((o) => o.metric === "gross" && o.territory === "WW" && o.period.type === "lifetime", { amount: latestWW.amount, source: latestWW.source, status: latestWW.status, note: `Through Day ${latestWW.day}` }),
      indiaNet: board((o) => o.metric === "net" && o.territory === "IN" && !o.language && o.period.type === "lifetime", { amount: ram.headline.totalNet, source: "sacnilk", status: "final", note: `Through Day ${ram.lastReportedDay}` }),
      hindiNet: board((o) => o.metric === "net" && o.language === "Hindi" && o.period.type === "lifetime", null),
      openingDay: board((o) => o.metric === "net" && o.territory === "IN" && o.period.type === "day" && o.period.day === 1, { amount: ram.headline.openingDay, source: "sacnilk", status: "final" }),
    };
    const tracker = (rows: typeof lb.worldwide, scenarios: typeof ramFc.scenarios | null) => {
      const me = rows.find((r) => r.live);
      if (!me) return null;
      const above = rows.filter((r) => r.rank < me.rank).reverse();
      const next = above[0] ?? null;
      const top = rows[0];
      const eta = (target: number) => scenarios?.map((s) => {
        const hit = s.wwPath.find((x) => x.worldwide >= target);
        return { scenario: s.name, day: hit?.day ?? null, date: hit?.date ?? null };
      }) ?? null;
      return {
        rank: me.rank,
        current: me.amount,
        next: next ? { title: next.title, amount: next.amount, gap: round(next.amount - me.amount), source: next.source, sameLedger: next.source === me.source, progressPct: round((me.amount / next.amount) * 100, 1), eta: eta(next.amount) } : null,
        record: top.live ? null : { title: top.title, amount: top.amount, gap: round(top.amount - me.amount), source: top.source, sameLedger: top.source === me.source, progressPct: round((me.amount / top.amount) * 100, 1), eta: eta(top.amount) },
        milestones: [500, 1000, 1500, 2000].map((m) => ({ crore: m, reached: me.amount >= m, eta: me.amount >= m ? null : eta(m) })),
      };
    };
    const trackers = { worldwide: tracker(lb.worldwide, ramFc.scenarios), indiaNet: tracker(lb.indiaNet, null) };

    /* ---------------- Territories ---------------- */
    // Every territory with at least one figure. Aggregates (OS, INTL, GULF, ME…) stay
    // as their own rows and are never summed with the countries inside them.
    const territories = (["ramayana", "godzilla"] as const).flatMap((film) => {
      const fo = obs.filter((o) => o.film === film && !o.region && !o.city && o.territory !== "IN" && o.territory !== "WW");
      return [...new Set(fo.map((o) => o.territory))].map((t) => ({ film, territory: t, observations: fo.filter((o) => o.territory === t) }));
    });

    const site = {
      generatedAt: startedAt,
      today,
      fx: { ...fx, impliedJpyPerUsd: impliedJpy ? round(impliedJpy, 2) : null },
      sources,
      films,
      observations: obs,
      conflicts,
      revisions,
      ramayana: { ...ram, regions, intlWeekend, forecast: ramFc, china: chinaSensitivity(baseWW), ledgers: buildLedgers(obs, sources, ramMeta.releaseDate, ram.lastReportedDay), languages: buildLanguages(obs, ramMeta.releaseDate, ram.lastReportedDay) },
      godzilla: { figures: gz, theaters, avgPerTheaterOpening: gz.naOpening ? round(gz.naOpening.amount / theaters, 0) : null, forecast: gzFc },
      headToHead,
      leaderboards: lb,
      trackers,
      territories,
      runs: [] as unknown[],
    };

    // Write atomically: temp file then rename, so a crash never leaves a half file.
    summary = `${obs.length} observations · ${conflicts.length} conflicts · ${newRevisions.length} revisions · Ramayana Day ${ram.lastReportedDay} · FX ${fx.status}`;
    const run = { startedAt, finishedAt: new Date().toISOString(), trigger, status, summary, steps };
    const allRuns = [run, ...runs].slice(0, 90);
    site.runs = allRuns.slice(0, 20);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT + ".tmp", JSON.stringify(site));
    fs.renameSync(OUT + ".tmp", OUT);
    writeJSON(RUNS, allRuns);
    console.log(`✓ ${summary}`);
    void figureKey;
  } catch (e) {
    status = "failed";
    summary = `Failed: ${(e as Error).message}. Previous dataset kept.`;
    const run = { startedAt, finishedAt: new Date().toISOString(), trigger, status, summary, steps };
    writeJSON(RUNS, [run, ...runs].slice(0, 90));
    console.error(`✗ ${summary}`);
    for (const s of steps) console.error(`  ${s.ok ? "✓" : "✗"} ${s.name}: ${s.detail}`);
    process.exitCode = 1;
  }
}

main();
