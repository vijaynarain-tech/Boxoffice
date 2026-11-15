import { useState } from "react";
import { site, usd, cr, date, gzMeta, ramMeta } from "../data";
import { Card, Note, NotReported, Section, Segmented, SourceTag } from "../components/ui";

type Mode = "window" | "dayN" | "calendar";

export default function Compare() {
  const [mode, setMode] = useState<Mode>("window");
  const G = site.godzilla.figures as Record<string, any>;
  const R = site.ramayana;
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-2">
          <div className="bg-gradient-to-br from-ram/20 via-ram-2/5 to-transparent p-5 sm:p-8">
            <div className="eyebrow !text-ram">Left</div>
            <div className="mt-1 font-display text-lg font-extrabold sm:text-2xl">{ramMeta.title}</div>
            <div className="mt-1 text-xs text-mute">Opened {date(ramMeta.releaseDate)} · Thursday</div>
          </div>
          <div className="bg-gradient-to-bl from-godz/20 via-godz-2/5 to-transparent p-5 text-right sm:p-8">
            <div className="eyebrow !text-godz-2">Right</div>
            <div className="mt-1 font-display text-lg font-extrabold sm:text-2xl">{gzMeta.title}</div>
            <div className="mt-1 text-xs text-mute">Opened {date(gzMeta.releaseDate)} · Tuesday (Japan)</div>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink text-xs font-bold">VS</div>
      </div>

      <Section
        title="Head to head"
        intro="A leader is named only when both figures cover the same market, the same window and the same currency."
        right={<Segmented label="Comparison mode" value={mode} onChange={setMode} options={[{ value: "window", label: "Same reporting window" }, { value: "dayN", label: "Day N vs Day N" }, { value: "calendar", label: "Calendar date" }]} />}
      >
        {mode === "window" && (
          <div className="flex flex-col gap-3">
            {site.headToHead.map((h: any) => {
              const max = Math.max(h.ramayana?.amount ?? 0, h.godzilla?.amount ?? 0) || 1;
              return (
                <Card key={h.metric}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">{h.metric}</h3>
                    <span className="text-xs text-mute">{h.window}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex flex-col items-end gap-1.5">
                      {h.ramayana ? (
                        <>
                          <span className={`num text-lg font-semibold ${h.leader === "ramayana" ? "text-ram" : ""}`}>{usd(h.ramayana.amount)}</span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                            <div className="ml-auto h-full rounded-full bg-ram" style={{ width: `${(h.ramayana.amount / max) * 100}%` }} />
                          </div>
                          <SourceTag id={h.ramayana.source} compact />
                        </>
                      ) : (
                        <NotReported />
                      )}
                    </div>
                    <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${h.leader === "ramayana" ? "bg-ram/15 text-ram" : h.leader === "godzilla" ? "bg-godz/15 text-godz-2" : "bg-raised text-mute"}`}>
                      {h.leader === "ramayana" ? "◀ Leads" : h.leader === "godzilla" ? "Leads ▶" : "No call"}
                    </span>
                    <div className="flex flex-col items-start gap-1.5">
                      {h.godzilla ? (
                        <>
                          <span className={`num text-lg font-semibold ${h.leader === "godzilla" ? "text-godz-2" : ""}`}>{usd(h.godzilla.amount)}</span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-godz" style={{ width: `${(h.godzilla.amount / max) * 100}%` }} />
                          </div>
                          <SourceTag id={h.godzilla.source} compact />
                        </>
                      ) : (
                        <NotReported />
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-mute">{h.why}</p>
                </Card>
              );
            })}
          </div>
        )}
        {mode === "dayN" && (
          <Card title="Day N vs Day N" sub="Each film's own Day N from its first release date. Different markets and currencies, so no leader is named.">
            <div className="scroll-x -mx-4 sm:-mx-5">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                  <tr><th className="px-4 py-2.5">Day</th><th className="px-4 py-2.5">Ramayana · India net (INR)</th><th className="px-4 py-2.5">Godzilla · Japan (JPY)</th><th className="px-4 py-2.5">Godzilla · N. America (USD)</th></tr>
                </thead>
                <tbody>
                  {R.rows.map((r) => (
                    <tr key={r.day} className="border-b border-line/60">
                      <td className="num px-4 py-2">Day {r.day}</td>
                      <td className="num px-4 py-2 text-ram">{cr(r.net)}</td>
                      <td className="px-4 py-2">{r.day === 6 ? <span className="num">{`Day 1–6 total ¥2.70B`}</span> : <NotReported />}</td>
                      <td className="px-4 py-2">{r.day === 4 ? <span className="num">{usd(G.naFriday.amount)} <span className="text-xs text-mute">(N. America Day 1 = Japan Day 4)</span></span> : <NotReported />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {mode === "calendar" && (
          <Card title="Calendar date" sub="What each film reported for the same calendar dates">
            <div className="scroll-x -mx-4 sm:-mx-5">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                  <tr><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Ramayana</th><th className="px-4 py-2.5">Godzilla</th></tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(Date.UTC(2026, 10, 3 + i)).toISOString().slice(0, 10);
                    const r = R.rows.find((x) => x.date === d);
                    return (
                      <tr key={d} className="border-b border-line/60">
                        <td className="px-4 py-2 text-mute">{date(d, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="px-4 py-2">{r ? <span className="num">Day {r.day} · India net {cr(r.net)}</span> : <span className="text-xs text-mute">Not released</span>}</td>
                        <td className="px-4 py-2 text-xs">
                          {d === "2026-11-03" ? "Japan opens (Godzilla Day)" : d === "2026-11-06" ? <span className="num">N. America opens · {usd(G.naFriday.amount)}</span> : d === "2026-11-08" ? <span className="num">Global weekend total {usd(G.wwOpening.amount)}</span> : d === "2026-11-15" ? <span className="num">2nd weekend proj. {usd(G.naSecondWeekend.amount)}</span> : <NotReported />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Section>

      <Section title="Why each film leads where it does">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Godzilla leads North America and IMAX">
            <p className="text-sm leading-relaxed text-mute">It opened in 3,254 theaters with a wide studio-style release, and IMAX gave it 40% of its domestic opening. Ramayana had 53 North American IMAX screens and a diaspora-weighted release.</p>
          </Card>
          <Card title="Ramayana leads its home market by far">
            <p className="text-sm leading-relaxed text-mute">Ramayana's India net passed {cr(R.headline.totalNet)} in {R.lastReportedDay} days, helped by Diwali week holidays. Its worldwide total in rupees ({cr(R.headline.worldwide?.amount)}) is far above Godzilla's reported run, but comparing that needs a dated USD/INR rate and the same cutoff.</p>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Production budget">
            <div className="flex flex-col gap-2 text-sm">
              <div><span className="text-ram">Ramayana:</span> <span className="text-mute">{ramMeta.budget.text}</span></div>
              <div><span className="text-godz-2">Godzilla:</span> <span className="text-mute">{gzMeta.budget.text}</span></div>
            </div>
          </Card>
          <Card title="Marketing budget">
            <NotReported label="Not disclosed for either film" />
          </Card>
          <Card title="Return on investment">
            <p className="text-sm text-mute">Not calculated: producer shares and marketing spend are not published, and gross-to-budget ratios overstate returns.</p>
          </Card>
        </div>
        <Note>Different release dates make "who is winning" depend on the window. The only fully synchronised comparison available is the Nov 6–8 global weekend from one Deadline report.</Note>
      </Section>
    </>
  );
}
