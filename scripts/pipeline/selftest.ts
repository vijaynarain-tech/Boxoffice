/** Fast checks of the pipeline logic. Run with `npm test`. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { Observation } from "./schema.ts";
import { findConflicts, pickPrimary, buildRamayana, detectRevisions } from "./analytics.ts";
import { forecastRamayana, chinaSensitivity } from "./forecast.ts";

const base = { film: "ramayana", metric: "net" as const, territory: "IN", unit: "INR_CR" as const, retrievedAt: "2026-11-15T00:00:00Z", status: "final" as const };
const o = (id: string, source: string, amount: number, day = 1) => Observation.parse({ ...base, id, source, amount, period: { type: "day", date: "2026-11-05", day } });

// Schema rejects zero, negative and unknown fields
assert.equal(Observation.safeParse({ ...base, id: "x-1", source: "sacnilk", amount: 0, period: { type: "day", day: 1 } }).success, false);
assert.equal(Observation.safeParse({ ...base, id: "x-2", source: "sacnilk", amount: 5, period: { type: "day", day: 1 }, extra: 1 }).success, false);

// Conflicts: >0.5% spread across sources is flagged, primary follows source priority
const c = findConflicts([o("a-1", "bollywoodhungama", 62.47), o("a-2", "sacnilk", 64.85)], () => "d1");
assert.equal(c.length, 1);
assert.equal(c[0].primary.source, "sacnilk");
assert.equal(findConflicts([o("b-1", "koimoi", 100), o("b-2", "sacnilk", 100.2)], () => "").length, 0);
assert.equal(pickPrimary([o("c-1", "koimoi", 1), o("c-2", "sacnilk", 2)]).source, "sacnilk");

// Revisions
assert.equal(detectRevisions([o("r-1", "sacnilk", 10)], [o("r-1", "sacnilk", 11)], "now", () => "")[0].to, 11);

// Real ledger: cumulative India net equals the sum of daily primary figures
const ledger = JSON.parse(fs.readFileSync("data/ledger/ramayana.json", "utf8")).map((x: unknown) => Observation.parse(x));
const m = buildRamayana(ledger, "2026-11-05", "2026-11-15");
const sum = m.rows.reduce((s, r) => s + (r.net ?? 0), 0);
assert.ok(Math.abs(sum - m.headline.totalNet) < 0.01);
assert.equal(m.rows[0].weekday, "Thursday");

// Forecast never projects below what has been earned, and scenarios are ordered
const f = forecastRamayana(m);
const ww = f.scenarios.map((s) => s.lifetimeWorldwide!);
assert.ok(ww.every((v, i) => i === 0 || v > ww[i - 1]));
assert.ok(f.scenarios.every((s) => s.lifetimeNet > m.headline.totalNet));
assert.equal(chinaSensitivity(1000).cases[0].worldwideINR, 1000);

console.log("✓ pipeline self-test passed");
