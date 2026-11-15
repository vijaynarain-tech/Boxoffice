import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend as RLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, cr, date } from "../data";
import { Card, Coverage, Note, NotReported, Section, Segmented, SourceTag, StatusPill } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const regionObs = site.ramayana.regions as (typeof site.observations[number] & { label: string })[];

/* Tile cartogram: one equal tile per state, placed near its real position. */
const TILES: [string, string, number, number][] = [
  ["JK", "Jammu & Kashmir", 3, 0],
  ["PB", "Punjab", 2, 1], ["HP", "Himachal Pradesh", 3, 1], ["UK", "Uttarakhand", 4, 1],
  ["RJ", "Rajasthan", 1, 2], ["HR", "Haryana", 2, 2], ["DL", "Delhi", 3, 2], ["UP", "Uttar Pradesh", 4, 2], ["BR", "Bihar", 5, 2], ["SK", "Sikkim", 6, 2], ["AS", "Assam", 7, 2], ["AR", "Arunachal Pradesh", 8, 2],
  ["GJ", "Gujarat", 1, 3], ["MP", "Madhya Pradesh", 2, 3], ["CG", "Chhattisgarh", 3, 3], ["JH", "Jharkhand", 4, 3], ["WB", "West Bengal", 5, 3], ["ML", "Meghalaya", 6, 3], ["NL", "Nagaland", 7, 3], ["MN", "Manipur", 8, 3],
  ["MH", "Maharashtra", 2, 4], ["TG", "Telangana", 3, 4], ["OD", "Odisha", 4, 4], ["TR", "Tripura", 6, 4], ["MZ", "Mizoram", 7, 4],
  ["GA", "Goa", 1, 5], ["KA", "Karnataka", 2, 5], ["AP", "Andhra Pradesh", 3, 5],
  ["KL", "Kerala", 2, 6], ["TN", "Tamil Nadu", 3, 6],
];
const nameFor = (label: string) => (label === "Andhra Pradesh & Telangana" ? ["Andhra Pradesh", "Telangana"] : [label]);

const CIRCUITS: [string, string, string | null][] = [
  ["Mumbai", "Maharashtra, Gujarat, Goa", null],
  ["Delhi-UP", "Delhi, Uttar Pradesh, Uttarakhand", null],
  ["East Punjab", "Punjab, Haryana, Himachal, J&K", null],
  ["Rajasthan", "Rajasthan", null],
  ["CP Berar", "Vidarbha (Maharashtra), Chhattisgarh", null],
  ["CI", "Madhya Pradesh", null],
  ["Bihar", "Bihar, Jharkhand", null],
  ["West Bengal", "West Bengal, Odisha, Northeast", null],
  ["Nizam", "Telangana", "AP/TG is reported combined by Sacnilk"],
  ["Andhra", "Andhra Pradesh", "AP/TG is reported combined by Sacnilk"],
  ["Mysore", "Karnataka", "Karnataka state gross is published day-wise"],
  ["Tamil Nadu / Kerala", "Tamil Nadu, Kerala", "Both states published day-wise"],
];
const CITIES = ["Mumbai", "Delhi-NCR", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kochi", "Chandigarh", "Patna"];

export default function Regions() {
  const [metric, setMetric] = useState<"net" | "gross">("net");
  const cumNet = regionObs.filter((o) => o.metric === "net" && o.period.type === "cume");
  const cumGross = regionObs.filter((o) => o.metric === "gross" && o.period.type === "cume" && o.region);
  const mapObs = metric === "net" ? cumNet : cumGross;
  const valueByState = useMemo(() => {
    const m = new Map<string, (typeof mapObs)[number]>();
    for (const o of mapObs) for (const n of nameFor(o.label)) m.set(n, o);
    return m;
  }, [mapObs]);
  const max = Math.max(...mapObs.map((o) => o.amount), 1);
  const [sel, setSel] = useState<string>("Karnataka");
  const selObs = regionObs.filter((o) => nameFor(o.label).includes(sel));

  const days = [2, 3, 5, 7, 9];
  const southStates = ["Karnataka", "Andhra Pradesh & Telangana", "Tamil Nadu", "Kerala"];
  const southDaily = days.map((d) => {
    const row: Record<string, any> = { label: `D${d}`, source: "sacnilk", status: "final" };
    for (const s of southStates) row[s] = regionObs.find((o) => o.label === s && o.period.type === "day" && (o.period as any).day === d)?.amount ?? null;
    return row;
  });
  const ranked = [...cumNet].sort((a, b) => b.amount - a.amount);
  const statesWithData = new Set(regionObs.filter((o) => o.region).flatMap((o) => nameFor(o.label)));

  return (
    <>
      <Section eyebrow="Ramayana · India" title="States, cities and circuits" intro="Revenue and occupancy are ranked separately. Advance-booking figures are never shown as box-office totals.">
        <Coverage have={[...statesWithData].filter((s) => TILES.some((t) => t[1] === s)).length} total={TILES.length} label="States with any reported figure" />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card
            title="India state map"
            sub="Tile map: each state is one equal tile, placed near its location"
            right={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: "net", label: "Cumulative net" }, { value: "gross", label: "Cumulative gross" }]} />}
          >
            <div className="scroll-x">
              <div className="relative mx-auto grid min-w-[320px] max-w-[460px] grid-cols-9 gap-1" role="group" aria-label="States">
                {TILES.map(([code, name, x, y]) => {
                  const o = valueByState.get(name);
                  const t = o ? 0.25 + 0.75 * (o.amount / max) : 0;
                  return (
                    <button
                      key={code}
                      onClick={() => setSel(name)}
                      style={{ gridColumn: x + 1, gridRow: y + 1, background: o ? `rgba(245,185,66,${t})` : undefined }}
                      className={`aspect-square rounded-md border text-[10px] font-bold transition ${o ? "border-ram/40 text-ink" : "border-line bg-surface text-mute"} ${sel === name ? "ring-2 ring-godz-2" : ""}`}
                      aria-label={`${name}: ${o ? cr(o.amount) : "not reported"}`}
                      title={name}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-xs text-mute">
              {metric === "net" ? "Cumulative net from Bollywood Hungama's state report." : "Cumulative gross: South total from Sacnilk (Day 1–3) and Maharashtra from TrackTollywood (live, Day 11)."} Grey tiles have no published figure.
            </p>
          </Card>
          <Card title={sel} sub="Every figure published for this state">
            {selObs.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {selObs.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div>
                        {o.metric === "net" ? "Net" : "Gross"} · {o.period.type === "day" ? `Day ${(o.period as any).day}` : (o.period as any).throughDay ? `cumulative to Day ${(o.period as any).throughDay}` : "cumulative"}
                        {o.label !== sel && <span className="text-mute"> ({o.label})</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <SourceTag id={o.source} url={o.url} compact /> <StatusPill status={o.status} />
                      </div>
                    </div>
                    <span className="num font-semibold">{cr(o.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <NotReported label={`No figures published for ${sel}`} />
            )}
            {selObs.some((o) => o.note) && <p className="mt-2 text-xs text-mute">{selObs.find((o) => o.note)?.note}</p>}
          </Card>
        </div>
      </Section>

      <Section title="Rankings">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Highest revenue states" sub="Cumulative net · Bollywood Hungama">
            <ol className="flex flex-col gap-2.5">
              {ranked.map((o, i) => (
                <li key={o.id} className="flex items-center gap-3 text-sm">
                  <span className="num w-5 text-mute">{i + 1}</span>
                  <span className="w-28 shrink-0">{o.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-ram" style={{ width: `${(o.amount / ranked[0].amount) * 100}%` }} />
                  </div>
                  <span className="num w-24 text-right">{cr(o.amount)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-mute">Maharashtra was about 20% of the all-India total in this report. The cutoff day is not stated in the article.</p>
          </Card>
          <Card title="Highest occupancy states" sub="Separate ranking">
            <div className="grid h-full min-h-[120px] place-items-center">
              <NotReported label="State occupancy has not been published" />
            </div>
          </Card>
        </div>
        <Card title="South India, day-wise gross" sub="₹ crore · Sacnilk state reports for the days they were published">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={southDaily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
              <RLegend wrapperStyle={{ fontSize: 11, color: C.mute }} />
              {southStates.map((s, i) => (
                <Line key={s} dataKey={s} name={s} stroke={[C.ram, C.ram2, C.godz2, C.up][i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-mute">Days 4, 6 and 8 have no published state split; lines connect across them.</p>
        </Card>
      </Section>

      <Section title="Trade circuits" intro="Circuits are the distribution territories the trade uses. None of the tracked sources has published circuit totals for Ramayana yet.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-4 py-2.5">Circuit</th>
                  <th className="px-4 py-2.5">Covers</th>
                  <th className="px-4 py-2.5">Daily</th>
                  <th className="px-4 py-2.5">Cumulative</th>
                  <th className="px-4 py-2.5">Occupancy</th>
                  <th className="px-4 py-2.5">Nearest published figure</th>
                </tr>
              </thead>
              <tbody>
                {CIRCUITS.map(([c, cover, near]) => (
                  <tr key={c} className="border-b border-line/60">
                    <td className="px-4 py-2.5 font-medium">{c}</td>
                    <td className="px-4 py-2.5 text-mute">{cover}</td>
                    <td className="px-4 py-2.5"><NotReported /></td>
                    <td className="px-4 py-2.5"><NotReported /></td>
                    <td className="px-4 py-2.5"><NotReported /></td>
                    <td className="px-4 py-2.5 text-xs text-mute">{near ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="Major cities">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CITIES.map((c) => {
            const o = regionObs.find((x) => x.city === c || (c === "Bengaluru" && x.city === "Bengaluru"));
            return (
              <div key={c} className="card p-3">
                <div className="text-xs font-semibold">{c}</div>
                {o ? (
                  <>
                    <div className="num mt-1 text-sm text-ram">{cr(o.amount)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-mute">
                      gross <StatusPill status={o.status} />
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-[11px] italic text-mute/80">Not reported</div>
                )}
              </div>
            );
          })}
        </div>
        <Note>City figures need a ticketing or trade source that publishes them. Bengaluru's figure is TrackTollywood's live gross through Day 11, {date("2026-11-15")}.</Note>
      </Section>
    </>
  );
}
