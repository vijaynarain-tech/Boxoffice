/**
 * Original placeholder key art. Official posters are copyrighted and not licensed
 * for this site, so each panel links to the official listing instead of embedding it.
 */
export function RamayanaArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 440" className={className} role="img" aria-label="Ramayana placeholder artwork: a bow drawn against a setting sun">
      <defs>
        <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0f1f" />
          <stop offset="0.55" stopColor="#6b2a1c" />
          <stop offset="1" stopColor="#e76f35" />
        </linearGradient>
        <radialGradient id="rsun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="0.6" stopColor="#f5b942" />
          <stop offset="1" stopColor="#f5b942" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="440" fill="url(#rsky)" />
      <circle cx="150" cy="250" r="120" fill="url(#rsun)" opacity="0.9" />
      <circle cx="150" cy="250" r="62" fill="#ffd27a" opacity="0.95" />
      <path d="M0 330 L60 300 L110 320 L170 285 L230 315 L300 290 L300 440 L0 440 Z" fill="#2a1414" />
      <path d="M0 365 L80 345 L150 360 L220 340 L300 355 L300 440 L0 440 Z" fill="#140a0c" />
      {/* bow */}
      <path d="M95 110 Q40 250 95 390" fill="none" stroke="#140a0c" strokeWidth="9" strokeLinecap="round" />
      <path d="M95 110 L95 390" stroke="#140a0c" strokeWidth="1.5" />
      <path d="M95 250 L250 250" stroke="#140a0c" strokeWidth="3" />
      <path d="M250 250 l-16 -8 l4 8 l-4 8 Z" fill="#140a0c" />
      <text x="150" y="56" textAnchor="middle" fill="#ffe3a1" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="30" letterSpacing="6">RAMAYANA</text>
      <text x="150" y="80" textAnchor="middle" fill="#f5b942" fontFamily="Inter, sans-serif" fontSize="11" letterSpacing="4">RISE OF A LEGEND</text>
    </svg>
  );
}

export function GodzillaArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 440" className={className} role="img" aria-label="Godzilla Minus Zero placeholder artwork: glowing dorsal plates over a dark sea">
      <defs>
        <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030712" />
          <stop offset="0.6" stopColor="#0b1f3a" />
          <stop offset="1" stopColor="#0a2a4a" />
        </linearGradient>
        <radialGradient id="gglow" cx="0.5" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="440" fill="url(#gsky)" />
      <ellipse cx="150" cy="250" rx="160" ry="120" fill="url(#gglow)" opacity="0.55" />
      {/* dorsal plates */}
      {[
        [70, 300, 40], [100, 270, 62], [130, 240, 84], [160, 230, 92], [190, 250, 76], [220, 280, 56], [245, 305, 36],
      ].map(([x, y, h], i) => (
        <path key={i} d={`M${x - 14} ${y + 30} L${x} ${y - h + 40} L${x + 14} ${y + 30} Z`} fill="#06101f" stroke="#7dd3fc" strokeWidth="1.5" strokeOpacity="0.8" />
      ))}
      <path d="M0 330 Q75 312 150 330 T300 330 L300 440 L0 440 Z" fill="#020617" />
      <path d="M0 345 Q75 330 150 345 T300 345" fill="none" stroke="#22d3ee" strokeOpacity="0.35" />
      <text x="150" y="56" textAnchor="middle" fill="#e0f2fe" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="28" letterSpacing="5">GODZILLA</text>
      <text x="150" y="82" textAnchor="middle" fill="#22d3ee" fontFamily="JetBrains Mono, monospace" fontSize="15" letterSpacing="3">−0.0</text>
    </svg>
  );
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
