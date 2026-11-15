import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build` -> multi-file static site (Vercel / GitHub Pages).
// `npm run build:preview` -> one self-contained HTML file for sharing a preview.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "singlefile" ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === "singlefile" ? "dist-preview" : "dist",
    chunkSizeWarningLimit: 1500,
  },
}));
