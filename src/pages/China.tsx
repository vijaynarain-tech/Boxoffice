import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, cr, date } from "../data";
import { Card, Note, Section, StatusPill } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const CH = site.ramayana.china;
const status = site.films.china as Record<string, { status: string; note: string; checkedAt: string }>;

export default function China() {
  const [sel, setSel] = useState(0);
  const data = CH.cases.map((c, i) => ({ label: c.name.replace("Exceptional ", ""), base: CH.baseWorldwideINR, add: c.addINR, total: c.worldwideINR, i, note: c.rationale, status: "projection" }));
  return (
    <>
      <Section eyebrow="Mainland China" title="China release tracking" intro="Nitesh Tiwari's Dangal became one of the biggest Indian releases ever in China. That history does not make a Ramayana release in China likely or successful, so the scenarios below are hypothetical.">
        <div className="grid gap-4 md:grid-cols-2">
          {(["ramayana", "godzilla"] as const).map((f) => (
            <Card key={f} title={f === "ramayana" ? "Ramayana: Rise of a Legend" : "Godzilla Minus Zero"}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  Mainland China theatrical release: <StatusPill status="unconfirmed" /> <span className="font-semibold">{status[f].status}</span>
                </div>
                <p className="text-sm text-mute">{status[f].note}</p>
                <p className="text-xs text-mute">Last checked {date(status[f].checkedAt)}. A date is shown only once announced by the distributor, China Film Administration or an equivalent authority.</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="Ramayana China sensitivity" intro={`Added to the base-case worldwide forecast of ${cr(CH.baseWorldwideINR, 0)}. ${CH.note}`}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Worldwide lifetime with a China release" sub="₹ crore · base-case forecast plus China scenario">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} onClick={(e: any) => e?.activeTooltipIndex !== undefined && setSel(e.activeTooltipIndex)}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} interval={0} tick={{ fill: C.mute, fontSize: 10 }} />
                <YAxis {...axis} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip content={<RichTooltip fmt={(v) => cr(v, 0) ?? ""} />} />
                <Bar dataKey="base" stackId="a" name="Base forecast" fill="#3a3324" />
                <Bar dataKey="add" stackId="a" name="China scenario" radius={[4, 4, 0, 0]}>
                  {data.map((d) => <Cell key={d.i} fill={d.i === sel ? C.ram : C.ram2} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Scenarios">
            <ul className="flex flex-col gap-2">
              {CH.cases.map((c, i) => (
                <li key={c.name}>
                  <button onClick={() => setSel(i)} className={`w-full rounded-lg border p-3 text-left transition ${sel === i ? "border-ram/50 bg-ram/[0.06]" : "border-line hover:border-mute/40"}`}>
                    <div className="flex items-center justify-between gap-2 text-sm font-medium">
                      {c.name}
                      <span className="num text-ram">+{cr(c.addINR, 0)}</span>
                    </div>
                    {sel === i && <p className="mt-1.5 text-xs leading-relaxed text-mute">{c.rationale} Worldwide total: {cr(c.worldwideINR, 0)}.</p>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Note tone="warn">Genre, audience taste, marketing, import-quota approval and local competition all differ from Dangal's 2017 release. The Dangal-like case is a ceiling, not a forecast.</Note>
      </Section>
    </>
  );
}
