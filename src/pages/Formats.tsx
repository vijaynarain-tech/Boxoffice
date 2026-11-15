import { Bar, BarChart, CartesianGrid, Legend as RLegend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, usd } from "../data";
import { Card, Note, NotReported, Section, SourceTag } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const imax = site.observations.filter((o) => o.format === "IMAX");
const gz = site.godzilla.figures as Record<string, any>;
const ramIn = imax.find((o) => o.film === "ramayana" && o.territory === "IN")!;
const ramNA = imax.find((o) => o.film === "ramayana" && o.territory === "US-CA")!;
const ramOther = imax.find((o) => o.film === "ramayana" && o.territory === "INTL_OTHER")!;
const ramTotal = ramIn.amount + ramNA.amount + ramOther.amount;
const ramWW = site.headToHead[0].ramayana!.amount;

export default function Formats() {
  const data = [
    { label: "Global IMAX opening", Ramayana: ramTotal, Godzilla: gz.imaxWW.amount, source: "deadline / imax" },
    { label: "North America IMAX", Ramayana: ramNA.amount, Godzilla: gz.imaxNA.amount, source: "deadline / imax" },
  ];
  const FORMATS = ["Standard 2D", "Standard 3D", "IMAX 2D", "IMAX 3D", "4DX", "Dolby Cinema", "Other PLF"];
  return (
    <>
      <Section eyebrow="Premium formats" title="IMAX comparison" intro="Like for like only: the global IMAX opening weekend against the global IMAX opening weekend, both for Nov 6–8.">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="IMAX opening weekend, Nov 6–8" sub="USD">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} tickFormatter={(v) => `$${v / 1e6}M`} />
                <Tooltip content={<RichTooltip fmt={(v) => usd(v) ?? ""} />} />
                <RLegend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Ramayana" fill={C.ram} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Godzilla" fill={C.godz} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="IMAX share of the opening">
            <div className="flex flex-col gap-4 text-sm">
              {[
                ["Godzilla −0.0, worldwide", gz.imaxWW.amount, gz.wwOpening.amount, C.godz, "imax"],
                ["Godzilla −0.0, North America", gz.imaxNA.amount, site.observations.find((o) => o.source === "thr")!.amount, C.godz2, "imax"],
                ["Ramayana, worldwide", ramTotal, ramWW, C.ram, "deadline"],
                ["Ramayana, North America vs U.S. total", ramNA.amount, site.headToHead[1].ramayana!.amount, C.ram2, "deadline"],
              ].map(([l, a, b, c, s]) => (
                <div key={l as string}>
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{l as string}</span>
                    <span className="num">{(((a as number) / (b as number)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${((a as number) / (b as number)) * 100}%`, background: c as string }} />
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {usd(a as number)} of {usd(b as number)} · <SourceTag id={s as string} compact />
                  </div>
                </div>
              ))}
              <p className="text-xs text-mute">Ramayana's North America line divides U.S. + Canada IMAX by a U.S.-only total, so it slightly overstates the share.</p>
            </div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Ramayana IMAX by market" sub="Deadline, Nov 6–8">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex justify-between"><span>India</span><span className="num">{usd(ramIn.amount)}</span></li>
              <li className="flex justify-between"><span>North America (53 screens)</span><span className="num">{usd(ramNA.amount)}</span></li>
              <li className="flex justify-between"><span>32 other territories</span><span className="num">{usd(ramOther.amount)}</span></li>
              <li className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total (derived)</span><span className="num">{usd(ramTotal)}</span></li>
            </ul>
          </Card>
          <Card title="Godzilla IMAX records" sub="IMAX Corporation">
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-mute">
              <li>Biggest global IMAX opening for a Japanese film ({usd(gz.imaxWW.amount)}).</li>
              <li>40% of the North American opening: the largest domestic opening-weekend share in IMAX history.</li>
            </ul>
          </Card>
          <Card title="Per-screen">
            <p className="text-sm text-mute">Ramayana averaged {usd(ramNA.amount / 53)} per North American IMAX screen. Godzilla's IMAX screen count has not been published.</p>
          </Card>
        </div>
      </Section>
      <Section title="All formats" intro="Tickets, shows, occupancy and average ticket price by format are not published for either film yet.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  {["Format", "Ramayana gross", "Godzilla gross", "Tickets", "Avg ticket price", "Shows", "Occupancy", "Share of revenue"].map((h) => (
                    <th key={h} className="px-3 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((f) => (
                  <tr key={f} className="border-b border-line/60">
                    <td className="px-3 py-2.5 font-medium">{f}</td>
                    <td className="num px-3 py-2.5">{f === "IMAX 2D" ? `${usd(ramTotal)} (opening, all IMAX)` : <NotReported />}</td>
                    <td className="num px-3 py-2.5">{f === "IMAX 2D" ? `${usd(gz.imaxWW.amount)} (opening, all IMAX)` : <NotReported />}</td>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <td key={i} className="px-3 py-2.5"><NotReported /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Note>Sources report IMAX as one figure without a 2D/3D split, so it is placed on the IMAX 2D row and labelled.</Note>
      </Section>
    </>
  );
}
