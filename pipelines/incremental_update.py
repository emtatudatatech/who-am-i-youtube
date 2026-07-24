"""Incremental update: fold a freshly-downloaded raw MyActivity.json into `history`.

Flow (Section 7 of the brief):
  1. Read pipeline_state.last_synced_time (UTC).
  2. Enrich the new raw export through enrich_watch_history.py (same step the
     original data went through) so new rows carry categoryId/duration/etc.
  3. Keep only entries with time > last_synced_time.
  4. Map them with the SAME parsing logic as the initial loader (shared module).
  5. Batch-upsert (ON CONFLICT (activity_hash) DO NOTHING), advance
     last_synced_time to the new max, and log how many rows were added.

Boundary/duplicate entries are handled by the activity_hash unique constraint,
not hand-rolled de-dup.

Usage (from repo root):
    python -m pipelines.incremental_update path/to/new/MyActivity.json
"""
import argparse
import json
import logging
import os
import tempfile

import enrich_watch_history
from pipelines.common.db import (
    batch_upsert_history,
    get_conn,
    get_pipeline_state,
    set_pipeline_state,
)
from pipelines.common.parse import parse_utc, record_to_row

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def run(raw_path: str) -> None:
    conn = get_conn()
    last_synced = get_pipeline_state(conn, "last_synced_time")
    last_synced_dt = parse_utc(last_synced) if last_synced else None
    logger.info("last_synced_time = %s", last_synced or "(none — will load all)")

    # Step 2: enrich the new raw export to a temp file via the shared CLI/module.
    fd, enriched_path = tempfile.mkstemp(prefix="enriched_", suffix=".json")
    os.close(fd)
    try:
        logger.info("Enriching %s -> %s ...", raw_path, enriched_path)
        enrich_watch_history.main(raw_path, enriched_path)

        with open(enriched_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    finally:
        if os.path.exists(enriched_path):
            os.remove(enriched_path)

    # Step 3: filter to genuinely new entries.
    if last_synced_dt is None:
        new_entries = [e for e in data if e.get("time")]
    else:
        new_entries = [
            e for e in data if e.get("time") and parse_utc(e["time"]) > last_synced_dt
        ]
    logger.info("%d of %d entries are newer than last_synced_time.", len(new_entries), len(data))

    # Steps 4-5: upsert via the shared parser + advance the bookmark.
    rows = (record_to_row(e) for e in new_entries)
    inserted, skipped = batch_upsert_history(conn, rows, batch=1000)
    logger.info("Upsert complete: %d inserted, %d skipped (already present).", inserted, skipped)

    with conn.cursor() as cur:
        cur.execute('SELECT max("time") FROM history')
        max_time = cur.fetchone()[0]
    if max_time is not None:
        set_pipeline_state(conn, "last_synced_time", max_time.isoformat())
        logger.info("pipeline_state.last_synced_time advanced to %s", max_time.isoformat())
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Incrementally load a new MyActivity.json export into history.")
    parser.add_argument("raw_path", help="Path to the newly-downloaded raw MyActivity.json")
    args = parser.parse_args()
    run(args.raw_path)
