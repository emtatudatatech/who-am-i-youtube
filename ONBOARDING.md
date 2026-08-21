# Onboarding a new person

How to go from *"can you make me one of those?"* to a live dashboard at
`https://who-am-i-youtube-<person>.netlify.app/`.

Budget about **30 minutes of your time**, plus however long Google takes to
prepare their export (minutes to a day or two) and ~5 minutes of pipeline runtime.

---

## The model: one repo, many sites

This repository is the single source of truth for **everyone's** dashboard.
Nobody gets a fork. Each person gets their own *data* and their own *deployment*:

| Shared by everyone | One per person |
| --- | --- |
| This Git repo | A Neon Postgres database |
| All application code | A Netlify site (`who-am-i-youtube-<person>`) |
| The YouTube API key in `.env` | `people/<person>.env` — their `DATABASE_URL` |
| The look and feel | `datasets/<person>/` — their Takeout export |

Because every site builds from this one repo, **pushing to `main` redeploys every
person's site automatically.** Improve a chart once, everyone gets it. There is
no syncing, no merging, no drift — there is only one copy of the code.

The person's slug (`emtatu`, `mtu`, …) is the single knob that ties their
folder, their env file and their database together. Pass it as `--person` and
the pipelines cannot mix two people up.

> **Naming rule:** lowercase letters, digits and hyphens, 2–32 characters. It
> becomes a folder name, a filename and a Netlify subdomain, so keep it simple.

---

## Step 1 — Ask them for their Google Takeout export

⚠️ This is the one step you cannot do for them, and the one people get wrong.
YouTube's API does **not** expose watch history — Takeout is the only source.
There are two different YouTube exports in Takeout and we need the **My Activity**
one, not the "YouTube and YouTube Music" one.

Copy-paste this to them verbatim:

> Hi! To build your dashboard I need your YouTube activity export from Google.
> It takes about 5 minutes to request, then Google emails it to you. Here's how:
>
> 1. Go to **https://takeout.google.com** and sign in with the Google account
>    you watch YouTube on — this matters if you have more than one. You'll land
>    on **"Create a new export"**; the part you want is section 1,
>    **"Select data to include"**.
> 2. Click **Deselect all**. Every Google product is now unticked.
> 3. Scroll down the product list to **My Activity** and tick its checkbox.
>    (Not "YouTube and YouTube Music" — that's a different export and it won't
>    work.) Two blue buttons appear underneath it.
> 4. Click the blue **Multiple formats** button. In the **"Edit file formats"**
>    panel, find **"Activity reports"** — there's a dropdown set to **HTML**.
>    Change it to **JSON**, then click **OK**.
> 5. Click the other blue button, **All activity included**. In the
>    **"My Activity content options"** list, click **Deselect all**, then scroll
>    down and tick **YouTube** only. Click **OK**.
> 6. Scroll to the bottom and click **Next step**.
> 7. In **"Choose file type, frequency & destination"**, pick:
>    **Send download link via email** · **Export once** · **.zip** · **2 GB**.
> 8. Click **Export** at the bottom. You'll see progress under *"Google is
>    creating a copy of data from My Activity"*, and get an immediate
>    confirmation email titled **"Archive of Google data requested"**. A second
>    email arrives with the actual download link when it's ready — usually
>    minutes, occasionally a day or two. Click that link, re-enter your Google
>    password to confirm it's you, and download the `.zip`.
> 9. Unzip it, open the extracted folder, and find
>    **`Takeout/My Activity/YouTube/MyActivity.json`**. Send me just that one
>    file.
>
> The file will be large (tens of MB) — use Google Drive or WeTransfer rather
> than email. It contains every YouTube video you've watched and every search
> you've made, so send it over something you're comfortable with.

**Sanity-check the file when it arrives.** It should be a JSON array whose
records look like this — note `"products": ["YouTube"]` and the verb at the
start of `title`:

```json
{
  "header": "YouTube",
  "title": "Watched What To Do When You Have No Vision For Your Life",
  "titleUrl": "https://www.youtube.com/watch?v=R6xonsRMQgY",
  "subtitles": [{ "name": "Jordan B Peterson", "url": "https://..." }],
  "time": "2026-08-01T07:01:43.963Z",
  "products": ["YouTube"],
  "activityControls": ["YouTube watch history"]
}
```

If instead you got a file called `watch-history.json`, they picked the wrong
export in step 3 — it has no searches, likes or subscriptions and won't load.
Send them back to step 3.

---

## Step 2 — Create their Neon database

Each person gets a **separate Neon project**, not a branch of yours. Branches
are copy-on-write clones of their parent, so branching would start them off
holding a copy of somebody else's watch history.

1. Go to **https://console.neon.tech** → **New Project**.
2. **Name:** `who-am-i-youtube-<person>` — matches the Netlify site name, so the
   two are obvious to pair up later.
3. **Postgres version:** 18 (match the others).
4. **Region:** `AWS eu-central-1 (Frankfurt)` — same as the existing sites.
5. Create it, then copy the **connection string** from the dashboard. It looks
   like:
   ```
   postgresql://neondb_owner:npg_xxxxxxxx@ep-something-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   The default pooled string is what you want — it works for both the Python
   pipelines and the Netlify functions. Keep the default database name `neondb`.

You will paste this string into **two** places: `people/<person>.env` (step 3)
and their Netlify site (step 7). Nowhere else, ever.

---

## Step 3 — Create their env file

```bash
cp people/emtatu.env.example people/mtu.env
```

Open it and paste the Neon connection string into `DATABASE_URL`.

`people/*.env` is gitignored — real connection strings never reach the repo.
Only `*.env.example` templates are committed. Verify with:

```bash
git check-ignore people/mtu.env      # should print the filename
```

---

## Step 4 — Drop their data in place

```bash
mkdir -p datasets/mtu
cp ~/Downloads/MyActivity.json datasets/mtu/MyActivity.json
```

The whole `datasets/` tree is gitignored. Nobody's watch history is ever
committed.

---

## Step 5 — Run the pipeline

From the repo root, with the venv active. Every command takes `--person`:

```bash
source .venv/bin/activate

# 1. Create the tables and indexes in their empty Neon database.
python -m db.migrate --person mtu

# 2. Load the (identical for everyone) video-category dimension.
python -m pipelines.video_categories --person mtu

# 3. Enrich the raw export with YouTube API metadata: category, thumbnail,
#    channel, country, duration. This is the slow one — it calls the YouTube
#    Data API for every unique video and channel. Expect several minutes.
python enrich_watch_history.py --person mtu

# 4. Load the enriched export into `history`. Idempotent — safe to re-run.
python -m pipelines.load_history --person mtu
```

Every command that touches the database logs its target first:

```
INFO - Connecting as person=mtu → ep-xxxx-pooler.c-4.eu-central-1.aws.neon.tech/neondb
```

**Read that line.** It is your last chance to notice you're about to write into
the wrong database. If the slug and the host don't both look right, Ctrl-C.

Step 4 finishes with a row count. A typical export is 50K–150K rows:

```
INFO - Upsert complete: 110133 inserted, 0 skipped (already present).
INFO - history now has 110132 rows.
```

> **On the YouTube API quota:** enrichment costs roughly 1 quota unit per 50
> unique videos plus 1 per 50 unique channels, against a default allowance of
> 10,000 units/day. A 110K-entry export uses a few hundred units. You can
> comfortably onboard several people a day on one key. If you do hit the
> ceiling, enrichment fails partway — wait for the quota to reset at midnight
> Pacific and re-run step 3.

---

## Step 6 — Check it locally before deploying

In two terminals:

```bash
PERSON=mtu node scripts/dev-server.mjs   # functions on :8888
npm run dev                                 # Vite on :5173
```

Open http://localhost:5173 and click through every tab. On **Superfan**, use the
picker to switch channels — it should work for any channel, not just the default.

Or check every API endpoint at once without the browser:

```bash
PERSON=mtu node scripts/test-functions.mjs
```

It prints the database it connected to, derives its test parameters from
*their* data, and should end with `All functions OK`.

---

## Step 7 — Create their Netlify site

This is the multi-site step: a **second site pointed at the same repository**.
Netlify fully supports this — each site keeps its own name, domain, environment
variables and deploy history.

1. **https://app.netlify.com** → **Add new site** → **Import an existing project**.
2. Choose **GitHub** → the **`emtatudatatech/who-am-i-youtube`** repository.
   (Netlify will not object that it is already connected to another site.)
3. **Branch to deploy:** `main`. This must match the other sites — it is what
   makes a single push redeploy everyone.
4. **Build settings:** leave them alone. `netlify.toml` already specifies the
   build command (`npm run build`), publish directory (`dist`), functions
   directory, and the `/api/*` + SPA redirects.
5. Before the first deploy, open **Add environment variables** and add:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | their Neon connection string from step 2 |

   That is the *only* variable a deployed site needs. It is read exclusively
   inside function code and never reaches the browser. The `YOUTUBE_API_KEY` is
   **not** needed here — enrichment runs on your machine, not in the build.
6. **Deploy**.
7. Rename the site to fix its URL: **Site configuration → General → Site
   details → Change site name** → `who-am-i-youtube-mtu`, giving
   `https://who-am-i-youtube-mtu.netlify.app/`.

---

## Step 8 — Verify live

Open the URL and confirm:

- [ ] The date ribbon shows **their** date range, not yours.
- [ ] The video count matches what step 5 reported.
- [ ] Every tab renders without a blank panel or a spinner that never stops.
- [ ] Light **and** dark mode both look right.

A tab stuck loading almost always means `DATABASE_URL` is missing or wrong on
the Netlify site. Check **Deploys → (latest) → Functions** for the error.

Then send them the link. 🎉

---

## Ongoing

### Shipping an improvement to everyone

```bash
git push origin main
```

That's it. Every linked site rebuilds against its own database. Nothing to
sync, nothing to merge.

> **Watch your build minutes.** One push triggers *N* builds. Netlify's free
> tier includes 300 build-minutes/month and a build here takes about a minute,
> so ~10 people means ~10 minutes per push. Batch small changes rather than
> pushing ten times in an afternoon.

### Refreshing someone's data

When they send a newer Takeout export, overwrite their raw file and run the
incremental updater. It enriches and loads only entries newer than the stored
`last_synced_time` bookmark, and is idempotent:

```bash
cp ~/Downloads/MyActivity.json datasets/mtu/MyActivity.json
python -m pipelines.incremental_update --person mtu
```

No redeploy is needed — the site reads the database live.

### Adding a database migration

New `db/migrations/*.sql` files must be applied to **every** person's database:

```bash
for p in emtatu mtu; do python -m db.migrate --person "$p"; done
```

Migrations are idempotent and recorded in `schema_migrations`, so re-running is
a no-op. Do this *before* pushing code that depends on the new column.

### Crediting someone on the Wall of Thanks

When a person's feedback turns into something that actually ships, add them to
[`public/contributors.json`](public/contributors.json) — the list behind the
rotating crown at the bottom-left of every dashboard:

```json
{
  "name": "mtu",
  "note": "Optional one-liner about them.",
  "contributions": [
    { "title": "Short feature name", "detail": "What they asked for, in a sentence or two.", "shipped": "2026-09-01" }
  ]
}
```

It's plain data served statically and fetched at runtime, so no code changes —
edit, push, and it appears on **everyone's** site. Credit ideas that shipped,
not every message; the page means more when landing on it is earned.

### Removing someone

1. Delete their Neon project (destroys their data).
2. Delete their Netlify site.
3. `rm -rf datasets/<person> people/<person>.env`

Nothing of theirs was ever in Git, so there is no history to purge.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `No env file for person 'x' at people/x.env` | Step 3 not done, or the slug is misspelled. |
| `No active person. Call ... load_person_env()` | A script reached the DB without `--person`. Add the flag. |
| `people/x.env does not set DATABASE_URL` | The template was copied but not filled in. |
| `Invalid person slug` | Uppercase, spaces, or under 2 characters. Use `mtu`, not `mtu`. |
| Enrichment stops with a quota error | YouTube API daily quota exhausted. Resumes fine after midnight Pacific — re-run step 3. |
| `load_history` reports `0 inserted, N skipped` | Already loaded. This is success, not an error. |
| Site deploys but every tab spins forever | `DATABASE_URL` missing/wrong on the Netlify site, or you loaded the data into a different database than the site points at. |
| Site shows *your* data | The Netlify site has your `DATABASE_URL`. Fix it in Site configuration → Environment variables and redeploy. |
| Charts are empty but functions return 200 | The export loaded, but has little `watched` activity — check `content_type`/`activity_type` spread in the DB. |

---

## Checklist

Copy this per person.

```
Person slug: ____________

[ ] 1. MyActivity.json received (My Activity → YouTube → JSON), format verified
[ ] 2. Neon project `who-am-i-youtube-<slug>` created, connection string copied
[ ] 3. people/<slug>.env created and filled; `git check-ignore` confirms ignored
[ ] 4. datasets/<slug>/MyActivity.json in place
[ ] 5. migrate → video_categories → enrich → load_history all run with --person
[ ]    ...and the "Connecting as person=" line matched the intended database
[ ] 6. PERSON=<slug> node scripts/test-functions.mjs → All functions OK
[ ] 7. Netlify site created from this repo, branch main, DATABASE_URL set,
[ ]    renamed to who-am-i-youtube-<slug>
[ ] 8. Live site verified: their date range, every tab, light + dark
[ ] 9. Link sent
```
