import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, ramMeta, cr } from "../data";
import { Card, Coverage, Note, NotReported, Section, Segmented, Stat } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const LANGS = ["All", ...ramMeta.languages] as const;
type L = (typeof LANGS)[number];
const R = site.ramayana;
const langObs = site.observations.filter((o) => o.film === "ramayana" && o.language);

const METRICS = ["Opening day net", "Daily net", "Total India net", "Total India gross", "Share of India net", "Shows / screens", "Average occupancy", "Tickets sold", "Advance booking gross", "Weekend growth", "Best cities", "Best states"];

export default function Languages() {
  const [lang, setLang] = useState<L>("All");
  const obs = langObs.filter((o) => o.language === lang);
  const day1 = obs.find((o) => o.period.type === "day" && (o.period as any).day === 1 && o.metric === "net");
  const isAll = lang === "All";
  const allDay1 = R.rows[0].net!;
  const hindiDay1 = langObs.find((o) => o.language === "Hindi" && (o.period as any).day === 1)?.amount ?? null;

  const shareData = hindiDay1
    ? [
        { label: "Hindi", net: hindiDay1, source: "sacnilk", status: "final" },
        { label: "Other 5 languages", net: +(allDay1 - hindiDay1).toFixed(2), source: "sacnilk", status: "derived", note: "All-language Day 1 net minus Hindi Day 1 net. Not split by language in any source yet." },
      ]
    : [];
  const covered = ramMeta.languages.filter((l) => langObs.some((o) => o.language === l)).length;
  const daily = isAll ? R.rows.map((r) => ({ label: `D${r.day}`, net: r.net, source: r.netSource, status: r.netStatus })) : R.rows.map((r) => ({ label: `D${r.day}`, net: obs.find((o) => (o.period as any).day === r.day)?.amount ?? null, source: "sacnilk", status: "final" }));
  const hasDaily = daily.some((d) => d.net !== null);

  return (
    <>
      <Section
        eyebrow="Ramayana · language versions"
        title="Language-wise box office"
        intro="Ramayana released in Hindi, Tamil, Telugu, Kannada, Malayalam and English. Choosing a language switches every figure to that version only. Hindi-only net is never mixed with the all-language India net."
        right={<Segmented label="Language" value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l === "All" ? "All languages" : l }))} />}
      >
        <Coverage have={covered} total={ramMeta.languages.length} label="Languages with any reported figure" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card title={isAll ? "All languages combined" : `${lang} version only`} sub={isAll ? "India net, all versions" : "Per-version figures published by trackers"}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {isAll ? (
                <>
                  <Stat label="Opening day net" value={cr(allDay1)} source="sacnilk" status="final" />
                  <Stat label="Total India net" value={cr(R.headline.totalNet)} sub={`Day 1–${R.lastReportedDay}`} source="sacnilk" accent="ram" />
                  <Stat label="Total India gross" value={cr(R.headline.indiaGross?.amount)} status="derived" />
                  <Stat label="Share of India net" value="100%" />
                </>
              ) : (
                <>
                  <Stat label="Opening day net" value={cr(day1?.amount)} source={day1?.source} status={day1?.status} />
                  <Stat label="Total India net" value={null} />
                  <Stat label="Total India gross" value={null} />
                  <Stat label="Share of Day 1 net" value={day1 ? `${((day1.amount / allDay1) * 100).toFixed(1)}%` : null} />
                </>
              )}
              {METRICS.slice(5).map((m) => (
                <Stat key={m} label={m} value={null} />
              ))}
            </div>
          </Card>
          <Card title={isAll ? "India net by day, all languages" : `${lang} net by day`} sub="₹ crore">
            {hasDaily ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
                  <Bar dataKey="net" name={isAll ? "All languages" : lang} fill={isAll ? C.ram : C.ram2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-[240px] place-items-center">
                <NotReported label={`No day-wise ${lang} figures have been published yet`} />
              </div>
            )}
            {!isAll && hasDaily && <p className="text-xs text-mute">Only Day 1 has a published {lang} figure; later days show as gaps, not zero.</p>}
          </Card>
        </div>
      </Section>

      <Section eyebrow="Contribution" title="Which versions drive the total" intro="Day 1 is the only day with a published language split.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Day 1 India net by version" sub="₹ crore">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={shareData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="label" width={120} {...axis} />
                <Tooltip content={<RichTooltip fmt={(v) => cr(v) ?? ""} />} />
                <Bar dataKey="net" name="Day 1 net" radius={[0, 4, 4, 0]}>
                  <Cell fill={C.ram} />
                  <Cell fill="#6b5a3a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {hindiDay1 && <p className="mt-2 text-xs text-mute">Hindi was {((hindiDay1 / allDay1) * 100).toFixed(1)}% of Day 1 India net. The other five versions together made {cr(allDay1 - hindiDay1)} (derived).</p>}
          </Card>
          <Card title="Reading regional figures">
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-mute">
              <p>State-wise gross from Karnataka, Tamil Nadu, Kerala and Andhra Pradesh/Telangana is shown on the States page. Those totals include every version playing in that state, so Karnataka's gross is not the Kannada-version gross.</p>
              <Note>To add a language figure, drop an observation with <code className="text-fg">"language": "Tamil"</code> into <code className="text-fg">data/inbox/</code>. The next scheduled run validates it and this page updates.</Note>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
