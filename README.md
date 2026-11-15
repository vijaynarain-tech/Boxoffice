# Box Office Intelligence

Made by **Vijay Narain Meena** · Instagram [@vijay.narain.meena](https://www.instagram.com/vijay.narain.meena/)

Source-verified box office tracking for **Ramayana: Rise of a Legend** (2026) and **Godzilla Minus Zero** (2026), with Indian all-time records, a head-to-head comparison and scenario forecasts.

No login, no database. The site is a static React app built from a JSON dataset that a scheduled job regenerates three times a day.

## How it works

```
data/ledger/*.json   ← every figure, exactly as a source published it (URL + retrieval time)
data/inbox/*.json    ← new figures dropped in by hand or by a future adapter
        │
        ▼
scripts/pipeline/run.ts   validate (Zod) → cross-check → FX fetch → conflicts & revisions
                          → analytics → rankings → forecasts
        │
        ▼
src/generated/site-data.json  →  Vite + React site (dist/)
data/state/runs.json          →  run log shown on the site
```

* **Nothing is derived inside the ledger.** Derived values (India gross = worldwide − overseas, IMAX totals) are computed in the pipeline and labelled *Derived* on the site.
* **Conflicts are kept, not averaged.** The primary source follows a stated priority; the others stay visible.
* **Failures keep the previous dataset.** The output file is written atomically and only after every check passes.
* **Missing data shows as "Not reported"**, never zero.

## Data sources and automation

None of the box-office trackers (Sacnilk, Koimoi, Bollywood Hungama, Box Office India, Box Office Mojo, The Numbers) offers a public API, and several prohibit scraping, so the pipeline does **not** scrape them. Their figures enter through the ledger or `data/inbox/`. The registry with access terms is in `data/ledger/sources.json` and on the site's *Sources & method* page.

Automated today: exchange rates from the ECB via [Frankfurter](https://www.frankfurter.app/) (free, no key). Comscore and IMDbPro sell licensed feeds; an adapter can be added in `scripts/pipeline/` if you license one.

## Schedule

`.github/workflows/update-data.yml` runs at 08:00, 15:00 and 22:00 IST (`30 2,9,16 * * *` UTC) and on demand. It runs the pipeline, checks the site builds, and commits the new dataset. Scheduled workflows only run on the repository's **default branch**.

## Run locally

```bash
npm install
npm run pipeline          # rebuild the dataset (add --offline to skip the FX fetch)
npm run dev               # http://localhost:5173
npm test                  # pipeline self-test
npm run build             # static site in dist/
npm run build:preview     # one self-contained HTML file in dist-preview/
```

## Deploy

* **Vercel:** import the repo; `vercel.json` sets the build. Each data commit redeploys automatically.
* **GitHub Pages (public, no login):** in *Settings → Pages*, set *Source* to **GitHub Actions**. `.github/workflows/deploy-pages.yml` then deploys on every push to the default branch and after every scheduled data update. Live at `https://vijaynarain-tech.github.io/boxoffice/`.

## Images

Official posters are copyrighted and not licensed for this site, so the site uses original placeholder artwork and links to each film's official listing. Replace the art in `src/components/Posters.tsx` with licensed images if you obtain rights.
