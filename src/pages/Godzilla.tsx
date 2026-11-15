import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, gzMeta, usd, jpy, date } from "../data";
import { Card, Change, Note, NotReported, Section, Stat } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";
import { GodzillaArt } from "../components/Posters";

const G = site.godzilla.figures as Record<string, any>;
const pick = (o: any) => ({ value: usd(o?.amount), status: o?.status, source: o?.source, url: o?.url });

export default function Godzilla() {
  const drop = G.naOpening && G.naSecondWeekend ? ((G.naSecondWeekend.amount - G.naOpening.amount) / G.naOpening.amount) * 100 : null;
  const weekends = [
    { label: "Weekend 1 (Nov 6–8)", v: G.naOpening?.amount, source: G.naOpening?.source, status: G.naOpening?.status },
    { label: "Weekend 2 (Nov 13–15)", v: G.naSecondWeekend?.amount, source: G.naSecondWeekend?.source, status: G.naSecondWeekend?.status, note: G.naSecondWeekend?.note },
  ];
  const naOpeningAlt = site.observations.filter((o) => o.film === "godzilla" && o.territory === "US-CA" && o.period.type === "weekend" && (o.period as any).start === "2026-11-06" && !o.format);
  return (
    <>
      <Section eyebrow="Godzilla Minus Zero" title="Box office tracker" intro={<>Japan's own "domestic" market is labelled <b>Japan</b>. "North America" means U.S. + Canada, the Hollywood trade's "domestic". The two are never merged.</>}>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="mx-auto w-44 lg:w-full">
            <GodzillaArt className="w-full rounded-xl" />
            <p className="mt-2 text-center text-xs text-mute">
              Dir. {gzMeta.director} · Japan {date(gzMeta.releaseDate)} · North America {date("2026-11-06")}
            </p>
          </div>
          <Card>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="N. America to date" {...pick(G.naCume)} accent="godz" sub="through Nov 15" />
              <Stat label="N. America opening" {...pick(G.naOpening)} sub={`${site.godzilla.theaters.toLocaleString()} theaters`} />
              <Stat label="N. America opening day" {...pick(G.naFriday)} sub="Fri Nov 6, incl. previews" />
              <Stat label="Avg per theater (opening)" value={usd(site.godzilla.avgPerTheaterOpening)} sub="derived" />
              <Stat label="Japan, Nov 3–8" value={jpy(G.japanJPY?.amount)} sub={usd(G.japanUSD?.amount) + " (Box Office Mojo)"} status={G.japanJPY?.status} source={G.japanJPY?.source} accent="godz" />
              <Stat label="Japan weekend Nov 7–8" {...pick(G.japanWeekend)} sub="#1 in Japan" />
              <Stat label="International, to Nov 8" {...pick(G.intlOpening)} sub="includes Japan" />
              <Stat label="Worldwide, to Nov 8" {...pick(G.wwOpening)} accent="godz" />
              <Stat label="Global IMAX opening" {...pick(G.imaxWW)} />
              <Stat label="N. America IMAX" {...pick(G.imaxNA)} sub="40% of opening" />
              <Stat label="Admissions (Japan)" value={null} />
              <Stat label="Production budget" value={gzMeta.budget.text.split(" (")[0]} sub="reported" />
            </div>
          </Card>
        </div>
        {naOpeningAlt.length > 1 && (
          <Note tone="warn">
            Opening weekend estimates differ: {naOpeningAlt.map((o) => `${usd(o.amount)} (${site.sources.find((s) => s.id === o.source)?.name})`).join(", ")}. Variety's later, lower figure is used as primary; Deadline's global total uses the higher one.
          </Note>
        )}
      </Section>
      <Section title="North America weekends">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Weekend gross" sub="USD · hatched style = projection">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} tickFormatter={(v) => `$${v / 1e6}M`} />
                <Tooltip content={<RichTooltip fmt={(v) => usd(v) ?? ""} />} />
                <Bar dataKey="v" name="Weekend gross" radius={[4, 4, 0, 0]}>
                  <Cell fill={C.godz} />
                  <Cell fill={C.godz} fillOpacity={0.4} stroke={C.godz2} strokeDasharray="4 3" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Second-weekend hold">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl"><Change v={drop} /></span>
                <span className="text-xs text-mute">projection, not an actual</span>
              </div>
              <p className="text-sm leading-relaxed text-mute">
                If it holds, this is the steepest second-weekend fall for a first-run Godzilla film in the U.S. Godzilla Minus One fell only 24.8% after an $11.4M opening. Weekend 1 was boosted by a record IMAX share, and Johnny Depp's <i>Ebenezer</i> opened against it.
              </p>
              <Note>Daily North American actuals from Box Office Mojo and The Numbers are added by hand when they publish; both prohibit automated scraping.</Note>
            </div>
          </Card>
        </div>
      </Section>
      <Section title="Daily North America">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>{["Day", "Date", "Gross", "Theaters", "Status"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }, (_, i) => {
                  const d = new Date(Date.UTC(2026, 10, 6 + i)).toISOString().slice(0, 10);
                  const o = i === 0 ? G.naFriday : null;
                  return (
                    <tr key={d} className="border-b border-line/60">
                      <td className="num px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2 text-mute">{date(d, { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="num px-4 py-2">{o ? usd(o.amount) : <NotReported />}</td>
                      <td className="num px-4 py-2">{i < 7 ? site.godzilla.theaters.toLocaleString() : <NotReported />}</td>
                      <td className="px-4 py-2 text-xs text-mute">{o ? o.status : "awaiting actuals"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </>
  );
}
