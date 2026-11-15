import { useEffect, useState, type ComponentType } from "react";
import { Clapperboard, RefreshCw } from "lucide-react";
import { site, dateTimeIST, lastUpdate } from "./data";
import Overview from "./pages/Overview";
import Ramayana from "./pages/Ramayana";
import Languages from "./pages/Languages";
import Regions from "./pages/Regions";
import Worldwide from "./pages/Worldwide";
import Advance from "./pages/Advance";
import Formats from "./pages/Formats";
import Godzilla from "./pages/Godzilla";
import Compare from "./pages/Compare";
import Records from "./pages/Records";
import Forecast from "./pages/Forecast";
import China from "./pages/China";
import Methodology from "./pages/Methodology";

export const ROUTES: { id: string; label: string; Page: ComponentType }[] = [
  { id: "overview", label: "Overview", Page: Overview },
  { id: "ramayana", label: "Ramayana", Page: Ramayana },
  { id: "languages", label: "Languages", Page: Languages },
  { id: "regions", label: "States & circuits", Page: Regions },
  { id: "worldwide", label: "Worldwide", Page: Worldwide },
  { id: "advance", label: "Advance booking", Page: Advance },
  { id: "formats", label: "IMAX & formats", Page: Formats },
  { id: "godzilla", label: "Godzilla −0.0", Page: Godzilla },
  { id: "compare", label: "Head to head", Page: Compare },
  { id: "records", label: "Records", Page: Records },
  { id: "forecast", label: "Forecast", Page: Forecast },
  { id: "china", label: "China", Page: China },
  { id: "methodology", label: "Sources & method", Page: Methodology },
];

const current = () => {
  const h = location.hash.replace(/^#/, "");
  return ROUTES.some((r) => r.id === h) ? h : "overview";
};

export function go(id: string) {
  location.hash = id;
}

export default function App() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    document.getElementById(`nav-${route}`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [route]);
  const { Page } = ROUTES.find((r) => r.id === route)!;
  const lastRun = site.runs[0] as any;

  return (
    <div className="min-h-screen">
      <header className="sticky z-50 border-b border-line bg-ink/90 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="gutter mx-auto flex max-w-[1280px] items-center justify-between gap-3 py-3">
          <a href="#overview" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ram to-ram-2 text-ink">
              <Clapperboard size={17} strokeWidth={2.4} aria-hidden />
            </span>
            <span className="font-display text-[15px] font-extrabold leading-none tracking-tight">
              Box Office <span className="text-ram">Intelligence</span>
            </span>
          </a>
          <div className="flex items-center gap-2 text-right text-[11px] leading-tight text-mute">
            <RefreshCw size={13} aria-hidden className="hidden sm:block" />
            <div>
              <div className="hidden sm:block">Last successful update</div>
              <div className="num text-fg">{dateTimeIST(lastUpdate?.finishedAt)}</div>
              {lastRun?.status === "failed" && <div className="text-down">Latest run failed; showing previous data</div>}
            </div>
          </div>
        </div>
        <nav aria-label="Sections" className="gutter mx-auto max-w-[1280px]">
          <ul className="scroll-x -mb-px flex gap-1 pb-2 [scrollbar-width:none]">
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a
                  id={`nav-${r.id}`}
                  href={`#${r.id}`}
                  aria-current={route === r.id ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${route === r.id ? "bg-raised text-fg" : "text-mute hover:bg-surface hover:text-fg"}`}
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="gutter mx-auto flex max-w-[1280px] flex-col gap-12 pb-20 pt-6 sm:pt-8" key={route}>
        <Page />
      </main>
      <footer className="border-t border-line">
        <div className="gutter mx-auto flex max-w-[1280px] flex-col gap-2 py-6 text-xs text-mute sm:flex-row sm:justify-between">
          <span>Every figure links to the report it came from. Figures marked Unverified, Estimated or Projection are labelled where they appear.</span>
          <span>Data refreshed 08:00 · 15:00 · 22:00 IST</span>
        </div>
      </footer>
    </div>
  );
}
