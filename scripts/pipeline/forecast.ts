import { round, addDays, type RamayanaModel } from "./analytics.ts";

/**
 * Transparent scenario forecasts. Every parameter is printed on the site.
 * These are projections, never added to earned totals.
 */

export const SCENARIOS = ["Conservative", "Base case", "Strong theatrical run", "Exceptional breakout"] as const;

const RAM_PARAMS = [
  { sundayUplift: 1.0, weekdayVsFriday: 0.6, weeklyRetention: 0.4, overseasLegs: 0.8 },
  { sundayUplift: 1.1, weekdayVsFriday: 0.7, weeklyRetention: 0.5, overseasLegs: 0.9 },
  { sundayUplift: 1.15, weekdayVsFriday: 0.8, weeklyRetention: 0.58, overseasLegs: 1.0 },
  { sundayUplift: 1.2, weekdayVsFriday: 0.9, weeklyRetention: 0.65, overseasLegs: 1.1 },
];
const TAIL_WEEKS = 10;

export function forecastRamayana(m: RamayanaModel) {
  const rows = m.rows.filter((r) => r.net !== null);
  const last = rows[rows.length - 1];
  const observedNet = last.cumNet!;
  const g = m.ratios.grossToNet;
  const os = m.ratios.overseasToNet;
  const net = (d: number) => rows.find((r) => r.day === d)?.net ?? null;

  const scenarios = RAM_PARAMS.map((p, i) => {
    // Project each remaining day explicitly through the end of the current week,
    // then whole weeks decaying by weeklyRetention.
    const path: { day: number; date: string; net: number; projected: boolean }[] = rows.map((r) => ({ day: r.day, date: r.date, net: r.net!, projected: false }));
    const weekEnd = Math.ceil(last.day / 7) * 7;
    let lastFriday = [...rows].reverse().find((r) => r.weekday === "Friday")?.net ?? last.net!;
    let lastSaturday = [...rows].reverse().find((r) => r.weekday === "Saturday")?.net ?? last.net!;
    for (let d = last.day + 1; d <= weekEnd; d++) {
      const date = addDays(m.releaseDate, d - 1);
      const wd = new Date(date + "T00:00:00Z").getUTCDay();
      let v: number;
      if (wd === 0) v = lastSaturday * p.sundayUplift;
      else if (wd === 6) v = lastFriday * 1.4;
      else if (wd === 5) v = lastFriday;
      else v = lastFriday * p.weekdayVsFriday;
      path.push({ day: d, date, net: round(v), projected: true });
    }
    const currentWeekTotal = path.filter((x) => x.day > weekEnd - 7 && x.day <= weekEnd).reduce((s, x) => s + x.net, 0);
    let weekTotal = currentWeekTotal;
    for (let w = 1; w <= TAIL_WEEKS; w++) {
      weekTotal *= p.weeklyRetention;
      for (let k = 1; k <= 7; k++) {
        const d = weekEnd + (w - 1) * 7 + k;
        path.push({ day: d, date: addDays(m.releaseDate, d - 1), net: round(weekTotal / 7), projected: true });
      }
    }
    const lifetimeNet = round(path.reduce((s, x) => s + x.net, 0));
    const lifetimeGross = g ? round(lifetimeNet * g) : null;
    const observedOverseas = m.headline.overseas?.amount ?? null;
    const futureNet = lifetimeNet - observedNet;
    const lifetimeOverseas = os && observedOverseas !== null ? round(observedOverseas + futureNet * os * p.overseasLegs) : null;
    const lifetimeWorldwide = lifetimeGross !== null && lifetimeOverseas !== null ? round(lifetimeGross + lifetimeOverseas) : null;

    // Cumulative worldwide path for milestone timing.
    let c = 0;
    const wwPath = g && os ? path.map((x) => {
      c += x.net;
      const ovs = x.day <= last.day ? (observedOverseas! * c) / observedNet : observedOverseas! + (c - observedNet) * os * p.overseasLegs;
      return { day: x.day, date: x.date, worldwide: round(c * g + ovs), projected: x.projected };
    }) : [];

    return { name: SCENARIOS[i], params: p, lifetimeNet, lifetimeGross, lifetimeOverseas, lifetimeWorldwide, path, wwPath };
  });

  return {
    observedNet,
    observedThroughDay: last.day,
    ratios: m.ratios,
    scenarios,
    assumptions: [
      `Earned figures through Day ${last.day} are fixed; only days after Day ${last.day} are projected.`,
      `Remaining days of the current week: Sunday = last Saturday × Sunday uplift; Mon–Thu = last Friday × weekday ratio; Saturday = last Friday × 1.4.`,
      `Following ${TAIL_WEEKS} weeks: each week keeps a fixed share (weekly retention) of the week before, spread evenly across its days.`,
      `India gross = India net × ${g ?? "n/a"} (worldwide minus overseas over cumulative net on Day ${m.ratios.basisDay}).`,
      `Future overseas = future India net × ${os ?? "n/a"} (Day ${m.ratios.basisDay} overseas-to-net ratio) × overseas legs.`,
      "Festival days 3–6 (Diwali week) inflated Week 1, so Week 1 weekdays are not used to project Week 2 weekdays.",
      "Competition, screen-count loss and a mainland China release are not modelled directly; the scenario spread is the allowance for them.",
      "No mainland China revenue is included. See the China sensitivity model.",
    ],
  };
}

/* ------------------------------------------------------------------ */

const GZ_PARAMS = [
  { naWeeklyRetention: 0.4, japanMultiple: 2.5, intlExJapanMultiple: 1.6 },
  { naWeeklyRetention: 0.5, japanMultiple: 3.2, intlExJapanMultiple: 2.0 },
  { naWeeklyRetention: 0.55, japanMultiple: 4.0, intlExJapanMultiple: 2.4 },
  { naWeeklyRetention: 0.6, japanMultiple: 5.0, intlExJapanMultiple: 2.8 },
];

export function forecastGodzilla(input: {
  naCumeThroughW2: number; // USD, projection if actuals not yet in
  naW2Weekend: number;
  japanFirstSixDaysJPY: number;
  jpyPerUsd: number;
  jpyRateSource: string;
  intlWeekendUSD: number;
  japanCumeUSD: number;
}) {
  const w2Weekdays = input.naW2Weekend * 0.55; // Mon–Thu after the second weekend
  const w3Week = input.naW2Weekend * 1.55; // full week ≈ weekend × 1.55
  const intlExJapan = input.intlWeekendUSD - input.japanCumeUSD;
  const scenarios = GZ_PARAMS.map((p, i) => {
    // Week 3 onward: geometric series of TAIL_WEEKS weeks.
    const tail = w3Week * p.naWeeklyRetention * ((1 - p.naWeeklyRetention ** TAIL_WEEKS) / (1 - p.naWeeklyRetention));
    const na = round(input.naCumeThroughW2 + w2Weekdays + tail, 0);
    const japanJPY = round(input.japanFirstSixDaysJPY * p.japanMultiple, 0);
    const japanUSD = round(japanJPY / input.jpyPerUsd, 0);
    const intlEx = round(intlExJapan * p.intlExJapanMultiple, 0);
    return { name: SCENARIOS[i], params: p, northAmerica: na, japanJPY, japanUSD, intlExJapan: intlEx, worldwide: na + japanUSD + intlEx };
  });
  return {
    scenarios,
    inputs: { ...input, intlExJapanToDate: round(intlExJapan, 0) },
    assumptions: [
      `North America: second-weekend figure $${(input.naW2Weekend / 1e6).toFixed(1)}M is a projection until actuals arrive; Mon–Thu after it = weekend × 0.55; later weeks = weekend × 1.55, then shrinking by weekly retention for ${TAIL_WEEKS} weeks.`,
      `Japan: lifetime = first six days (¥${(input.japanFirstSixDaysJPY / 1e9).toFixed(1)}B, Nov 3–8) × multiple. Japanese live-action hits usually run long; Godzilla Minus One finished far above its opening.`,
      `Japan is converted at ¥${round(input.jpyPerUsd, 1)} per USD (${input.jpyRateSource}).`,
      `International excluding Japan: international weekend minus Japan to date ($${(intlExJapan / 1e6).toFixed(1)}M, derived) × multiple.`,
      "No mainland China release is included.",
    ],
  };
}

/* ------------------------------------------------------------------ */

export function chinaSensitivity(baseWorldwideINR: number | null) {
  const cases = [
    { name: "No mainland China release", addINR: 0, rationale: "Current status. No authoritative release date exists." },
    { name: "Limited theatrical release", addINR: 40, rationale: "Small art-house style release of the kind most Indian films receive in China." },
    { name: "Moderate success", addINR: 150, rationale: "Comparable to the better-performing Indian releases in China after Dangal." },
    { name: "Strong success", addINR: 400, rationale: "Broad release with a strong word of mouth run." },
    { name: "Exceptional Dangal-like breakout", addINR: 1300, rationale: "Dangal earned roughly ₹1,300 Cr in China. Treated as a ceiling: Dangal was a contemporary sports drama, and a mythological epic faces different audience tastes, import approval and competition." },
  ];
  return {
    status: "Unconfirmed",
    note: "Hypothetical. None of these amounts is counted as earned revenue.",
    baseWorldwideINR,
    cases: cases.map((c) => ({ ...c, worldwideINR: baseWorldwideINR !== null ? round(baseWorldwideINR + c.addINR) : null })),
  };
}
