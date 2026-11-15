import ramPoster from "../assets/poster-ramayana.jpg";
import gzPoster from "../assets/poster-godzilla.jpg";

/** Official theatrical posters, supplied by the site owner. */
export function RamayanaPoster({ className = "" }: { className?: string }) {
  return <img src={ramPoster} alt="Ramayana Part 1 theatrical poster: Ranbir Kapoor as Rama with Lakshmana and Sita, in cinemas Diwali 2026" className={`block h-auto w-full object-cover ${className}`} loading="eager" />;
}
export function GodzillaPoster({ className = "" }: { className?: string }) {
  return <img src={gzPoster} alt="Godzilla Minus Zero theatrical poster: Godzilla rising from a storm, filmed for IMAX, in theatres November 6" className={`block h-auto w-full object-cover ${className}`} loading="eager" />;
}
const PALETTES: Record<string, [string, string]> = {
  Hindi: ["#3b1d2e", "#b4536a"],
  Telugu: ["#1d2b3b", "#c08a3e"],
  Kannada: ["#2b1d12", "#d97a2b"],
};
export function Thumb({ title, lang }: { title: string; lang?: string }) {
  const [a, b] = PALETTES[lang ?? "Hindi"] ?? PALETTES.Hindi;
  const initials = title.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
  return (
    <div aria-hidden className="grid h-10 w-7 shrink-0 place-items-center rounded-[4px] text-[10px] font-bold text-white/90" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
      {initials}
    </div>
  );
}
