# who-am-i-youtube

## Back Story
2 years ago, I worked on an analysis project entitled: [Who Am I? | Spotify](https://www.linkedin.com/pulse/who-am-i-spotify-part-1-michael-maina/)

You can read all about it in the link above, but basically, I extracted my Spotify streaming data using Spotify APIs and then analyzed it to create a Power BI report displaying insights about my listening habits.

This is the YouTube rendition — a standalone, publicly hosted **data-storytelling web app** (not a BI tool) built from a personal Google Takeout export.

Welcome to **Who Am I? | YouTube**

---

## Architecture

```
Google Takeout (My Activity → YouTube, JSON)  →  datasets/<person>/MyActivity.json
   └─ enrich_watch_history.py  ──►  datasets/<person>/MyActivity_enriched.json   (YouTube Data API: category, thumbnail, channel, country, duration)
        └─ pipelines/load_history.py  ──►  Neon Postgres (history, video_categories, pipeline_state)
             └─ netlify/functions/*   ──►  React + Vite dashboard (Recharts)
```

### One repo, many people
This repo serves every person's dashboard. Application code is shared; **data and
deployment are per person**: their own `datasets/<person>/` folder, their own
`people/<person>.env` (holding their Neon `DATABASE_URL`), their own Neon database,
and their own Netlify site at `who-am-i-youtube-<person>.netlify.app`. Pushing to
`main` redeploys everyone.

Every pipeline command takes `--person <slug>`, which selects the dataset folder
*and* the database together, so the two can't be mismatched.

📋 **Adding someone new? Follow [ONBOARDING.md](ONBOARDING.md).**

- **DB**: Postgres on Neon. `history` (one row per activity, ~109.5K rows) + `video_categories` + `pipeline_state`.
- **API**: Netlify Functions (one per query) using `@neondatabase/serverless`. The browser never talks to Postgres directly.
- **Frontend**: React + Vite, component-per-file. Recharts + a custom animated bar-chart race. Light/dark, liquid-glass, Material Symbols.

All time-of-day / day / month insights are computed from **`time_eat`** (East Africa Time, UTC+3), stored at write time.

---

## Prerequisites
- Python 3.11+ and Node 18+ (developed on Python 3.14 / Node 24).
- A Neon Postgres database and a YouTube Data API v3 key.

## Environment
Two layers. **Shared** settings — copy `.env.example` → `.env`:
```
YOUTUBE_API_KEY=...        # YouTube Data API v3 (one key enriches everyone)
PYTHONPATH=.
```
**Per person** — copy `people/emtatu.env.example` → `people/<person>.env`:
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
```
Both are gitignored — never commit them. Only the `*.env.example` templates are tracked.

## 1. Data pipeline (Python)
Every command takes `--person <slug>` (defaults to `$PERSON`, then `emtatu`):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python -m db.migrate --person emtatu                 # create tables + indexes
python -m pipelines.video_categories --person emtatu # load the category dimension

# (only when you download a NEW raw export) enrich it first:
python enrich_watch_history.py --person emtatu       # datasets/emtatu/MyActivity.json → ..._enriched.json

python -m pipelines.load_history --person emtatu     # load the enriched file (idempotent)
```
Each DB command logs `Connecting as person=… → host/db` before writing anything.

### Incremental updates
Drop a fresh `MyActivity.json` into `datasets/<person>/` and run:
```bash
python -m pipelines.incremental_update --person emtatu
```
It enriches only the new entries, loads only those newer than
`pipeline_state.last_synced_time`, appends them to the local enriched file, and is
idempotent (dedup via a per-row `activity_hash` — re-running adds no duplicates).

## 2. Web app (local)
```bash
npm install
PERSON=emtatu node scripts/dev-server.mjs   # Netlify functions at :8888
npm run dev                                 # Vite dev server at :5173, proxies /api → :8888
```
Open http://localhost:5173. Handy checks:
```bash
PERSON=emtatu node scripts/test-functions.mjs   # invoke every API function against that person's DB
```
`PERSON` picks which person's database the local API talks to; it defaults to `emtatu`.

## 3. Deploy to Netlify
The repo already contains `netlify.toml` (build command, functions dir, `/api/*` + SPA redirects).

**One Netlify site per person, all pointed at this same repo.** Each site sets its
own `DATABASE_URL` environment variable and deploys from `main`, so a single push
redeploys everyone against their own data.

Full walkthrough — Neon project, env file, pipeline run and Netlify site — is in
**[ONBOARDING.md](ONBOARDING.md)**.

Each site needs two environment variables: `DATABASE_URL` (its Neon database) and
`PERSON` (its slug — builds the `og:url` / canonical link-preview URLs). `SITE_URL`
overrides the derived URL if a person gets a custom domain.

> The Python pipelines run locally (or via a scheduled job) to populate Neon; they
> are not part of the Netlify build. Netlify never needs `YOUTUBE_API_KEY`.

### Brand assets
`public/favicon.svg` is the source mark. The two committed PNGs — `favicon-96.png`
(fallback favicon) and `og-image.png` (1200×630 link-preview card) — are generated
from it and from markup in the script, so they stay reproducible:

```bash
node scripts/make-brand-assets.mjs   # needs local Chrome; not part of `npm run build`
```

Keep the card generic: one image serves every person's site.

---

## Notes & limitations
- **African-creator** counts use each channel's *self-reported* YouTube country; videos with no channel country (~34% of watched) are excluded, and that share is shown.
- **Shorts** are detected from the `#shorts` title tag; a Short whose title omits the tag is missed.
- `activity_type` stores the raw verb (`watched`, `liked`, `searched for`, …); all video/channel insights filter to `watched`.
