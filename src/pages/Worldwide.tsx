import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { site, ramMeta, gzMeta, money, usd, cr, date, toUSD, toINRcr, TERRITORY, ASIA, sourceName, type Obs } from "../data";
import { Card, Coverage, Note, NotReported, Section, Segmented, SourceTag, StatusPill } from "../components/ui";
import { WorldMap, type MapValue } from "../components/WorldMap";
import { axis, C, RichTooltip } from "../components/charts";

type Film = "ramayana" | "godzilla";

/** Territory codes → ISO 3166 numeric ids used by world-atlas. Aggregates map to nothing. */
const ISO: Record<string, string[]> = {
  IN: ["356"], US: ["840"], "US-CA": ["840", "124"], CA: ["124"], JP: ["392"], CN: ["156"], AU: ["036"], NZ: ["554"], GB: ["826"], DE: ["276"], NL: ["528"], FR: ["250"],
  NP: ["524"], MY: ["458"], TH: ["764"], SG: ["702"], VN: ["704"], TW: ["158"], KR: ["410"], ID: ["360"], PH: ["608"], AE: ["784"], HK: ["344"],
};
const isoToCode = Object.fromEntries(Object.entries(ISO).filter(([k]) => k !== "US-CA").flatMap(([k, v]) => v.map((i) => [i, k])));
const COUNTRIES = ["US", "CA", "GB", "IE", "AU", "NZ", "AE", "SA", "QA", "KW", "BH", "OM", "SG", "MY", "NP", "DE", "FR", "NL", "ES", "JP", "TW", "HK", "CN"];
const EXTRA_NAMES: Record<string, string> = { IE: "Ireland", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", ES: "Spain" };
const nameOf = (c: string) => TERRITORY[c] ?? EXTRA_NAMES[c] ?? c;

const STATUS_ORDER: Record<string, number> = { final: 6, revised: 5, estimated: 4, live: 3, reference: 2, projection: 1 };
const best = (a: Obs[]) => [...a].sort((x, y) => (STATUS_ORDER[y.status] ?? 0) - (STATUS_ORDER[x.status] ?? 0))[0];
const isGross = (o: Obs) => o.metric === "gross" && !o.format;

/** Latest figure for a territory: the latest cumulative, else the latest weekend, else a day figure. */
function latestFor(obs: Obs[]) {
  const g = obs.filter(isGross);
  const cumes = g.filter((o) => o.period.type === "cume");
  const cume = cumes.length ? best(cumes.filter((o) => (o.period.throughDay ?? 999) === Math.max(...cumes.map((x) => x.period.throughDay ?? 999)))) : null;
  const weekends = g.filter((o) => o.period.type === "weekend");
  const weekend = weekends.length ? best(weekends) : null;
  return cume ?? weekend ?? best(g.filter((o) => o.period.type === "day")) ?? null;
}
const windowLabel = (o: Obs) =>
  o.period.type === "weekend" ? o.period.label! : o.period.type === "cume" ? (o.period.asOf ? `to ${date(o.period.asOf, { day: "numeric", month: "short" })}` : "running total") : `Day ${o.period.day} only`;

function territoryRows(film: Film) {
  return site.territories
    .filter((t) => t.film === film && t.observations.some((o) => !o.format))
    .map((t) => {
      const obs = t.observations;
      const opening = best(obs.filter((o) => isGross(o) && o.period.type === "weekend" && ["2026-11-05", "2026-11-06"].includes(o.period.start!)));
      const day1 = best(obs.filter((o) => isGross(o) && o.period.type === "day" && o.period.day === 1));
      return { territory: t.territory, obs, latest: latestFor(obs), opening, day1, aggregate: ["OS", "INTL", "INTL_OTHER", "GULF", "ME", "APAC_OTHER"].includes(t.territory) };
    })
    .sort((a, b) => Number(a.aggregate) - Number(b.aggregate) || (toUSD(b.latest?.amount ?? 0, b.latest?.unit ?? "USD") ?? 0) - (toUSD(a.latest?.amount ?? 0, a.latest?.unit ?? "USD") ?? 0));
}

function AsiaSection() {
  const ram = territoryRows("ramayana");
  const gz = territoryRows("godzilla");
  const forFilm = (rows: ReturnType<typeof territoryRows>, code: string) => {
    if (code === "IN" && rows === ram) return { amount: site.ramayana.headline.indiaGross?.amount ?? null, unit: "INR_CR", label: `to Day ${site.ramayana.headline.indiaGross?.day}`, source: null, status: "derived" };
    if (code === "JP" && rows === gz) {
      const j = site.observations.find((o) => o.film === "godzilla" && o.territory === "JP" && o.unit === "JPY" && o.period.type === "cume");
      return j ? { amount: j.amount, unit: j.unit, label: windowLabel(j), source: j.source, status: j.status, url: j.url } : null;
    }
    const r = rows.find((x) => x.territory === code)?.latest;
    return r ? { amount: r.amount, unit: r.unit, label: windowLabel(r), source: r.source, status: r.status, url: r.url } : null;
  };
  const chart = ASIA.filter((a) => !["IN", "JP"].includes(a.code))
    .map((a) => {
      const r = ram.find((x) => x.territory === a.code)?.latest;
      const g = gz.find((x) => x.territory === a.code)?.latest;
      return { label: TERRITORY[a.code].replace(" (combined)", "*"), Ramayana: r && r.unit === "USD" ? r.amount : null, Godzilla: g && g.unit === "USD" ? g.amount : null };
    })
    .filter((d) => d.Ramayana || d.Godzilla);
  const ramCount = ASIA.filter((a) => !a.aggregate && forFilm(ram, a.code)).length;
  const gzCount = ASIA.filter((a) => !a.aggregate && forFilm(gz, a.code)).length;
  const countries = ASIA.filter((a) => !a.aggregate).length;
  return (
    <Section eyebrow="Asia" title="Asian markets" intro="Both films side by side in every Asian market with a published figure. Each figure keeps its own window and currency, so no leader is named. Rows marked combined are regional aggregates.">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Coverage have={ramCount} total={countries} label="Ramayana: Asian countries reported" />
        <Coverage have={gzCount} total={countries} label="Godzilla: Asian countries reported" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-3 py-2.5">Market</th>
                  <th className="px-3 py-2.5 text-ram">Ramayana</th>
                  <th className="px-3 py-2.5 text-godz-2">Godzilla −0.0</th>
                </tr>
              </thead>
              <tbody>
                {ASIA.map((a) => {
                  const r = forFilm(ram, a.code);
                  const g = forFilm(gz, a.code);
                  const gzRel = gzMeta.releases.find((x) => x.territory === a.code);
                  const cell = (v: ReturnType<typeof forFilm>, rel?: { status: string; date: string | null }) =>
                    v ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="num font-semibold">{money(v.amount, v.unit)}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-mute">
                          {v.label} {v.source && <SourceTag id={v.source} url={(v as any).url} compact />} <StatusPill status={v.status} />
                        </span>
                      </div>
                    ) : a.code === "CN" ? (
                      <span className="text-xs text-down">Release unconfirmed</span>
                    ) : rel?.status === "released" ? (
                      <span className="text-xs italic text-mute/80">Released{rel.date ? ` ${date(rel.date, { day: "numeric", month: "short" })}` : ""} · gross not reported</span>
                    ) : (
                      <NotReported />
                    );
                  return (
                    <tr key={a.code} className={`border-b border-line/60 align-top ${a.aggregate ? "bg-ink/30" : ""}`}>
                      <td className="px-3 py-2.5 font-medium">
                        {TERRITORY[a.code]}
                        {(a.code === "IN" || a.code === "JP") && <div className="text-[10px] font-normal text-mute">{a.code === "IN" ? "Ramayana home market" : "Godzilla home market"}</div>}
                      </td>
                      <td className="px-3 py-2.5">{cell(r)}</td>
                      <td className="px-3 py-2.5">{cell(g, gzRel)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Asian markets in USD" sub="Excluding home markets · * combined region · windows differ, see table">
          <ResponsiveContainer width="100%" height={Math.max(220, chart.length * 34)}>
            <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" {...axis} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <YAxis type="category" dataKey="label" width={118} {...axis} />
              <Tooltip content={<RichTooltip fmt={(v) => usd(v) ?? ""} />} />
              <Bar dataKey="Ramayana" fill={C.ram} radius={[0, 3, 3, 0]} isAnimationActive={false} />
              <Bar dataKey="Godzilla" fill={C.godz} radius={[0, 3, 3, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-mute">Ramayana figures are Pinkvilla's 7-day totals; Godzilla's are opening-weekend or running totals. UK opening-weekend sterling and Euro figures appear on the country panels.</p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Nepal, Malaysia, Thailand">
          <p className="text-sm leading-relaxed text-mute">Ramayana set opening records across Southeast Asia and Nepal. Its Thailand opening was 5.5× the previous highest-grossing Indian film there (Koimoi).</p>
        </Card>
        <Card title="Gulf and UAE">
          <p className="text-sm leading-relaxed text-mute">Ramayana drew 157,000 admissions in the UAE over its opening weekend, the year's biggest (Koimoi). The Gulf is usually reported as one region, so it is kept as a combined row.</p>
        </Card>
        <Card title="Japan">
          <p className="text-sm leading-relaxed text-mute">Godzilla −0.0 opened to ¥910M and 590,000+ admissions on Nov 3, a record opening day for a live-action film in Japan (Toho, via The Week). Ramayana's Japan release is not reported.</p>
        </Card>
      </div>
    </Section>
  );
}

export default function Worldwide() {
  const [film, setFilm] = useState<Film>("ramayana");
  const [sel, setSel] = useState<{ iso: string; name: string } | null>({ iso: "826", name: "United Kingdom" });
  const meta = film === "ramayana" ? ramMeta : gzMeta;
  const rows = territoryRows(film);
  const color = film === "ramayana" ? "#F5B942" : "#3B82F6";

  const usdVals = rows.filter((r) => !r.aggregate && r.latest).map((r) => toUSD(r.latest!.amount, r.latest!.unit) ?? (r.latest!.unit === "USD" ? r.latest!.amount : 0));
  const maxUsd = Math.max(...usdVals, 1);
  const values: MapValue[] = [];
  for (const r of rows) {
    if (r.aggregate || !r.latest) continue;
    const u = toUSD(r.latest.amount, r.latest.unit) ?? 0;
    for (const iso of ISO[r.territory] ?? []) values.push({ iso, t: u ? Math.sqrt(u / maxUsd) : 0.3, label: money(r.latest.amount, r.latest.unit) ?? "" });
  }
  if (film === "ramayana") values.push({ iso: "356", t: 1, label: `${cr(site.ramayana.headline.totalNet)} net` });

  const selCode = sel ? isoToCode[sel.iso] : null;
  const selRows = rows.filter((r) => (ISO[r.territory] ?? []).includes(sel?.iso ?? "-"));
  const release = meta.releases.find((x) => (ISO[x.territory] ?? []).includes(sel?.iso ?? "-"));
  const reported = COUNTRIES.filter((c) => rows.some((r) => r.latest && (r.territory === c || (c !== "US" && c !== "CA" ? false : r.territory === "US-CA" || r.territory === c)))).length;

  return (
    <>
      <Section
        eyebrow="International"
        title="Worldwide territory performance"
        intro="Original currency is kept for every figure. Conversions use the stored ECB reference rate and its date; until the first scheduled fetch they stay blank rather than guessing a rate."
        right={<Segmented label="Film" value={film} onChange={setFilm} options={[{ value: "ramayana", label: "Ramayana" }, { value: "godzilla", label: "Godzilla −0.0" }]} />}
      >
        <Coverage have={reported} total={COUNTRIES.length} label="Tracked countries with a country-level figure" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card title="Click a country" sub="Shade = size of the latest figure in USD">
            <WorldMap values={values} selected={sel?.iso ?? null} onSelect={(iso, name) => setSel({ iso, name })} color={color} />
            <p className="mt-2 text-xs text-mute">Regional aggregates (Middle East, Gulf, rest of Asia-Pacific) are not painted on the map; they are listed in the table.</p>
          </Card>
          <Card title={sel?.name ?? "No country selected"} sub={release ? `Release ${release.date ? date(release.date) : "date not published"} · ${release.distributor ?? "distributor not named"}` : selCode === "IN" && film === "ramayana" ? "Home market · see the Ramayana tracker" : "No release recorded for this country"}>
            {selRows.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {selRows.flatMap((r) =>
                  r.obs.map((o) => (
                    <li key={o.id} className="flex flex-col gap-1 py-2.5">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          {o.metric === "footfalls" ? "Admissions" : o.format ? `${o.format} gross` : "Gross"} · {windowLabel(o)}
                        </span>
                        <span className="num shrink-0 font-semibold">{money(o.amount, o.unit)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
                        <SourceTag id={o.source} url={o.url} compact /> <StatusPill status={o.status} />
                        {o.unit !== "USD" && o.unit !== "COUNT" && toUSD(o.amount, o.unit) && <span className="num">≈ {usd(toUSD(o.amount, o.unit))}</span>}
                        {o.unit !== "INR_CR" && o.unit !== "COUNT" && toINRcr(o.amount, o.unit) && <span className="num">≈ {cr(toINRcr(o.amount, o.unit))}</span>}
                        {o.screens && <span>{o.screens} screens</span>}
                      </div>
                      {o.note && <p className="text-xs text-mute">{o.note}</p>}
                    </li>
                  )),
                )}
              </ul>
            ) : selCode === "CN" ? (
              <div className="flex flex-col gap-2">
                <StatusPill status="unconfirmed" />
                <p className="text-sm text-mute">Mainland China theatrical release: Unconfirmed. No revenue is shown. Hong Kong is tracked separately.</p>
              </div>
            ) : selCode === "IN" && film === "ramayana" ? (
              <p className="text-sm text-mute">
                India net {cr(site.ramayana.headline.totalNet)} through Day {site.ramayana.lastReportedDay}. <a className="text-godz-2 hover:underline" href="#ramayana">Open the daily tracker</a>
              </p>
            ) : release?.status === "released" ? (
              <p className="text-sm text-mute">Released{release.date ? ` ${date(release.date)}` : ""}. Gross not reported yet.{release.note ? ` ${release.note}` : ""}</p>
            ) : (
              <NotReported label="Not reported for this country" />
            )}
          </Card>
        </div>
      </Section>

      <AsiaSection />

      <Section title="Territory table" intro="Aggregated rows are listed separately and never added to the countries inside them.">
        <Card>
          <div className="scroll-x -mx-4 sm:-mx-5">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="border-y border-line bg-ink/40 text-left text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  {["Territory", "Release", "Opening weekend", "Latest figure", "Window", "Currency", "≈ USD", "≈ INR", "Screens / theaters", "Source"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rel = meta.releases.find((x) => x.territory === r.territory);
                  const ref = r.latest;
                  const scr = r.obs.find((o) => o.theaters || o.screens);
                  return (
                    <tr key={r.territory} className={`border-b border-line/60 ${r.aggregate ? "bg-ink/30 text-fg/80" : ""}`}>
                      <td className="px-3 py-2.5 font-medium">{nameOf(r.territory)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-mute">{rel?.date ? date(rel.date, { day: "numeric", month: "short" }) : "—"}</td>
                      <td className="num px-3 py-2.5">{r.opening ? money(r.opening.amount, r.opening.unit) : <NotReported />}</td>
                      <td className="num px-3 py-2.5 font-semibold">{ref ? money(ref.amount, ref.unit) : <NotReported />}</td>
                      <td className="px-3 py-2.5 text-xs text-mute">{ref ? windowLabel(ref) : "—"}</td>
                      <td className="px-3 py-2.5 text-mute">{ref?.unit === "INR_CR" ? "INR" : ref?.unit ?? "—"}</td>
                      <td className="num px-3 py-2.5 text-mute">{ref ? (ref.unit === "USD" ? usd(ref.amount) : usd(toUSD(ref.amount, ref.unit)) ?? "FX pending") : "—"}</td>
                      <td className="num px-3 py-2.5 text-mute">{ref ? cr(toINRcr(ref.amount, ref.unit)) ?? "FX pending" : "—"}</td>
                      <td className="num px-3 py-2.5">{scr ? (scr.theaters ?? scr.screens)!.toLocaleString() : <NotReported />}</td>
                      <td className="px-3 py-2.5">{ref && <SourceTag id={ref.source} url={ref.url} compact />}</td>
                    </tr>
                  );
                })}
                {COUNTRIES.filter((c) => !rows.some((r) => r.territory === c || (r.territory === "US-CA" && (c === "US" || c === "CA")))).map((c) => (
                  <tr key={c} className="border-b border-line/60 text-mute">
                    <td className="px-3 py-2 text-fg/80">{nameOf(c)}</td>
                    <td className="px-3 py-2" colSpan={9}>
                      {c === "CN" ? <span className="text-down">Release unconfirmed</span> : film === "ramayana" && ["SA", "QA", "KW", "BH", "OM"].includes(c) ? <span className="italic text-mute/80">Included in the combined Middle East / Gulf figure; no country split published</span> : <span className="italic text-mute/80">Not reported</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute">
            FX: {site.fx.status === "ok" ? `ECB reference rates of ${date(site.fx.date)} via Frankfurter.` : "waiting for the first scheduled rate fetch; conversions stay blank until then."} Primary figure per row: the latest cumulative total, else the opening weekend. Other sources for the same figure appear in the country panel ({sourceName("pinkvilla")}, {sourceName("koimoi")}, {sourceName("thefederal")} and others).
          </p>
        </Card>
        <Note>Data rules: Hong Kong and mainland China are separate territories. Presales are never shown as totals. A market with no report shows "Not reported", never zero. A country counts as released only with a dated release or a reported gross.</Note>
      </Section>
    </>
  );
}
