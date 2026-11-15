/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080D18",
        surface: "#111A2B",
        raised: "#182338",
        line: "#24314A",
        ram: { DEFAULT: "#F5B942", 2: "#E76F35" },
        godz: { DEFAULT: "#3B82F6", 2: "#22D3EE" },
        up: "#22C55E",
        down: "#EF4444",
        fg: "#F8FAFC",
        mute: "#94A3B8",
      },
      fontFamily: {
        display: ["Manrope", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
