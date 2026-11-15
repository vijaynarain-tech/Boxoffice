import { useState } from "react";
import { site, cr, date, sourceName } from "../data";
import { Card, Note, NotReported, Section, Segmented, SourceTag, StatusPill } from "../components/ui";
import { Thumb } from "../components/Posters";

type Board = "worldwide" | "indiaNet" | "hindiNet" | "openingDay" | "other";
const LABEL: Record<Board, string> = { worldwide: "Worldwide gross", indiaNet: "India net, all languages", hindiNet: "Hindi-only India net", openingDay: "Opening day, India net", other: "More boards" };

export default function Records() {
  const [b, setB] = useState<Board>("worldwide");
  const rows = b === "other" ? [] : (site.leaderboards as any)[b] as any[];
  const t = site.trackers.worldwide!;
  const tn = site.trackers.indiaNet!;
  return (
    <>
      <Section eyebrow="Indian cinema" title="All-time records" intro="Ranks use one stated metric per board. Ramayana's running total is inserted live. Figures not yet re-checked against their tracker carry an Unverified badge.">
        <Segmented label="Leaderboard" value={b} onChange={setB} options={(Object.keys(LABEL) as Board[]).map((k) => ({ value: k, label: LABEL[k] }))} />
        {b !== "other" ? (
          <Card>
            <div className="scroll-x -mx-4 sm:-mx-5">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                  <tr>{["#", "Film", "Year", LABEL[b], "Status", "Source", "Note"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.film} className={`border-b border-line/60 ${r.live ? "bg-ram/[0.07]" : ""}`}>
                      <td className="num px-3 py-2.5 text-mute">{r.rank}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Thumb title={r.title} lang={(site.films.records as any)[r.film]?.lang} />
                          <span className={r.live ? "font-semibold text-ram" : "font-medium"}>{r.title}</span>
                          {r.live && <span className="rounded bg-ram px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink">Running</span>}
                        </div>
                      </td>
                      <td className="num px-3 py-2.5 text-mute">{r.year}</td>
                      <td className="num px-3 py-2.5 font-semibold">{cr(r.amount)}</td>
                      <td className="px-3 py-2.5"><StatusPill status={r.status} /></td>
                      <td className="px-3 py-2.5"><SourceTag id={r.source} compact /></td>
                      <td className="max-w-[260px] px-3 py-2.5 text-xs text-mute">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b === "hindiNet" && <p className="mt-3 text-xs text-mute">Ramayana is not listed: only its Day 1 Hindi net (₹47.50 Cr) is published. Dubbed releases such as Pushpa 2 and Baahubali 2 show their Hindi version only.</p>}
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {["Highest India gross", "Highest overseas gross", "Biggest opening weekends", "Biggest first weeks"].map((x) => (
              <Card key={x} title={x}>
                <NotReported label="Needs a consistent ledger for comparison films" />
              </Card>
            ))}
            <Card title="Fastest to ₹1,000 Cr worldwide">
              <p className="text-sm">Ramayana: <span className="num text-ram">8 days</span> <SourceTag id="businessstandard" compact /></p>
              <p className="mt-1 text-xs text-mute">Comparison films' day counts are not yet in the ledger, so no record claim is made.</p>
            </Card>
          </div>
        )}
      </Section>

      <Section title="Ramayana milestone tracker">
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { k: "Worldwide gross", tr: t, src: site.ramayana.headline.worldwide?.source ?? "" },
            { k: "India net, all languages", tr: tn, src: "sacnilk" },
          ].map(({ k, tr, src }) => (
            <Card key={k} title={k} sub={`Current rank #${tr.rank} · ${cr(tr.current)}`}>
              {tr.next && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm leading-relaxed">
                    Ramayana needs another <span className="num font-semibold text-ram">{cr(tr.next.gap)}</span> to overtake <b>{tr.next.title}</b> ({cr(tr.next.amount)}).
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-ram" style={{ width: `${tr.next.progressPct}%` }} /></div>
                  {!tr.next.sameLedger && <p className="text-xs text-ram/80">Cross-ledger gap: Ramayana from {sourceName(src)}, {tr.next.title} from {sourceName(tr.next.source)}. Indicative only.</p>}
                  {tr.next.eta && (
                    <ul className="mt-1 grid grid-cols-2 gap-1.5 text-xs">
                      {tr.next.eta.map((e: any) => (
                        <li key={e.scenario} className="rounded-md bg-ink/60 px-2 py-1.5"><span className="text-mute">{e.scenario}:</span> <span className="num">{e.day ? `Day ${e.day} (${date(e.date, { day: "numeric", month: "short" })})` : "not reached"}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {tr.record && (
                <div className="mt-4 border-t border-line pt-3">
                  <div className="eyebrow">All-time record</div>
                  <p className="mt-1 text-sm">{tr.record.title} · {cr(tr.record.amount)} · gap {cr(tr.record.gap)} ({tr.record.progressPct}% there)</p>
                  {tr.record.eta && (
                    <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                      {tr.record.eta.map((e: any) => (
                        <li key={e.scenario} className="rounded-md bg-ink/60 px-2 py-1.5"><span className="text-mute">{e.scenario}:</span> <span className="num">{e.day ? `Day ${e.day} (${date(e.date, { day: "numeric", month: "short" })})` : "not reached"}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {"milestones" in tr && k === "Worldwide gross" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tr.milestones.map((m: any) => (
                    <span key={m.crore} className={`rounded-full border px-2.5 py-1 text-xs ${m.reached ? "border-up/40 text-up" : "border-line text-mute"}`}>
                      ₹{m.crore.toLocaleString("en-IN")} Cr {m.reached ? "✓" : `· base case Day ${m.eta?.[1]?.day ?? "—"}`}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
        <Note tone="warn">Projected dates come from the scenario forecast and are not records. A record is claimed only when the same source ledger reports both films.</Note>
      </Section>
    </>
  );
}
