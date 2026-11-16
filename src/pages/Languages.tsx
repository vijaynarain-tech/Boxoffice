import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, cr, date, sourceName, ledgers, languages as LG, type LCell } from "../data";
import { Card, Coverage, Note, Section, Segmented, Stat, StatusPill } from "../components/ui";
import { axis, C, Legend, RichTooltip } from "../components/charts";

const LANGS = ["Hindi", "Kannada", "Telugu", "Tamil", "Malayalam"] as const;
type L = "All" | (typeof LANGS)[number];
const COLORS: Record<string, string> = { Hindi: C.ram, Kannada: C.ram2, Telugu: C.godz2, Tamil: C.up, Malayalam: "#A78BFA" };
const R = site.ramayana;

function Num({ c, unit = "cr" }: { c: LCell | null; unit?: "cr" }) {
  if (!c) return <span className="text-mute/60">—</span>;
  return (
    <span className="num" title={`${sourceName(c.src)} · ${c.kind}${c.how ? ` (${c.how})` : ""}${c.status ? ` · ${c.status}` : ""}`}>
      {unit === "cr" ? c.v.toFixed(2) : c.v}
      {c.kind === "derived" && <sup className="ml-0.5 font-sans text-[10px] font-bold text-godz-2">ᴰ</sup>}
    </span>
  );
}

export default function Languages() {
  const [lang, setLang] = useState<L>("All");
  const isAll = lang === "All";
  const total = LG.totals.reduce((s, t) => s + (t.v ?? 0), 0);
  const tot = (l: string) => LG.totals.find((t) => t.language === l);
  const days = LG.table.filter((d) => !d.live);
  const live = LG.table.find((d) => d.live);

  const stacked = useMemo(
    () =>
      LG.table.map((d) => {
        const row: Record<string, number | string | null> = { label: `D${d.day}${d.live ? "*" : ""}`, day: d.day, status: d.live ? "live" : "estimated", source: "sacnilk" };
        for (const l of LANGS) row[l] = d.by[l].net?.v ?? null;
        return row;
      }),
    [],
  );
  const single = LG.table.map((d) => ({ label: `D${d.day}${d.live ? "*" : ""}`, net: isAll ? d.total : d.by[lang].net?.v ?? null, status: d.live ? "live" : "estimated", source: "sacnilk" }));
  const langDays = isAll ? days.filter((d) => d.total !== null).length : days.filter((d) => d.by[lang].net).length;
  const cells = days.length * LANGS.length;
  const have = days.reduce((s, d) => s + LANGS.filter((l) => d.by[l].net).length, 0);

  const openingDay = isAll ? R.rows[0].net : LG.table[0].by[lang]?.net?.v ?? null;
  const best = isAll ? null : [...days].filter((d) => d.by[lang].net).sort((a, b) => b.by[lang].net!.v - a.by[lang].net!.v)[0];
  const shows = isAll ? null : [...days].reverse().find((d) => d.by[lang].shows);
  const occ = isAll ? null : [...days].reverse().find((d) => d.by[lang].occupancy);
  const avgOcc = (() => {
    const o = isAll ? ledgers.sacnilk.rows.filter((r) => r.occupancy && r.occScope === "all languages").map((r) => r.occupancy!.v) : days.map((d) => d.by[lang].occupancy).filter((x): x is number => x !== null);
    return o.length ? o.reduce((a, b) => a + b, 0) / o.length : null;
  })();
  const wknd = (l: L) => {
    const v = (d: number): number | null => (l === "All" ? days.find((x) => x.day === d)?.total : days.find((x) => x.day === d)?.by[l].net?.v) ?? null;
    const w1 = [2, 3, 4].map(v), w2 = [9, 10, 11].map(v);
    if (w1.some((x) => x === null) || w2.some((x) => x === null)) return null;
    const a = w1.reduce<number>((s, x) => s + (x ?? 0), 0), b = w2.reduce<number>((s, x) => s + (x ?? 0), 0);
    return ((b - a) / a) * 100;
  };

  return (
    <>
      <Section
        eyebrow="Ramayana · language versions"
        title="Language-wise box office"
        intro="Released in Hindi, Kannada, Telugu, Tamil, Malayalam and English. Pick a language to switch every figure to that version only. Hindi-only figures are never mixed with the all-language India total."
        right={<Segmented label="Language" value={lang} onChange={setLang} options={[{ value: "All", label: "All languages" }, ...LANGS.map((l) => ({ value: l, label: l }))]} />}
      >
        <Coverage have={have} total={cells} label="Language-day figures published (Days 1–11)" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <Card title={isAll ? "All languages combined" : `${lang} version only`} sub={`Sacnilk · totals through Day ${LG.latestDay}`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat label="Total India net" value={cr(isAll ? R.headline.totalNet : tot(lang)?.v)} accent="ram" sub={`Day 1–${LG.latestDay}`} source="sacnilk" />
              <Stat label="Share of India net" value={isAll ? "100%" : tot(lang)?.sharePct ? `${tot(lang)!.sharePct}%` : null} />
              <Stat label="Opening day net" value={cr(openingDay)} sub={!isAll && !openingDay ? "Day 1 split not published" : "Day 1"} />
              <Stat label="Best day" value={isAll ? cr(R.headline.highestDay.net) : best ? cr(best.by[lang].net!.v) : null} sub={isAll ? `Day ${R.headline.highestDay.day}` : best ? `Day ${best.day}` : undefined} />
              <Stat label="Shows (latest day)" value={isAll ? ledgers.sacnilk.rows.at(-1)?.shows ? ledgers.sacnilk.rows.at(-1)!.shows!.v.toLocaleString("en-IN") : null : shows ? shows.by[lang].shows!.toLocaleString("en-IN") : null} sub={isAll ? `Day ${ledgers.sacnilk.rows.length}` : shows ? `Day ${shows.day}` : "Not published for this version"} />
              <Stat label="Occupancy (latest)" value={isAll ? ledgers.sacnilk.rows.at(-1)?.occupancy ? `${ledgers.sacnilk.rows.at(-1)!.occupancy!.v}%` : null : occ ? `${occ.by[lang].occupancy}%` : null} sub={isAll ? `Day ${ledgers.sacnilk.rows.length}` : occ ? `Day ${occ.day}` : "Not published for this version"} />
              <Stat label="Average occupancy" value={avgOcc !== null ? `${avgOcc.toFixed(1)}%` : isAll ? null : null} sub={avgOcc !== null ? "Days with a published figure" : undefined} />
              <Stat label="2nd weekend vs 1st" value={wknd(lang) !== null ? `${wknd(lang)! > 0 ? "+" : ""}${wknd(lang)!.toFixed(1)}%` : null} sub="Fri–Sun, Day 9–11 vs Day 2–4" />
              {!isAll && LG.cume[lang]?.find((c) => c.day === 6) && <Stat label="First 6 days" value={cr(LG.cume[lang].find((c) => c.day === 6)!.v)} source="sacnilk" />}
              {live && <Stat label={`Today, live (Day ${live.day})`} value={cr(isAll ? live.total : live.by[lang]?.net?.v)} status="live" source="sacnilk" />}
            </div>
          </Card>
          <Card title={isAll ? "India net by day, all languages" : `${lang} net by day`} sub={`₹ crore · ${langDays} of ${days.length} days published · * live`}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={single} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
                <Bar dataKey="net" name={isAll ? "All languages" : lang} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {single.map((d) => <Cell key={d.label} fill={isAll ? C.ram : COLORS[lang]} fillOpacity={d.status === "live" ? 0.45 : 1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-mute">Gaps are days where no tracker published this version's figure; they are not zero.</p>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Contribution" title="Which versions drive the total" intro={`Sacnilk's language split through Day ${LG.latestDay} adds up to the all-language India net of ${cr(total)}.`}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card title={`India net by version, Day 1–${LG.latestDay}`}>
            <div className="flex flex-col gap-3">
              {LG.totals.map((t) => (
                <div key={t.language}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t.language}</span>
                    <span className="num">{cr(t.v)} <span className="text-mute">· {t.sharePct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${t.sharePct ?? 0}%`, background: COLORS[t.language] }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-mute">The four South Indian dubbed versions made ₹104.45 Cr in six days, the first Hindi-origin film to pass ₹100 Cr net in dubbed South versions (Sacnilk). English-version grosses are not reported in India.</p>
            </div>
          </Card>
          <Card title="Daily split by version" sub="₹ crore · stacked · * live">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stacked} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
                {LANGS.map((l, i) => <Bar key={l} dataKey={l} stackId="s" fill={COLORS[l]} radius={i === LANGS.length - 1 ? [3, 3, 0, 0] : undefined} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2"><Legend items={LANGS.map((l) => ({ color: COLORS[l], label: l }))} /></div>
            <p className="mt-1 text-xs text-mute">Days 1, 3 and 5: Tamil and Malayalam are published only as a combined remainder, so they are left out.</p>
          </Card>
        </div>
      </Section>

      <Section title="Day-wise by version" intro="Net in ₹ crore, then shows and occupancy where Sacnilk published them. Hover a figure for its source.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-3 py-2.5">Day</th>
                  <th className="px-3 py-2.5">All langs</th>
                  {LANGS.map((l) => (
                    <th key={l} className="px-3 py-2.5" style={{ color: COLORS[l] }}>{l}</th>
                  ))}
                  <th className="px-3 py-2.5">Hindi shows</th>
                  <th className="px-3 py-2.5">Hindi occ.</th>
                  <th className="px-3 py-2.5">South shows</th>
                </tr>
              </thead>
              <tbody>
                {LG.table.map((d) => {
                  const south = (["Kannada", "Telugu"] as const).filter((l) => d.by[l].shows);
                  return (
                    <tr key={d.day} className={`border-b border-line/60 ${d.live ? "bg-ram-2/[0.06]" : ""}`}>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="num font-semibold">{d.day}</span> <span className="text-xs text-mute">{date(d.date, { day: "numeric", month: "short" })}</span> {d.live && <StatusPill status="live" />}
                      </td>
                      <td className="num px-3 py-2.5">{d.total?.toFixed(2) ?? "—"}</td>
                      {(() => {
                        // Tamil + Malayalam published only as a combined remainder on some days.
                        const known = (["Hindi", "Kannada", "Telugu"] as const).every((l) => d.by[l].net);
                        const both = !d.by.Tamil.net && !d.by.Malayalam.net && known && d.total !== null;
                        const rest = both ? d.total! - (["Hindi", "Kannada", "Telugu"] as const).reduce((s, l) => s + d.by[l].net!.v, 0) : 0;
                        return LANGS.map((l) =>
                          both && l === "Tamil" ? (
                            <td key={l} colSpan={2} className="px-3 py-2.5 text-center">
                              <span className="num" title="All-language net minus Hindi, Kannada and Telugu">{rest.toFixed(2)}</span>
                              <span className="ml-1 text-[10px] text-mute">combined</span>
                            </td>
                          ) : both && l === "Malayalam" ? null : (
                            <td key={l} className="px-3 py-2.5"><Num c={d.by[l].net} /></td>
                          ),
                        );
                      })()}
                      <td className="num px-3 py-2.5">{d.by.Hindi.shows?.toLocaleString("en-IN") ?? <span className="text-mute/60">—</span>}</td>
                      <td className="num px-3 py-2.5">{d.by.Hindi.occupancy !== null ? `${d.by.Hindi.occupancy.toFixed(1)}%` : <span className="text-mute/60">—</span>}</td>
                      <td className="px-3 py-2.5 text-xs text-mute">{south.length ? south.map((l) => `${l} ${d.by[l].shows!.toLocaleString("en-IN")}`).join(" · ") : "—"}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-line font-semibold">
                  <td className="px-3 py-2.5">Total D1–{LG.latestDay}</td>
                  <td className="num px-3 py-2.5">{total.toFixed(2)}</td>
                  {LANGS.map((l) => (
                    <td key={l} className="num px-3 py-2.5">{tot(l)?.v?.toFixed(2) ?? "—"}</td>
                  ))}
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute"><sup className="font-bold text-godz-2">ᴰ</sup> derived as the all-language net minus the other four versions. Tamil and Malayalam show counts and South occupancy are not published by trackers.</p>
        </Card>
        <Note>To add a figure, drop an observation with <code className="text-fg">"language": "Tamil"</code> into <code className="text-fg">data/inbox/</code>; the next scheduled run validates and publishes it.</Note>
      </Section>
    </>
  );
}
