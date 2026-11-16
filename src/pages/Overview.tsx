import { ArrowRight, Trophy } from "lucide-react";
import { site, ramMeta, gzMeta, cr, usd, jpy, date, dateTimeIST, sourceName } from "../data";
import { RamayanaPoster, GodzillaPoster } from "../components/Posters";
import { Card, Change, Note, Section, Stat, StatusPill, SourceTag } from "../components/ui";

const R = site.ramayana;
const G = site.godzilla.figures as Record<string, any>;

function HeroPanel({ side }: { side: "ram" | "godz" }) {
  const isRam = side === "ram";
  const meta = isRam ? ramMeta : gzMeta;
  const h = R.headline;
  const rank = site.trackers.worldwide?.rank;
  return (
    <article className={`relative overflow-hidden rounded-2xl border ${isRam ? "border-ram/25" : "border-godz/25"} bg-surface`}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: isRam ? "radial-gradient(80% 60% at 0% 0%, rgba(245,185,66,.16), transparent 60%), radial-gradient(60% 50% at 100% 100%, rgba(231,111,53,.12), transparent 60%)" : "radial-gradient(80% 60% at 100% 0%, rgba(59,130,246,.18), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(34,211,238,.10), transparent 60%)" }} />
      <div className="relative flex flex-col gap-5 p-4 sm:flex-row sm:p-5">
        <div className="mx-auto w-48 shrink-0 sm:mx-0 sm:w-48">
          {isRam ? <RamayanaPoster className="rounded-xl shadow-2xl shadow-black/50 ring-1 ring-ram/20" /> : <GodzillaPoster className="rounded-xl shadow-2xl shadow-black/50 ring-1 ring-godz/20" />}
          <div className="mt-1.5 text-center text-[10px] text-mute">Official theatrical poster</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <div className={`eyebrow ${isRam ? "!text-ram" : "!text-godz-2"}`}>{isRam ? "Hindi · 6 languages" : "Japanese · Toho / GKIDS"}</div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{meta.title}</h1>
            <p className="mt-1 text-xs text-mute">
              Released {date(meta.releaseDate)} · Dir. {meta.director}
              {isRam && ` · Prod. ${meta.producers.join(", ")}`}
            </p>
          </div>
          {isRam ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Stat label="India net" value={cr(h.totalNet)} accent="ram" big sub={`Day 1–${R.lastReportedDay}`} source="sacnilk" />
              <Stat label="Worldwide gross" value={cr(h.worldwide?.amount)} accent="ram" big sub={`Day ${h.worldwide?.day}`} status={h.worldwide?.status} source={h.worldwide?.source} url={h.worldwide?.url} />
              <Stat label="India gross" value={cr(h.indiaGross?.amount)} status={h.indiaGross?.status} source={h.indiaGross?.source} url={h.indiaGross?.url} sub={`Day ${h.indiaGross?.day}`} />
              <Stat label="Overseas gross" value={cr(h.overseas?.amount)} sub={`Day ${h.overseas?.day}`} source={h.overseas?.source} url={h.overseas?.url} />
              <Stat label="Rank, Indian films worldwide" value={rank ? `#${rank}` : null} sub="Cross-ledger" />
              <div className="flex flex-col gap-1">
                <div className="eyebrow">Latest day (Day {h.latestDay.day})</div>
                <div className="num text-lg font-semibold">{cr(h.latestDay.net)}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Change v={h.latestChangePct} /> <StatusPill status={h.latestDay.status} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Stat label="North America" value={usd(G.naCume?.amount)} accent="godz" big sub={`through ${date(G.naCume?.period?.asOf, { day: "numeric", month: "short" })}`} status={G.naCume?.status} source={G.naCume?.source} url={G.naCume?.url} />
              <Stat label="Worldwide gross" value={usd(G.wwLatest?.amount)} accent="godz" big sub={`to ${date(G.wwLatest?.period?.asOf, { day: "numeric", month: "short" })}`} status={G.wwLatest?.status} source={G.wwLatest?.source} url={G.wwLatest?.url} />
              <Stat label="International" value={usd(G.intlOpening?.amount)} sub="to Nov 8, incl. Japan" source={G.intlOpening?.source} />
              <Stat label="Japan" value={jpy(G.japanJPY?.amount)} sub={`${usd(G.japanUSD?.amount)} · to Nov 8`} source={G.japanJPY?.source} />
              <Stat label="Global IMAX opening" value={usd(G.imaxWW?.amount)} sub="34% of worldwide" source="imax" />
              <div className="flex flex-col gap-1">
                <div className="eyebrow">2nd weekend (N. America)</div>
                <div className="num text-lg font-semibold">{usd(G.naSecondWeekend?.amount)}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Change v={G.naOpening ? ((G.naSecondWeekend.amount - G.naOpening.amount) / G.naOpening.amount) * 100 : null} /> <StatusPill status={G.naSecondWeekend?.status} />
                </div>
              </div>
            </div>
          )}
          <div className="mt-auto text-[11px] text-mute">
            Last verified figure: {isRam ? `Day ${R.lastReportedDay}, ${date(R.rows[R.lastReportedDay - 1].date)}` : `${G.naSecondWeekend?.status === "projection" ? "projected" : "actual"} N. America weekend to ${date(G.naCume?.period?.asOf)}`} · Retrieved {dateTimeIST(site.observations.filter((o) => o.film === side.replace("godz", "godzilla").replace("ram", "ramayana")).map((o) => o.retrievedAt).sort().at(-1))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Overview() {
  const t = site.trackers.worldwide!;
  const base = site.ramayana.forecast.scenarios[1];
  const gb = site.godzilla.forecast.scenarios[1];
  const succeeded = (site.runs as any[]).filter((r) => r.status === "success");
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <HeroPanel side="ram" />
        <HeroPanel side="godz" />
      </div>

      <Section eyebrow="Global box office" title="Where both films stand" intro="Earned figures only. Forecasts sit on the Forecast page and are never added to these totals.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Ramayana vs the all-time list" sub="Worldwide gross, ₹ crore">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-mute">Current rank</span>
                <span className="num text-2xl font-semibold text-ram">#{t.rank}</span>
              </div>
              {t.next && (
                <p className="text-sm leading-relaxed">
                  Needs <span className="num font-semibold text-ram">{cr(t.next.gap)}</span> more to pass <b>{t.next.title}</b> ({cr(t.next.amount)}).
                </p>
              )}
              {t.record && (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={t.record.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the all-time record">
                    <div className="h-full rounded-full bg-gradient-to-r from-ram-2 to-ram" style={{ width: `${t.record.progressPct}%` }} />
                  </div>
                  <p className="text-xs text-mute">
                    {t.record.progressPct}% of {t.record.title}'s {cr(t.record.amount)}. Gap {cr(t.record.gap)}.
                  </p>
                </>
              )}
              <Note tone="warn">The comparison figures come from a different ledger than Ramayana's running total, so treat gaps as indicative.</Note>
            </div>
          </Card>
          <Card title="Global box office, head to head" sub="Each row: both films from the same report">
            <div className="flex flex-col gap-3">
              {site.headToHead.filter((h: any) => h.metric.startsWith("Worldwide") && h.comparable).map((h: any) => (
                <div key={h.window} className="flex flex-col gap-1.5 border-b border-line/60 pb-3 last:border-0">
                  <div className="text-[11px] text-mute">{h.window}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Ramayana" value={usd(h.ramayana?.amount)} accent={h.leader === "ramayana" ? "ram" : undefined} />
                    <Stat label="Godzilla −0.0" value={usd(h.godzilla?.amount)} accent={h.leader === "godzilla" ? "godz" : undefined} />
                  </div>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-mute">Godzilla opened in Japan on Tue Nov 3, Ramayana in India on Thu Nov 5. Leader in colour.</p>
              <a href="#compare" className="inline-flex items-center gap-1 text-xs font-semibold text-godz-2 hover:underline">
                Full head to head <ArrowRight size={13} aria-hidden />
              </a>
            </div>
          </Card>
          <Card title="Base-case lifetime forecast" sub="Projection, not earned">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Ramayana WW" value={cr(base.lifetimeWorldwide, 0)} accent="ram" status="projection" />
                <Stat label="Godzilla WW" value={usd(gb.worldwide)} accent="godz" status="projection" />
              </div>
              <p className="text-xs text-mute">Four scenarios per film, with every assumption listed.</p>
              <a href="#forecast" className="inline-flex items-center gap-1 text-xs font-semibold text-godz-2 hover:underline">
                Open the forecast engine <ArrowRight size={13} aria-hidden />
              </a>
            </div>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Explore" title="Every section">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["ramayana", "Ramayana daily tracker", "Day-wise India net, overseas and worldwide checkpoints"],
            ["languages", "Language-wise", "Hindi, Tamil, Telugu, Kannada, Malayalam, English"],
            ["regions", "States & circuits", "State gross, city figures and trade circuits"],
            ["worldwide", "Worldwide map", "Territory performance in local currency"],
            ["advance", "Advance booking", "Same-cutoff presales comparisons"],
            ["formats", "IMAX & formats", "IMAX openings on equal terms"],
            ["godzilla", "Godzilla Minus Zero", "Japan, North America, international"],
            ["records", "Indian records", "Worldwide, India net, Hindi net, openings"],
          ].map(([id, t, d]) => (
            <a key={id} href={`#${id}`} className="group card flex items-center justify-between gap-3 p-4 transition hover:border-mute/40">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-0.5 text-xs text-mute">{d}</div>
              </div>
              <ArrowRight size={16} className="shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
            </a>
          ))}
        </div>
      </Section>

      <Section eyebrow="Data health" title="Conflicts between sources" intro="When trackers disagree, the site shows the primary figure and lists the others. Nothing is averaged.">
        <div className="grid gap-3 md:grid-cols-2">
          {site.conflicts.map((c) => (
            <Card key={c.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm font-medium">{c.label}</div>
                <span className="num shrink-0 rounded-md bg-ram/10 px-2 py-0.5 text-xs text-ram">{c.spreadPct}% spread</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {c.values.map((v) => (
                  <li key={v.source + v.amount} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2">
                      <SourceTag id={v.source} url={v.url} compact />
                      {v.source === c.primary.source && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-semibold text-fg">Primary</span>}
                    </span>
                    <span className="num text-fg">{c.key.endsWith("USD") ? usd(v.amount) : cr(v.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
          <Trophy size={14} aria-hidden /> {succeeded.length} successful update run{succeeded.length === 1 ? "" : "s"} logged. Primary source for India figures: {sourceName("sacnilk")}. <a className="text-godz-2 hover:underline" href="#methodology">How figures are chosen</a>
        </div>
      </Section>
    </>
  );
}
