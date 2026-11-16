import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Copy, Download, Search } from "lucide-react";
import { site, cr, date, pct, sourceName } from "../data";
import { Card, Change, Note, NotReported, Section, Stat, StatusPill, SourceTag } from "../components/ui";
import { axis, C, RichTooltip } from "../components/charts";

const R = site.ramayana;
const h = R.headline;
type Row = (typeof R.rows)[number];

const fmtCr = (v: number) => cr(v) ?? "";

function MetricGrid() {
  const m: [string, string | null, string?, string?, string?][] = [
    h.today
      ? [`Today, live (Day ${h.today.day})`, cr(h.today.net), `${date(h.today.date, { weekday: "short", day: "numeric", month: "short" })}${h.today.gross ? ` · gross ${cr(h.today.gross)}` : ""}`, "live", h.today.source]
      : [`Today (Day ${R.todayDay})`, null, "Live figure not reported yet"],
    ["Latest completed day", cr(h.latestDay.net), `Day ${h.latestDay.day} · ${date(h.latestDay.date, { day: "numeric", month: "short" })}`, h.latestDay.status ?? undefined, h.latestDay.source ?? undefined],
    ["Previous day", cr(h.previousDay.net), `Day ${h.previousDay.day}`, h.previousDay.status ?? undefined, h.previousDay.source ?? undefined],
    ["Total India net", cr(h.totalNet), `Day 1–${R.lastReportedDay}`, R.rows.some((r) => r.netStatus && r.netStatus !== "final") ? "estimated" : "final", "sacnilk"],
    ["Total India gross", cr(h.indiaGross?.amount), `Day ${h.indiaGross?.day}`, h.indiaGross?.status ?? undefined, h.indiaGross?.source ?? undefined],
    ["Overseas gross", cr(h.overseas?.amount), `Day ${h.overseas?.day}`, h.overseas?.status, h.overseas?.source],
    ["Worldwide gross", cr(h.worldwide?.amount), `Day ${h.worldwide?.day}`, h.worldwide?.status, h.worldwide?.source],
    ["Opening day net", cr(h.openingDay), `Gross ${cr(h.openingDayGross)}`, "final", "sacnilk"],
    ["Opening weekend net", cr(h.openingWeekend.net), h.openingWeekend.label],
    ["First week net", cr(h.firstWeek.net), h.firstWeek.label],
    ["Second weekend net", cr(h.secondWeekend.net), h.secondWeekend.label],
    ["Current week net", cr(h.currentWeek.net), `${h.currentWeek.label}, ${h.currentWeek.days} of 7 days`],
    ["Highest single day", cr(h.highestDay.net), `Day ${h.highestDay.day} · ${date(h.highestDay.date, { day: "numeric", month: "short" })}`],
    ["Biggest day-on-day rise", pct(h.biggestIncrease.pct), `Day ${h.biggestIncrease.day}`],
    ["Biggest day-on-day fall", pct(h.biggestDecline.pct), `Day ${h.biggestDecline.day}`],
    ["Running daily average", cr(h.runningAverage), `Across ${R.lastReportedDay} days`],
    ["Tickets sold / footfalls", null],
    ["Shows today", h.today?.shows ? h.today.shows.toLocaleString("en-IN") : null, h.today?.shows ? `Day ${h.today.day}, live` : undefined],
    ["Occupancy today", h.today?.occupancy ? `${h.today.occupancy}%` : null, h.today?.occupancy ? `Day ${h.today.day}, all languages, live` : undefined],
    ["Producer share", null, "Distributor share is not published"],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {m.map(([label, value, sub, status, source]) => (
        <Stat key={label} label={label} value={value} sub={sub} status={status} source={source} accent={label.startsWith("Total") || label.startsWith("Worldwide") ? "ram" : undefined} />
      ))}
    </div>
  );
}

type SortKey = "day" | "net" | "changePct";

function DailyTable() {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "day", dir: 1 });
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    let r = R.rows.filter((x) => (src === "all" || x.netSource === src || x.altNet.some((a) => a.source === src)) && (status === "all" || x.netStatus === status));
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((x) => `day ${x.day} ${x.date} ${x.weekday} ${date(x.date)}`.toLowerCase().includes(s));
    }
    return [...r].sort((a, b) => ((a[sort.k] ?? -1e9) - (b[sort.k] ?? -1e9)) * sort.dir);
  }, [q, src, status, sort]);

  const csv = () => {
    const head = ["Day", "Date", "Weekday", "India net (Cr)", "India gross (Cr)", "Hindi net (Cr)", "Overseas gross (Cr)", "Worldwide daily (Cr)", "Cumulative India net (Cr)", "Cumulative worldwide (Cr)", "Change %", "Shows", "Occupancy", "Status", "Source"];
    const body = R.rows.map((x) => [x.day, x.date, x.weekday, x.net ?? "", x.gross ?? "", x.hindiNet ?? "", x.overseas ?? "", "", x.cumNet ?? "", x.cumWorldwide ?? "", x.changePct ?? "", "", "", x.netStatus ?? "", sourceName(x.netSource)]);
    return [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };
  const download = () => {
    const blob = new Blob([csv()], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ramayana-daily.csv";
    a.click();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard refused: nothing else to do */
    }
  };
  const sources = [...new Set(R.rows.flatMap((x) => [x.netSource, ...x.altNet.map((a) => a.source)]).filter(Boolean))] as string[];
  const Th = ({ k, children }: { k?: SortKey; children: string }) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-mute">
      {k ? (
        <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((s.dir * -1) as 1 | -1) : -1 }))}>
          {children} <ArrowDownUp size={11} aria-hidden className={sort.k === k ? "text-fg" : ""} />
        </button>
      ) : (
        children
      )}
    </th>
  );
  const cell = (v: number | null) => (v === null ? <span className="text-mute/60">—</span> : <span className="num">{v.toFixed(2)}</span>);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 basis-48">
          <span className="sr-only">Search days</span>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
          <input id="daily-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search day, date or weekday" className="w-full rounded-lg border border-line bg-ink py-2 pl-8 pr-3 text-sm placeholder:text-mute/70" />
        </label>
        <label className="text-xs text-mute">
          <span className="sr-only">Reporting source</span>
          <select id="daily-source" value={src} onChange={(e) => setSrc(e.target.value)} className="rounded-lg border border-line bg-ink px-2.5 py-2 text-sm text-fg">
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{sourceName(s)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-mute">
          <span className="sr-only">Status</span>
          <select id="daily-status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-line bg-ink px-2.5 py-2 text-sm text-fg">
            <option value="all">Any status</option>
            <option value="final">Final</option>
            <option value="estimated">Estimated</option>
            <option value="live">Live</option>
            <option value="revised">Revised</option>
          </select>
        </label>
        <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-2 text-xs font-semibold hover:border-mute/40">
          <Download size={13} aria-hidden /> CSV
        </button>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-mute/40">
          <Copy size={13} aria-hidden /> {copied ? "Copied" : "Copy CSV"}
        </button>
      </div>
      <div className="scroll-x -mx-4 sm:-mx-5">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="border-y border-line bg-ink/40">
            <tr>
              <Th k="day">Day</Th>
              <Th>Date</Th>
              <Th>Weekday</Th>
              <Th k="net">India net</Th>
              <Th>India gross</Th>
              <Th>Overseas</Th>
              <Th>WW daily</Th>
              <Th>Cume India net</Th>
              <Th>Cume WW</Th>
              <Th k="changePct">Change</Th>
              <Th>Shows</Th>
              <Th>Occupancy</Th>
              <Th>Status</Th>
              <Th>Source</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x: Row) => (
              <tr key={x.day} className={`border-b border-line/60 ${x.isWeekend ? "bg-ram/[0.03]" : ""}`}>
                <td className="num px-3 py-2.5 font-semibold">{x.day}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-mute">{date(x.date, { day: "numeric", month: "short" })}</td>
                <td className="px-3 py-2.5 text-mute">{x.weekday.slice(0, 3)}</td>
                <td className="px-3 py-2.5">
                  {cell(x.net)}
                  {x.altNet.length > 0 && (
                    <div className="mt-0.5 text-[10px] text-mute">
                      {x.altNet.map((a) => `${sourceName(a.source)} ${a.amount}`).join(" · ")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">{cell(x.gross)}</td>
                <td className="px-3 py-2.5">{cell(x.overseas)}</td>
                <td className="px-3 py-2.5 text-mute/60">—</td>
                <td className="px-3 py-2.5">{cell(x.cumNet)}</td>
                <td className="px-3 py-2.5">
                  {cell(x.cumWorldwide)}
                  {x.cumWorldwideSource && <div className="text-[10px] text-mute">{sourceName(x.cumWorldwideSource)}</div>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <Change v={x.changePct} />
                </td>
                <td className="px-3 py-2.5 text-mute/60">—</td>
                <td className="px-3 py-2.5 text-mute/60">—</td>
                <td className="px-3 py-2.5">
                  <StatusPill status={x.netStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <SourceTag id={x.netSource} url={x.netUrl} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-mute">Figures in ₹ crore. A dash means no source has published that figure; it is not zero. Weekend rows (Fri–Sun) are tinted. Single-day worldwide totals are not published by any tracker.</p>
    </Card>
  );
}

function Charts() {
  const daily = R.rows.map((r) => ({ label: `D${r.day}`, ...r, source: r.netSource, status: r.netStatus }));
  const wwPoints = R.checkpoints.filter((c) => c.worldwide !== null).map((c) => ({ label: `D${c.day}`, day: c.day, worldwide: c.worldwide, overseas: c.overseas, share: c.worldwide && c.overseas ? +((c.overseas / c.worldwide) * 100).toFixed(1) : null, source: c.source, status: c.status }));
  const runAvg = daily.map((r) => ({ label: r.label, avg: r.cumNet ? +(r.cumNet / r.day).toFixed(2) : null, net: r.net, source: r.source, status: r.status }));
  const wow = R.weeks.map((w) => ({ label: `Week ${w.week}${w.complete ? "" : " (partial)"}`, net: w.net, note: `${w.days} day(s)` }));
  const wvw = [
    { label: "Fri–Sun avg", net: R.weekendVsWeekday.weekendAvg, note: `${R.weekendVsWeekday.weekendDays} days` },
    { label: "Mon–Thu avg", net: R.weekendVsWeekday.weekdayAvg, note: `${R.weekendVsWeekday.weekdayDays} days` },
  ];
  const h = 220;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="India net, day by day" sub="₹ crore · lighter bar = estimated">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<RichTooltip fmt={fmtCr} labelFmt={(_, p) => `Day ${p.day} · ${p.weekday} ${date(p.date, { day: "numeric", month: "short" })}`} />} />
            <Bar dataKey="net" name="India net" radius={[4, 4, 0, 0]}>
              {daily.map((d) => (
                <Cell key={d.day} fill={d.status === "final" ? C.ram : "#8a6a2c"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Cumulative worldwide gross" sub="₹ crore · each point is a published checkpoint, coloured by source">
        <ResponsiveContainer width="100%" height={h}>
          <ComposedChart data={wwPoints} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" type="number" domain={[6, 11]} ticks={[7, 8, 9, 10]} tickFormatter={(d) => `D${d}`} {...axis} />
            <YAxis {...axis} domain={[800, 1300]} />
            <Tooltip content={<RichTooltip fmt={fmtCr} labelFmt={(_, p) => `Through Day ${p.day}`} />} />
            <Scatter dataKey="worldwide" name="Worldwide" fill={C.ram} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Overseas share of worldwide" sub="% · only where one source published both figures">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={wwPoints.filter((p) => p.share !== null)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} unit="%" domain={[0, 50]} />
            <Tooltip content={<RichTooltip fmt={(v) => `${v}%`} labelFmt={(l) => `Through ${l}`} />} />
            <Bar dataKey="share" name="Overseas share" fill={C.ram2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Daily change" sub="% vs previous day">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={daily.filter((d) => d.changePct !== null)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} unit="%" />
            <ReferenceLine y={0} stroke={C.mute} />
            <Tooltip content={<RichTooltip fmt={(v) => pct(v) ?? ""} labelFmt={(_, p) => `Day ${p.day} · ${p.weekday}`} />} />
            <Bar dataKey="changePct" name="Change" radius={[3, 3, 0, 0]}>
              {daily.filter((d) => d.changePct !== null).map((d) => (
                <Cell key={d.day} fill={d.changePct! >= 0 ? C.up : C.down} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Week on week" sub="India net, ₹ crore">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={wow} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<RichTooltip fmt={fmtCr} />} />
            <Bar dataKey="net" name="India net" fill={C.ram} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Weekend vs weekday" sub="Average India net per day, ₹ crore">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={wvw} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" {...axis} />
            <YAxis type="category" dataKey="label" width={90} {...axis} />
            <Tooltip content={<RichTooltip fmt={fmtCr} />} />
            <Bar dataKey="net" name="Avg per day" radius={[0, 4, 4, 0]}>
              <Cell fill={C.ram} />
              <Cell fill={C.mute} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-mute">Week 1 includes Diwali-week holidays on weekdays, which lifts the weekday average.</p>
      </Card>
      <Card title="Running average" sub="Cumulative India net ÷ days, ₹ crore">
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={runAvg} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} domain={["auto", "auto"]} />
            <Tooltip content={<RichTooltip fmt={fmtCr} />} />
            <Line dataKey="avg" name="Running average" stroke={C.ram} strokeWidth={2} dot={{ r: 3, fill: C.ram }} />
            <Line dataKey="net" name="Day net" stroke={C.mute} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Same-weekday holds" sub="Week 2 day vs the same weekday in Week 1">
        <div className="flex flex-col gap-2.5 pt-1">
          {R.holds.map((x) => (
            <div key={x.day} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-mute">
                {x.weekday.slice(0, 3)} D{x.day} vs D{x.vsDay}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ram" style={{ width: `${Math.min(100, x.holdPct)}%` }} />
              </div>
              <span className="num w-14 text-right">{x.holdPct}%</span>
            </div>
          ))}
          <p className="text-xs text-mute">A hold near 100% means the second week matched the first on that weekday.</p>
        </div>
      </Card>
      <Card title="India gross, daily" sub="Only Day 1 has a published daily gross">
        <div className="flex h-[140px] flex-col items-start justify-center gap-2">
          <Stat label="Day 1 India gross" value={cr(R.rows[0].gross)} source="sacnilk" status="final" />
          <p className="text-xs text-mute">Cumulative India gross for later days is derived from worldwide minus overseas checkpoints (shown on the cumulative chart).</p>
        </div>
      </Card>
      <Card title="Occupancy vs box office · Shows vs revenue" sub="Needs show-count and occupancy data">
        <div className="flex h-[140px] flex-col items-start justify-center gap-2">
          <NotReported label="Occupancy and show counts are not reported in the ledger yet" />
          <p className="text-xs text-mute">Add `occupancy` and `shows` observations to the ledger and these charts fill in on the next run.</p>
        </div>
      </Card>
    </div>
  );
}

export default function Ramayana() {
  return (
    <>
      <Section eyebrow="Ramayana: Rise of a Legend" title="Box office tracker" intro={<>India <b>net</b> is after taxes; <b>gross</b> includes GST. Producer and distributor shares are not published, so none are shown. India gross here is derived from worldwide minus overseas.</>}>
        <Card>
          <MetricGrid />
        </Card>
        {R.headline.latestDay.status !== "final" && (
          <Note tone="warn">
            Day {R.headline.latestDay.day} is an estimate: {site.observations.find((o) => o.film === "ramayana" && o.period.type === "day" && (o.period as any).day === R.headline.latestDay.day && o.metric === "net" && !o.language && !o.region)?.note}
          </Note>
        )}
      </Section>
      <Section eyebrow="Day-wise" title="Daily collection table">
        <DailyTable />
      </Section>
      <Section eyebrow="Trends" title="Charts" intro="Hover or tap a point to see the exact figure, its source and its reporting status.">
        <Charts />
      </Section>
    </>
  );
}
