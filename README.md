# who-am-i-youtube

## Back Story
2 years ago, I worked on an analysis project entitled: [Who Am I? | Spotify](https://www.linkedin.com/pulse/who-am-i-spotify-part-1-michael-maina/)

You can read all about it in the link above, but basically, I extracted my Spotify streaming data using Spotify APIs and then analyzed it to create a Power BI report displaying insights about my listening habits.

This is the YouTube rendition — a standalone, publicly hosted **data-storytelling web app** (not a BI tool) built from a personal Google Takeout export.

Welcome to **Who Am I? | YouTube**

---

## Architecture

```
Google Takeout (My Activity → YouTube, JSON)
   └─ enrich_watch_history.py  ──►  datasets/MyActivity_enriched.json   (YouTube Data API: category, thumbnail, channel, country, duration)
        └─ pipelines/load_history.py  ──►  Neon Postgres (history, video_categories, pipeline_state)
             └─ netlify/functions/*   ──►  React + Vite dashboard (Recharts)
```

- **DB**: Postgres on Neon. `history` (one row per activity, ~109.5K rows) + `video_categories` + `pipeline_state`.
- **API**: Netlify Functions (one per query) using `@neondatabase/serverless`. The browser never talks to Postgres directly.
- **Frontend**: React + Vite, component-per-file. Recharts + a custom animated bar-chart race. Light/dark, liquid-glass, Material Symbols.

All time-of-day / day / month insights are computed from **`time_eat`** (East Africa Time, UTC+3), stored at write time.

---

## Prerequisites
- Python 3.11+ and Node 18+ (developed on Python 3.14 / Node 24).
- A Neon Postgres database and a YouTube Data API v3 key.

## Environment
Copy `.env.example` → `.env` and fill in:
```
YOUTUBE_API_KEY=...        # YouTube Data API v3
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
PYTHONPATH=.
```
`.env` is gitignored — never commit it.

## 1. Data pipeline (Python)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# (only when you download a NEW raw export) enrich it first:
python enrich_watch_history.py --input datasets/MyActivity.json --output datasets/MyActivity_enriched.json

python -m db.migrate                    # create tables + indexes
python -m pipelines.video_categories    # load the category dimension
python -m pipelines.load_history        # load datasets/MyActivity_enriched.json  (idempotent)
```

### Incremental updates
When you download a fresh `MyActivity.json` later:
```bash
python -m pipelines.incremental_update
```
It enriches the new file, loads only entries newer than `pipeline_state.last_synced_time`,
and is idempotent (dedup via a per-row `activity_hash` — re-running adds no duplicates).
The above also runs using the default paths defined within the script.
Ideally, once a new `MyActivity.json` file is updated into the `datasets\` folder,
then the script will update `datasets/MyActivity_enriched.json` with the latest records.

## 2. Web app (local)
```bash
npm install
node scripts/dev-server.mjs   # serves the Netlify functions at :8888 (reads .env)
npm run dev                   # Vite dev server at :5173, proxies /api → :8888
```
Open http://localhost:5173. Handy checks:
```bash
node scripts/test-functions.mjs   # invoke every API function against the live DB
```

## 3. Deploy to Netlify
The repo already contains `netlify.toml` (build command, functions dir, `/api/*` + SPA redirects).

1. Push this repo to GitHub/GitLab.
2. In Netlify: **Add new site → Import an existing project**, pick the repo. Build settings are read from `netlify.toml` (build `npm run build`, publish `dist`, functions `netlify/functions`).
3. **Site settings → Environment variables**: add `DATABASE_URL` (your Neon connection string). This is the only secret the deployed site needs — it is referenced only inside function code, never shipped to the browser.
4. Deploy. The dashboard reaches Neon through the Functions layer at `/api/*`.

> The Python pipelines are run locally (or via a scheduled job) to populate Neon; they are not part of the Netlify build.

---

## Notes & limitations
- **African-creator** counts use each channel's *self-reported* YouTube country; videos with no channel country (~34% of watched) are excluded, and that share is shown.
- **Shorts** are detected from the `#shorts` title tag; a Short whose title omits the tag is missed.
- `activity_type` stores the raw verb (`watched`, `liked`, `searched for`, …); all video/channel insights filter to `watched`.
