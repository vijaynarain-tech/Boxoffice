import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Copy, Download, Search } from "lucide-react";
import { site, cr, date, pct, sourceName, ledgers, languages, today, type LCell as LC, type LedgerRow } from "../data";
import { Card, Change, Note, NotReported, Section, Segmented, Stat, StatusPill } from "../components/ui";
import { axis, C, Legend, RichTooltip } from "../components/charts";

const R = site.ramayana;
const h = { ...R.headline, today };
const todayHindi = languages.table.find((t) => t.live)?.by.Hindi ?? null;
const latestTickets = [...ledgers.sacnilk.rows].reverse().find((r) => r.tickets);

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
    ["Tickets sold (one day)", latestTickets?.tickets ? latestTickets.tickets.v.toLocaleString("en-IN") : null, latestTickets ? `Day ${latestTickets.day}, estimated` : undefined, undefined, latestTickets?.tickets?.src],
    ["Shows today", h.today?.shows ? h.today.shows.toLocaleString("en-IN") : todayHindi?.shows ? todayHindi.shows.toLocaleString("en-IN") : null, h.today ? `Day ${h.today.day}, live${!h.today.shows && todayHindi?.shows ? ", Hindi only" : ""}` : undefined, h.today ? "live" : undefined, h.today ? "sacnilk" : undefined],
    ["Occupancy today", h.today?.occupancy ? `${h.today.occupancy}%` : todayHindi?.occupancy ? `${todayHindi.occupancy}%` : null, h.today ? `Day ${h.today.day}, live${!h.today.occupancy && todayHindi?.occupancy ? ", Hindi only" : ""}` : undefined, h.today ? "live" : undefined, h.today ? "sacnilk" : undefined],
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

type SortKey = "day" | "net" | "worldwide" | "changePct" | "occupancy";
type Ledger = "sacnilk" | "koimoi";
type LRow = LedgerRow;
type LCell = LC | null;

const KIND_MARK: Record<string, { sym: string; cls: string; label: string }> = {
  reported: { sym: "", cls: "", label: "Reported" },
  derived: { sym: "ᴰ", cls: "text-godz-2", label: "Derived from the same tracker's published totals" },
  fallback: { sym: "ᶠ", cls: "text-ram", label: "Filled from another source" },
};

function V({ c, fmt = (v: number) => v.toFixed(2), scope }: { c: LCell; fmt?: (v: number) => string; scope?: string }) {
  if (!c) return <span className="text-mute/60" title="No source has published this figure">—</span>;
  const k = KIND_MARK[c.kind] ?? KIND_MARK.reported;
  const tip = `${fmt(c.v)} · ${k.label}${c.how ? ` (${c.how})` : ""} · ${sourceName(c.src)}${c.status ? ` · ${c.status}` : ""}${scope && scope !== "all languages" ? ` · ${scope}` : ""}`;
  return (
    <span className="num whitespace-nowrap" title={tip}>
      {fmt(c.v)}
      {k.sym && <sup className={`ml-0.5 font-sans text-[10px] font-bold ${k.cls}`}>{k.sym}</sup>}
      {scope && scope !== "all languages" && <sup className="ml-0.5 font-sans text-[9px] font-bold text-mute">H</sup>}
    </span>
  );
}

function DailyTable() {
  const [ledger, setLedger] = useState<Ledger>("sacnilk");
  const [q, setQ] = useState("");
  const [days, setDays] = useState<"all" | "weekend" | "weekday">("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "day", dir: 1 });
  const [copied, setCopied] = useState(false);
  const L = ledgers[ledger];

  const rows = useMemo(() => {
    let r = L.rows.filter((x) => days === "all" || (days === "weekend" ? x.isWeekend : !x.isWeekend));
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((x) => `day ${x.day} ${x.date} ${x.weekday} ${date(x.date)}`.toLowerCase().includes(s));
    }
    const val = (x: LRow) => (sort.k === "day" ? x.day : sort.k === "changePct" ? x.changePct ?? -1e9 : (x[sort.k] as LCell)?.v ?? -1e9);
    return [...r].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [L, q, days, sort]);

  const csv = () => {
    const head = ["Day", "Date", "Weekday", "India net (Cr)", "India gross (Cr)", "Overseas gross (Cr)", "Worldwide daily (Cr)", "Cumulative India net (Cr)", "Cumulative worldwide (Cr)", "Change %", "Shows", "Occupancy %", "Net source", "Ledger"];
    const v = (c: LCell) => (c ? c.v : "");
    const body = L.rows.map((x) => [x.day, x.date, x.weekday, v(x.net), v(x.indiaGross), v(x.overseas), v(x.worldwide), x.cumNet ?? "", v(x.cumWorldwide), x.changePct ?? "", v(x.shows), v(x.occupancy), sourceName(x.net?.src), ledger]);
    return [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };
  const download = () => {
    const blob = new Blob([csv()], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ramayana-daily-${ledger}.csv`;
    a.click();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard refused */
    }
  };
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
  const cov = L.coverage as Record<string, { filled: number; total: number }>;
  const total = L.rows.length;
  const covered = ["net", "indiaGross", "overseas", "worldwide", "cumWorldwide", "shows", "occupancy"].reduce((s, k) => s + cov[k].filled, 0);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="Tracker ledger" value={ledger} onChange={setLedger} options={[{ value: "sacnilk", label: "Sacnilk ledger" }, { value: "koimoi", label: "Koimoi ledger" }]} />
        <Segmented label="Days" value={days} onChange={setDays} options={[{ value: "all", label: "All days" }, { value: "weekend", label: "Fri–Sun" }, { value: "weekday", label: "Mon–Thu" }]} />
        <label className="relative min-w-[160px] flex-1">
          <span className="sr-only">Search days</span>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
          <input id="daily-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search day, date or weekday" className="w-full rounded-lg border border-line bg-ink py-2 pl-8 pr-3 text-sm placeholder:text-mute/70" />
        </label>
        <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-2 text-xs font-semibold hover:border-mute/40">
          <Download size={13} aria-hidden /> CSV
        </button>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-mute/40">
          <Copy size={13} aria-hidden /> {copied ? "Copied" : "Copy CSV"}
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mute">
        <span>
          Filled: <span className="num text-fg">{covered}</span> of {total * 7} cells
        </span>
        <span>No mark = reported by {ledger === "sacnilk" ? "Sacnilk or a report citing it" : "Koimoi"}</span>
        <span><sup className="font-bold text-godz-2">ᴰ</sup> derived from the same tracker's totals</span>
        <span><sup className="font-bold text-ram">ᶠ</sup> filled from another source</span>
        <span><sup className="font-bold">H</sup> Hindi only</span>
        <span>Hover any figure for its source</span>
      </div>
      <div className="scroll-x -mx-4 sm:-mx-5">
        <table className="w-full min-w-[1120px] border-collapse text-sm">
          <thead className="border-y border-line bg-ink/40">
            <tr>
              <Th k="day">Day</Th>
              <Th>Date</Th>
              <Th k="net">India net</Th>
              <Th>India gross</Th>
              <Th>Overseas</Th>
              <Th k="worldwide">WW daily</Th>
              <Th>Cume India net</Th>
              <Th>Cume WW</Th>
              <Th k="changePct">Change</Th>
              <Th>Shows</Th>
              <Th k="occupancy">Occupancy</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.day} className={`border-b border-line/60 ${x.isWeekend ? "bg-ram/[0.03]" : ""}`}>
                <td className="num px-3 py-2.5 font-semibold">{x.day}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-mute">
                  {date(x.date, { day: "numeric", month: "short" })} <span className="text-mute/70">{x.weekday.slice(0, 3)}</span>
                </td>
                <td className="px-3 py-2.5">
                  <V c={x.net as LCell} />
                  {x.alt.length > 0 && <div className="mt-0.5 text-[10px] text-mute">{x.alt.map((a) => `${sourceName(a.src)} ${a.v}`).join(" · ")}</div>}
                </td>
                <td className="px-3 py-2.5"><V c={x.indiaGross as LCell} /></td>
                <td className="px-3 py-2.5"><V c={x.overseas as LCell} /></td>
                <td className="px-3 py-2.5"><V c={x.worldwide as LCell} /></td>
                <td className="num px-3 py-2.5">{x.cumNet?.toFixed(2) ?? "—"}</td>
                <td className="px-3 py-2.5"><V c={x.cumWorldwide as LCell} /></td>
                <td className="px-3 py-2.5 text-xs"><Change v={x.changePct} /></td>
                <td className="px-3 py-2.5"><V c={x.shows as LCell} fmt={(v) => v.toLocaleString("en-IN")} scope={x.showsScope} /></td>
                <td className="px-3 py-2.5"><V c={x.occupancy as LCell} fmt={(v) => `${v.toFixed(1)}%`} scope={x.occScope} /></td>
                <td className="px-3 py-2.5"><StatusPill status={x.net?.status} /></td>
              </tr>
            ))}
            {h.today && ledger === "sacnilk" && (
              <tr className="border-b border-line/60 bg-ram-2/[0.06]">
                <td className="num px-3 py-2.5 font-semibold">{h.today.day}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-mute">{date(h.today.date, { day: "numeric", month: "short" })} <span className="text-mute/70">today</span></td>
                <td className="num px-3 py-2.5">{h.today.net.toFixed(2)}</td>
                <td className="num px-3 py-2.5">{h.today.gross?.toFixed(2) ?? <span className="text-mute/60">—</span>}</td>
                <td className="px-3 py-2.5 text-mute/60" colSpan={5}>Live tracking; the full row is published the next morning</td>
                <td className="num px-3 py-2.5">{todayHindi?.shows ? <>{todayHindi.shows.toLocaleString("en-IN")}<sup className="ml-0.5 text-[9px] font-bold text-mute">H</sup></> : "—"}</td>
                <td className="num px-3 py-2.5">{todayHindi?.occupancy ? <>{todayHindi.occupancy}%<sup className="ml-0.5 text-[9px] font-bold text-mute">H</sup></> : "—"}</td>
                <td className="px-3 py-2.5"><StatusPill status="live" /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-mute">
        Figures in ₹ crore. Switch ledgers to see each tracker's own numbers; they differ because each tracker samples different cinemas. A dash means no source has published that figure. Weekend rows (Fri–Sun) are tinted.
      </p>
    </Card>
  );
}

function Charts() {
  const daily = R.rows.map((r) => ({ label: `D${r.day}`, ...r, source: r.netSource, status: r.netStatus }));
  const lr = ledgers.sacnilk.rows;
  const money = lr.map((r) => ({
    label: `D${r.day}`,
    day: r.day,
    weekday: r.weekday,
    date: r.date,
    indiaGross: r.indiaGross?.v ?? null,
    overseas: r.overseas?.v ?? null,
    worldwide: r.worldwide?.v ?? null,
    cumWorldwide: r.cumWorldwide?.v ?? null,
    share: r.worldwide && r.overseas ? +((r.overseas.v / r.worldwide.v) * 100).toFixed(1) : null,
    occupancy: r.occupancy?.v ?? null,
    shows: r.shows && r.showsScope === "all languages" ? r.shows.v : null,
    net: r.net?.v ?? null,
    source: r.cumWorldwide?.src ?? r.worldwide?.src,
    note: [r.indiaGross, r.overseas, r.worldwide].some((c) => c && c.kind !== "reported") ? "Some values derived or filled from another source; see the table." : undefined,
  }));
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
      <Card title="Worldwide gross, day by day" sub="₹ crore · India gross and overseas stacked · Sacnilk ledger">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={money} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<RichTooltip fmt={fmtCr} labelFmt={(_, p) => `Day ${p.day} · ${p.weekday}`} />} />
            <Bar dataKey="indiaGross" stackId="w" name="India gross" fill={C.ram} />
            <Bar dataKey="overseas" stackId="w" name="Overseas" fill={C.ram2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2"><Legend items={[{ color: C.ram, label: "India gross" }, { color: C.ram2, label: "Overseas" }]} /></div>
      </Card>
      <Card title="Cumulative worldwide gross" sub="₹ crore · running total by day · Sacnilk ledger">
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={money} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
            <Tooltip content={<RichTooltip fmt={fmtCr} labelFmt={(_, p) => `Through Day ${p.day}`} />} />
            <ReferenceLine y={1000} stroke={C.mute} strokeDasharray="3 3" label={{ value: "₹1,000 Cr", fill: C.mute, fontSize: 10, position: "insideTopLeft" }} />
            <Line dataKey="cumWorldwide" name="Worldwide to date" stroke={C.ram} strokeWidth={2.5} dot={{ r: 3, fill: C.ram }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Overseas share of worldwide" sub="% of each day's worldwide gross">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={money.filter((p) => p.share !== null)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} unit="%" />
            <Tooltip content={<RichTooltip fmt={(v) => `${v}%`} labelFmt={(l) => l} />} />
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
      <Card title="Occupancy vs box office" sub="Bars: India net (₹ crore) · line: average occupancy (%)">
        <ResponsiveContainer width="100%" height={h}>
          <ComposedChart data={money} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis yAxisId="l" {...axis} />
            <YAxis yAxisId="r" orientation="right" {...axis} unit="%" domain={[0, 80]} />
            <Tooltip content={<RichTooltip fmt={(v, k) => (k === "occupancy" ? `${v}%` : cr(v) ?? "")} labelFmt={(_, p) => `Day ${p.day} · ${p.weekday}`} />} />
            <Bar yAxisId="l" dataKey="net" name="India net" fill={C.ram} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            <Line yAxisId="r" dataKey="occupancy" name="Occupancy" stroke={C.godz2} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-mute">Occupancy is all-language where published; Day 5 and Day 10 use Hindi occupancy. Day 4 is not published.</p>
      </Card>
      <Card title="Shows vs revenue" sub="Bars: all-language shows · line: India net per 1,000 shows (₹ lakh)">
        <ResponsiveContainer width="100%" height={h}>
          <ComposedChart data={money.map((m) => ({ ...m, perShow: m.shows && m.net ? +((m.net * 100) / (m.shows / 1000)).toFixed(1) : null }))} margin={{ top: 8, right: 0, left: -6, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis yAxisId="l" {...axis} tickFormatter={(v) => `${v / 1000}k`} />
            <YAxis yAxisId="r" orientation="right" {...axis} />
            <Tooltip content={<RichTooltip fmt={(v, k) => (k === "shows" ? v.toLocaleString("en-IN") : `₹${v} lakh`)} labelFmt={(_, p) => `Day ${p.day} · ${p.weekday}`} />} />
            <Bar yAxisId="l" dataKey="shows" name="Shows" fill={C.mute} fillOpacity={0.5} radius={[3, 3, 0, 0]} />
            <Line yAxisId="r" dataKey="perShow" name="Net per 1,000 shows" stroke={C.ram} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-mute">Days 2, 3 and 10 have no all-language show count, so they are left out of this chart.</p>
      </Card>
    </div>
  );
}

export default function Ramayana() {
  return (
    <>
      <Section eyebrow="Ramayana: Rise of a Legend" title="Box office tracker" intro={<>India <b>net</b> is after taxes; <b>gross</b> includes GST. Producer and distributor shares are not published, so none are shown. Headline totals follow the Sacnilk ledger; Koimoi's own figures are one click away in the daily table.</>}>
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
