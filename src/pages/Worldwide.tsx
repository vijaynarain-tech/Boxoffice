import { useState } from "react";
import { site, ramMeta, gzMeta, money, usd, cr, date, toUSD, toINRcr, TERRITORY } from "../data";
import { Card, Coverage, Note, NotReported, Section, Segmented, SourceTag, StatusPill } from "../components/ui";
import { WorldMap, type MapValue } from "../components/WorldMap";

type Film = "ramayana" | "godzilla";

/** Map territory codes to ISO 3166 numeric ids used by world-atlas. */
const ISO: Record<string, string[]> = { IN: ["356"], US: ["840"], "US-CA": ["840", "124"], JP: ["392"], CN: ["156"] };
const NAME_TO_CODE: Record<string, string> = { India: "IN", "United States of America": "US", Canada: "CA", Japan: "JP", China: "CN" };

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Ireland", "Australia", "New Zealand", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Singapore", "Malaysia", "Nepal", "Germany", "France", "Netherlands", "Spain", "Japan", "Taiwan", "Hong Kong", "Mainland China"];

function rowsFor(film: Film) {
  const terr = site.territories.filter((t) => t.film === film);
  return terr.map((t) => {
    const obs = t.observations;
    const latestCume = obs.filter((o) => o.period.type === "cume").sort((a, b) => ((b.period as any).throughDay ?? 0) - ((a.period as any).throughDay ?? 0))[0];
    const opening = obs.find((o) => o.period.type === "weekend" && (o.period as any).start === "2026-11-06" && !o.format);
    const day1 = obs.find((o) => o.period.type === "day" && (o.period as any).day === 1 && !o.language && !o.format && o.metric === "net") ?? obs.find((o) => o.period.type === "day" && (o.period as any).day === 1 && !o.format);
    return { territory: t.territory, obs, latestCume, opening, day1 };
  });
}

export default function Worldwide() {
  const [film, setFilm] = useState<Film>("ramayana");
  const [sel, setSel] = useState<{ iso: string; name: string } | null>({ iso: "840", name: "United States of America" });
  const meta = film === "ramayana" ? ramMeta : gzMeta;
  const rows = rowsFor(film);
  const color = film === "ramayana" ? "#F5B942" : "#3B82F6";

  const values: MapValue[] = [];
  for (const r of rows) {
    const ref = r.latestCume ?? r.opening ?? r.day1;
    if (!ref) continue;
    for (const iso of ISO[r.territory] ?? []) values.push({ iso, t: 1, label: money(ref.amount, ref.unit) ?? "" });
  }
  const selCode = sel ? NAME_TO_CODE[sel.name] : null;
  const selRows = rows.filter((r) => (ISO[r.territory] ?? []).includes(sel?.iso ?? "-"));
  const release = meta.releases.find((x) => (ISO[x.territory] ?? []).includes(sel?.iso ?? "-"));
  const reportedCountries = COUNTRIES.filter((c) => (film === "ramayana" ? ["United States"] : ["United States", "Canada", "Japan"]).includes(c)).length;

  return (
    <>
      <Section
        eyebrow="International"
        title="Worldwide territory performance"
        intro="Original currency is kept for every figure. Conversions use the stored ECB reference rate and its date; until the first scheduled fetch, converted columns stay empty rather than guessing a rate."
        right={<Segmented label="Film" value={film} onChange={setFilm} options={[{ value: "ramayana", label: "Ramayana" }, { value: "godzilla", label: "Godzilla −0.0" }]} />}
      >
        <Coverage have={reportedCountries} total={COUNTRIES.length} label="Listed countries with a country-level figure" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card title="Click a country">
            <WorldMap values={values} selected={sel?.iso ?? null} onSelect={(iso, name) => setSel({ iso, name })} color={color} />
            <p className="mt-2 text-xs text-mute">Coloured: a country-level figure exists. US and Canada are coloured together when only a combined figure is published.</p>
          </Card>
          <Card title={sel?.name ?? "No country selected"} sub={release ? `Release ${release.date ? date(release.date) : "unconfirmed"} · ${release.distributor ?? "distributor not announced"}` : "No release recorded for this country"}>
            {selRows.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {selRows.flatMap((r) =>
                  r.obs.map((o) => (
                    <li key={o.id} className="flex flex-col gap-1 py-2.5">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          {TERRITORY[o.territory]} {o.format ? `· ${o.format}` : ""} ·{" "}
                          {o.period.type === "weekend" ? (o.period as any).label : o.period.type === "cume" ? `cumulative to ${date((o.period as any).asOf, { day: "numeric", month: "short" })}` : `Day ${(o.period as any).day}`}
                        </span>
                        <span className="num shrink-0 font-semibold">{money(o.amount, o.unit)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
                        <SourceTag id={o.source} url={o.url} compact /> <StatusPill status={o.status} />
                        {o.unit !== "USD" && toUSD(o.amount, o.unit) && <span className="num">≈ {usd(toUSD(o.amount, o.unit))}</span>}
                        {o.unit !== "INR_CR" && toINRcr(o.amount, o.unit) && <span className="num">≈ {cr(toINRcr(o.amount, o.unit))}</span>}
                      </div>
                      {o.note && <p className="text-xs text-mute">{o.note}</p>}
                    </li>
                  )),
                )}
              </ul>
            ) : selCode === "CN" ? (
              <div className="flex flex-col gap-2">
                <StatusPill status="unconfirmed" />
                <p className="text-sm text-mute">Mainland China theatrical release: Unconfirmed. No revenue is shown. Hong Kong is tracked as a separate territory.</p>
              </div>
            ) : (
              <NotReported label="Not reported for this country" />
            )}
          </Card>
        </div>
      </Section>

      <Section title="Territory table" intro="Aggregated rows are shown once and never summed again with country rows inside them.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  {["Territory", "Release", "Distributor", "Opening day", "Opening weekend", "Latest cumulative", "Local currency", "≈ USD", "≈ INR", "Theaters", "Source"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rel = meta.releases.find((x) => x.territory === r.territory || (r.territory === "US" && x.territory === "US-CA"));
                  const ref = r.latestCume ?? r.opening;
                  return (
                    <tr key={r.territory} className="border-b border-line/60">
                      <td className="px-3 py-2.5 font-medium">{TERRITORY[r.territory]}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-mute">{rel?.date ? date(rel.date, { day: "numeric", month: "short" }) : "—"}</td>
                      <td className="px-3 py-2.5 text-mute">{rel?.distributor ?? "—"}</td>
                      <td className="num px-3 py-2.5">{r.day1 ? money(r.day1.amount, r.day1.unit) : <NotReported />}</td>
                      <td className="num px-3 py-2.5">{r.opening ? money(r.opening.amount, r.opening.unit) : <NotReported />}</td>
                      <td className="num px-3 py-2.5">{r.latestCume ? money(r.latestCume.amount, r.latestCume.unit) : <NotReported />}</td>
                      <td className="px-3 py-2.5 text-mute">{ref?.unit === "INR_CR" ? "INR" : ref?.unit ?? "—"}</td>
                      <td className="num px-3 py-2.5 text-mute">{ref ? usd(toUSD(ref.amount, ref.unit)) ?? "FX pending" : "—"}</td>
                      <td className="num px-3 py-2.5 text-mute">{ref ? cr(toINRcr(ref.amount, ref.unit)) ?? "FX pending" : "—"}</td>
                      <td className="num px-3 py-2.5">{r.obs.find((o) => o.theaters)?.theaters?.toLocaleString() ?? <NotReported />}</td>
                      <td className="px-3 py-2.5">{ref && <SourceTag id={ref.source} url={ref.url} compact />}</td>
                    </tr>
                  );
                })}
                {COUNTRIES.filter((c) => !(film === "godzilla" && ["United States", "Canada", "Japan"].includes(c)) && !(film === "ramayana" && c === "United States")).map((c) => (
                  <tr key={c} className="border-b border-line/60 text-mute">
                    <td className="px-3 py-2 text-fg/80">{c}</td>
                    <td className="px-3 py-2" colSpan={10}>
                      {c === "Mainland China" ? <span className="text-down">Release unconfirmed</span> : <span className="italic text-mute/80">Not reported</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute">
            FX: {site.fx.status === "ok" ? `ECB reference rates of ${date(site.fx.date)} via Frankfurter (USD→INR ${(site.fx.rates as any).INR}, USD→JPY ${(site.fx.rates as any).JPY}).` : "Waiting for the first scheduled rate fetch. Conversions are left blank until then."}
          </p>
        </Card>
        <Note>
          Data rules: Hong Kong and mainland China are separate territories. Presales snapshots are never shown as cumulative totals. A market with no report shows "Not reported", never zero. A country appears as released only with a dated release from a distributor or tracker.
        </Note>
      </Section>
    </>
  );
}
