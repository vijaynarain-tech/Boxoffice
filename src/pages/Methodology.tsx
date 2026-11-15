import { site, dateTimeIST, money } from "../data";
import { Card, Note, Section, SourceTag, StatusPill } from "../components/ui";

const STATUSES: [string, string][] = [
  ["final", "Published as the tracker's settled figure for that day."],
  ["estimated", "Early or same-day estimate; often revised."],
  ["live", "Mid-day tracking from ticketing platforms."],
  ["revised", "A later figure that replaced an earlier estimate."],
  ["projection", "A forecast published by a source. Never counted as earned."],
  ["reference", "Historical figure awaiting re-verification against its tracker."],
  ["derived", "Calculated here from two published figures, with the formula shown."],
];

export default function Methodology() {
  const runs = site.runs as any[];
  return (
    <>
      <Section eyebrow="Transparency" title="Sources and methodology" intro="Every number on this site is a row in a source ledger with the tracker, the page URL and the retrieval time. Charts and rankings are calculated from that ledger on every update.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="How figures are chosen">
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-mute">
              <li>India: Sacnilk is primary, then Koimoi, then Bollywood Hungama. Other values stay visible beside the primary one.</li>
              <li>North America: Box Office Mojo and The Numbers actuals override studio estimates once entered.</li>
              <li>Revisions are detected automatically by comparing each run with the previous dataset.</li>
              <li>Figures that differ by more than 0.5% between sources are listed as conflicts. Nothing is averaged.</li>
              <li>A cumulative series from one source that goes down fails validation, and the previous dataset is kept.</li>
              <li>Missing data shows as "Not reported", never as zero.</li>
            </ul>
          </Card>
          <Card title="Status labels">
            <ul className="flex flex-col gap-2">
              {STATUSES.map(([s, d]) => (
                <li key={s} className="flex items-start gap-3 text-sm">
                  <span className="w-24 shrink-0"><StatusPill status={s} /></span>
                  <span className="text-mute">{d}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Source registry" intro="Automated collection is used only where a source allows it. None of the box-office trackers offers a public API, and several prohibit scraping, so their figures are entered by hand through the ledger.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>{["Source", "Coverage", "Access", "Terms", "Rows"].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody>
                {site.sources.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 align-top">
                    <td className="px-3 py-2.5"><SourceTag id={s.id} /></td>
                    <td className="px-3 py-2.5 text-mute">{s.region}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${s.access === "api" ? "bg-up/15 text-up" : s.access === "licensed" ? "bg-godz/15 text-godz-2" : "bg-raised text-mute"}`}>{s.access}</span>
                    </td>
                    <td className="max-w-[380px] px-3 py-2.5 text-xs leading-relaxed text-mute">{s.accessNote} {s.reliability}</td>
                    <td className="num px-3 py-2.5">{site.observations.filter((o) => o.source === s.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="Automatic updates" intro="A scheduled GitHub Actions workflow runs three times a day. Scheduled runs can start a few minutes late, so the actual finish time of each run is listed.">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card title="Schedule (Asia/Kolkata)">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
                <tr><th className="py-1.5">Run</th><th>IST</th><th>UTC</th></tr>
              </thead>
              <tbody className="num">
                {[["Morning", "08:00", "02:30"], ["Afternoon", "15:00", "09:30"], ["Night", "22:00", "16:30"]].map(([a, b, c]) => (
                  <tr key={a} className="border-t border-line/60"><td className="py-2 font-sans">{a}</td><td>{b}</td><td className="text-mute">{c}</td></tr>
                ))}
              </tbody>
            </table>
            <ol className="mt-4 flex list-decimal flex-col gap-1 pl-4 text-xs leading-relaxed text-mute">
              <li>Fetch exchange rates (ECB via Frankfurter).</li>
              <li>Load the ledger and new files from data/inbox.</li>
              <li>Validate every row with Zod and cross-check dates and cumulative series.</li>
              <li>Detect revisions and flag conflicts.</li>
              <li>Rebuild rankings, charts and forecasts.</li>
              <li>Commit the new dataset; the host redeploys the site.</li>
              <li>On any failure, keep the previous dataset and log the run as failed.</li>
            </ol>
          </Card>
          <Card title="Run log" sub="Most recent first">
            <ul className="flex flex-col divide-y divide-line">
              {runs.map((r) => (
                <li key={r.startedAt} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="num">{dateTimeIST(r.finishedAt)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.status === "success" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{r.status}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-mute">{r.summary} · {r.trigger}</div>
                  <ul className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-mute">
                    {r.steps.map((s: any) => <li key={s.name} title={s.detail}>{s.ok ? "✓" : "✗"} {s.name}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Revision history">
        <Card>
          {site.revisions.length ? (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {(site.revisions as any[]).map((r) => (
                <li key={r.id + r.detectedAt} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{r.label}</span>
                  <span className="num text-mute">{money(r.from, "INR_CR")} → {money(r.to, "INR_CR")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">No revisions detected yet. The first comparison happens on the next scheduled run.</p>
          )}
        </Card>
        <Note>Images: official posters are copyrighted and are not embedded. The artwork shown is original placeholder art, and each film links to its official listing.</Note>
      </Section>
    </>
  );
}
