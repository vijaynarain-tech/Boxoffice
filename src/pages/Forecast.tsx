import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, cr, usd, jpy, dateTimeIST } from "../data";
import { Card, Note, Section, Segmented, StatusPill } from "../components/ui";
import { axis, C, Legend, RichTooltip } from "../components/charts";

const RF = site.ramayana.forecast;
const GF = site.godzilla.forecast;

export default function Forecast() {
  const [film, setFilm] = useState<"ramayana" | "godzilla">("ramayana");
  const days = RF.scenarios[0].wwPath.map((p, i) => {
    const row: Record<string, any> = { day: p.day, projected: p.projected };
    RF.scenarios.forEach((s) => (row[s.name] = s.wwPath[i]?.worldwide ?? null));
    row.earned = p.projected ? null : RF.scenarios[0].wwPath[i].worldwide;
    return row;
  });
  const dangal = site.leaderboards.worldwide.find((r: any) => r.film === "dangal");

  return (
    <>
      <Section
        eyebrow="Projections"
        title="Lifetime prediction engine"
        intro="Four scenarios per film. Each uses only figures already in the ledger plus the parameters printed below. Nothing here is counted as earned."
        right={<Segmented label="Film" value={film} onChange={setFilm} options={[{ value: "ramayana", label: "Ramayana" }, { value: "godzilla", label: "Godzilla −0.0" }]} />}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
          <StatusPill status="projection" /> Last recalculated {dateTimeIST(site.generatedAt)}
        </div>
        {film === "ramayana" ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RF.scenarios.map((s, i) => (
                <Card key={s.name} className={i === 1 ? "!border-ram/40" : ""}>
                  <div className="eyebrow" style={{ color: C.scen[i] }}>{s.name}</div>
                  <div className="num mt-2 text-2xl font-semibold">{cr(s.lifetimeWorldwide, 0)}</div>
                  <div className="text-xs text-mute">worldwide gross</div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                    <dt className="text-mute">India net</dt><dd className="num text-right">{cr(s.lifetimeNet, 0)}</dd>
                    <dt className="text-mute">India gross</dt><dd className="num text-right">{cr(s.lifetimeGross, 0)}</dd>
                    <dt className="text-mute">Overseas</dt><dd className="num text-right">{cr(s.lifetimeOverseas, 0)}</dd>
                  </dl>
                  <div className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-mute">
                    Sunday ×{s.params.sundayUplift} · weekday {Math.round(s.params.weekdayVsFriday * 100)}% of Fri · weekly retention {Math.round(s.params.weeklyRetention * 100)}% · overseas legs ×{s.params.overseasLegs}
                  </div>
                </Card>
              ))}
            </div>
            <Card title="Cumulative worldwide path" sub="₹ crore · solid = earned checkpoints scaled to the daily India net, lines = scenarios">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" {...axis} tickFormatter={(d) => `D${d}`} interval={6} />
                  <YAxis {...axis} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={<RichTooltip fmt={(v) => cr(v, 0) ?? ""} labelFmt={(l, p) => `Day ${l}${p.projected ? " (projected)" : ""}`} />} />
                  {dangal && <ReferenceLine y={dangal.amount} stroke={C.mute} strokeDasharray="3 3" label={{ value: `Dangal ${cr(dangal.amount, 0)}`, fill: C.mute, fontSize: 11, position: "insideTopLeft" }} />}
                  {RF.scenarios.map((s, i) => (
                    <Line key={s.name} dataKey={s.name} stroke={C.scen[i]} strokeWidth={i === 1 ? 2.5 : 1.5} strokeDasharray={i === 1 ? undefined : "5 4"} dot={false} />
                  ))}
                  <Line dataKey="earned" name="Earned" stroke={C.fg} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2">
                <Legend items={[{ color: C.fg, label: "Earned" }, ...RF.scenarios.map((s, i) => ({ color: C.scen[i], label: s.name, dashed: i !== 1 }))]} />
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Assumptions">
                <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-mute">
                  {RF.assumptions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </Card>
              <Card title="Uncertainty">
                <p className="text-sm leading-relaxed text-mute">
                  The range from Conservative to Exceptional is {cr(RF.scenarios[0].lifetimeWorldwide, 0)} to {cr(RF.scenarios[3].lifetimeWorldwide, 0)} worldwide, a spread of {Math.round(((RF.scenarios[3].lifetimeWorldwide! - RF.scenarios[0].lifetimeWorldwide!) / RF.scenarios[1].lifetimeWorldwide!) * 100)}% around the base case. Week 2 holds have been unusually strong (Friday and Saturday near or above Week 1), which is why the base case keeps half of each week's business into the next.
                </p>
                <p className="mt-3 text-sm text-mute">
                  Factors not yet in the ledger: screen retention, occupancy, upcoming competition and advance bookings. When they are added they can replace the fixed weekly retention.
                </p>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GF.scenarios.map((s, i) => (
                <Card key={s.name} className={i === 1 ? "!border-godz/50" : ""}>
                  <div className="eyebrow" style={{ color: C.scen[i] }}>{s.name}</div>
                  <div className="num mt-2 text-2xl font-semibold">{usd(s.worldwide)}</div>
                  <div className="text-xs text-mute">worldwide gross</div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                    <dt className="text-mute">N. America</dt><dd className="num text-right">{usd(s.northAmerica)}</dd>
                    <dt className="text-mute">Japan</dt><dd className="num text-right">{jpy(s.japanJPY)}</dd>
                    <dt className="text-mute">Japan (USD)</dt><dd className="num text-right">{usd(s.japanUSD)}</dd>
                    <dt className="text-mute">Intl ex-Japan</dt><dd className="num text-right">{usd(s.intlExJapan)}</dd>
                  </dl>
                  <div className="mt-3 border-t border-line pt-2 text-[11px] text-mute">
                    NA retention {Math.round(s.params.naWeeklyRetention * 100)}% · Japan ×{s.params.japanMultiple} · intl ×{s.params.intlExJapanMultiple}
                  </div>
                </Card>
              ))}
            </div>
            <Card title="Assumptions">
              <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-mute">
                {GF.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </Card>
          </>
        )}
        <Note>Comparable films, holiday calendars and remaining territory releases change the parameters by hand today. Each change is a commit to the repository, so the history of every assumption is kept.</Note>
      </Section>
    </>
  );
}
