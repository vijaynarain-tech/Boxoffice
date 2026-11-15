import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, cr, date, addDaysISO } from "../data";
import { Card, Note, NotReported, Section } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const adv = site.observations.filter((o) => o.period.type === "advance");

export default function Advance() {
  const today = site.today;
  const days = Array.from({ length: 8 }, (_, i) => addDaysISO(today, i));
  const cutoffs = [...new Set(adv.map((o) => (o.period as any).cutoff as string))].sort();
  const latestCutoff = cutoffs.at(-1);
  const chart = latestCutoff
    ? adv.filter((o) => (o.period as any).cutoff === latestCutoff && o.metric === "advance_gross" && !o.language && !o.format).map((o) => ({ label: (o.period as any).showDate, net: o.amount, source: o.source, status: o.status }))
    : [];

  return (
    <>
      <Section eyebrow="Ramayana · presales" title="Advance booking" intro="Presales are tracked separately from box office and never added to realised collections. Comparisons only line up snapshots taken at the same time of day before each show date.">
        <div className="grid gap-4 lg:grid-cols-3">
          {["Today", "Tomorrow", "Weekend"].map((label, i) => {
            const d = i === 2 ? `${date(days.find((x) => new Date(x).getUTCDay() === 5) ?? days[0], { day: "numeric", month: "short" })} – ${date(days.find((x) => new Date(x).getUTCDay() === 0) ?? days[2], { day: "numeric", month: "short" })}` : date(days[i], { weekday: "short", day: "numeric", month: "short" });
            return (
              <Card key={label} title={label} sub={d}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {["Advance gross", "Excl. blocked seats", "Tickets sold", "Shows", "Cinemas", "Occupancy"].map((m) => (
                    <div key={m}>
                      <div className="eyebrow">{m}</div>
                      <NotReported />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
        <Card title="Next 8 show dates" sub={latestCutoff ? `Snapshot at ${latestCutoff}` : "No presales snapshot in the ledger"}>
          {chart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
                <Bar dataKey="net" name="Advance gross" fill={C.ram} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {days.map((d) => (
                <div key={d} className="rounded-lg border border-dashed border-line p-2.5 text-center">
                  <div className="text-[11px] text-mute">{date(d, { weekday: "short" })}</div>
                  <div className="text-xs font-semibold">{date(d, { day: "numeric", month: "short" })}</div>
                  <div className="mt-1 text-[10px] italic text-mute/80">Not reported</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Language, format, city and state presales">
            <NotReported label="No breakdown published" />
          </Card>
          <Card title="Hourly presales trend">
            <NotReported label="No hourly snapshots published" />
          </Card>
        </div>
        <Note>
          How to add a snapshot: record <code className="text-fg">metric: "advance_gross"</code> (or <code className="text-fg">"advance_gross_blocked"</code> for figures that include blocked seats) with <code className="text-fg">period: {"{"} type: "advance", showDate, cutoff {"}"}</code>, where cutoff is the snapshot time such as <code className="text-fg">"06:00 IST, 1 day before"</code>. Charts compare only snapshots that share the same cutoff.
        </Note>
      </Section>
    </>
  );
}
