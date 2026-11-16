import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Content Security Policy for the public site. GitHub Pages cannot send headers,
 * so it goes in a <meta> tag. Everything is served from the site itself; no
 * third-party scripts, styles, fonts or trackers. Not applied to the single-file
 * preview, which inlines its scripts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

const csp = (): Plugin => ({
  name: "inject-csp",
  apply: "build",
  transformIndexHtml: (html) => html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// `npm run build` -> multi-file static site (GitHub Pages / Vercel).
// `npm run build:preview` -> one self-contained HTML file for sharing a preview.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "singlefile" ? [react(), viteSingleFile()] : [react(), csp()],
  build: {
    outDir: mode === "singlefile" ? "dist-preview" : "dist",
    chunkSizeWarningLimit: 1500,
  },
}));
