"""Incremental update: fold a freshly-downloaded raw MyActivity.json into `history`.

Flow (keeps a single, ever-growing local enriched file — no temp/extra files):
  1. Read pipeline_state.last_synced_time (UTC) from the DB.
  2. Load the newly-downloaded raw export (default datasets/MyActivity.json).
  3. Keep only raw entries with time > last_synced_time — the genuinely new ones.
  4. Enrich ONLY those new entries (YouTube Data API) in memory.
  5. Append the enriched new entries to datasets/MyActivity_enriched.json so the
     local enriched copy grows with new data only.
  6. Upsert those new enriched entries into `history` using the SAME parsing
     logic as the initial loader (shared module).
  7. Advance last_synced_time to the new max time.

Boundary/duplicate entries are handled by the activity_hash unique constraint,
not hand-rolled de-dup. Re-running with the same file adds nothing.

Usage (from repo root):
    python -m pipelines.incremental_update                       # uses default paths
    python -m pipelines.incremental_update --raw path/to/MyActivity.json
"""
import argparse
import json
import logging

import enrich_watch_history
from enrich_watch_history import DEFAULT_INPUT_FILE, DEFAULT_OUTPUT_FILE
from pipelines.common.db import (
    batch_upsert_history,
    get_conn,
    get_pipeline_state,
    set_pipeline_state,
)
from pipelines.common.logging_config import setup_logging
from pipelines.common.parse import parse_utc, record_to_row

setup_logging()
logger = logging.getLogger(__name__)


def run(raw_path: str = DEFAULT_INPUT_FILE, enriched_path: str = DEFAULT_OUTPUT_FILE) -> None:
    conn = get_conn()
    last_synced = get_pipeline_state(conn, "last_synced_time")
    last_synced_dt = parse_utc(last_synced) if last_synced else None
    logger.info("last_synced_time = %s", last_synced or "(none — will load all)")

    # Step 2: load the newly-downloaded raw export.
    logger.info("Loading raw export %s ...", raw_path)
    with open(raw_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Step 3: keep only genuinely new entries (raw `time` is on every entry).
    if last_synced_dt is None:
        new_entries = [e for e in raw if e.get("time")]
    else:
        new_entries = [
            e for e in raw if e.get("time") and parse_utc(e["time"]) > last_synced_dt
        ]
    logger.info("%d of %d raw entries are newer than last_synced_time.", len(new_entries), len(raw))

    if not new_entries:
        logger.info("Nothing new to load. Done.")
        conn.close()
        return

    # Step 4: enrich ONLY the new entries (in place, no temp files).
    enrich_watch_history.enrich_entries(new_entries)

    # Step 5: append the enriched new entries to the local enriched file.
    try:
        with open(enriched_path, "r", encoding="utf-8") as f:
            enriched_all = json.load(f)
    except FileNotFoundError:
        enriched_all = []
    enriched_all.extend(new_entries)
    with open(enriched_path, "w", encoding="utf-8") as f:
        json.dump(enriched_all, f, indent=2, ensure_ascii=False)
    logger.info("Appended %d records to %s (now %d total).", len(new_entries), enriched_path, len(enriched_all))

    # Step 6: upsert the new enriched entries (idempotent via activity_hash).
    rows = (record_to_row(e) for e in new_entries)
    inserted, skipped = batch_upsert_history(conn, rows, batch=1000)
    logger.info("Upsert complete: %d inserted, %d skipped (already present).", inserted, skipped)

    # Step 7: advance the bookmark to the new max time.
    with conn.cursor() as cur:
        cur.execute('SELECT max("time") FROM history')
        row = cur.fetchone()
        max_time = row[0] if row else None
    if max_time is not None:
        set_pipeline_state(conn, "last_synced_time", max_time.isoformat())
        logger.info("pipeline_state.last_synced_time advanced to %s", max_time.isoformat())
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Incrementally load a new MyActivity.json export into history.")
    parser.add_argument("--raw", default=DEFAULT_INPUT_FILE, help="Path to the newly-downloaded raw MyActivity.json")
    parser.add_argument("--enriched", default=DEFAULT_OUTPUT_FILE, help="Path to the local enriched file to append to")
    args = parser.parse_args()
    run(args.raw, args.enriched)
