import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

const W = 960, H = 470;

export type MapValue = { iso: string; t: number; label: string };

export function WorldMap({ values, selected, onSelect, color }: { values: MapValue[]; selected: string | null; onSelect: (iso: string, name: string) => void; color: string }) {
  const { paths } = useMemo(() => {
    const fc = feature(world as any, (world as any).objects.countries) as any;
    const features = fc.features.filter((f: any) => f.properties.name !== "Antarctica");
    const proj = geoNaturalEarth1().fitSize([W, H], { type: "FeatureCollection", features } as any);
    const gp = geoPath(proj);
    return { paths: features.map((f: any) => ({ id: String(f.id), name: f.properties.name as string, d: gp(f) ?? "" })) };
  }, []);
  const byIso = new Map(values.map((v) => [v.iso, v]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="World map of reported territories">
      <rect width={W} height={H} fill="transparent" />
      {paths.map((p: { id: string; name: string; d: string }) => {
        const v = byIso.get(p.id);
        const isSel = selected === p.id;
        return (
          <path
            key={p.id + p.name}
            d={p.d}
            fill={v ? color : "#182338"}
            fillOpacity={v ? 0.35 + 0.65 * v.t : 1}
            stroke={isSel ? "#F8FAFC" : "#080D18"}
            strokeWidth={isSel ? 1.6 : 0.5}
            className="cursor-pointer transition-[fill-opacity] hover:fill-opacity-100"
            onClick={() => onSelect(p.id, p.name)}
            tabIndex={v ? 0 : -1}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.id, p.name)}
            aria-label={`${p.name}${v ? `: ${v.label}` : ": not reported"}`}
          >
            <title>{`${p.name}${v ? ` · ${v.label}` : " · Not reported"}`}</title>
          </path>
        );
      })}
    </svg>
  );
}
