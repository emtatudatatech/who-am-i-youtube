"""Initial loader: read datasets/<person>/MyActivity_enriched.json into `history`.

Idempotent (ON CONFLICT (activity_hash) DO NOTHING) and batched. Re-running never
duplicates rows. Parsing logic lives in pipelines.common.parse so the incremental
update script reuses it verbatim.

Usage (from repo root):
    python -m pipelines.load_history --person emtatu
"""
import argparse
import json
import logging

from pipelines.common.db import batch_upsert_history, get_conn, set_pipeline_state
from pipelines.common.logging_config import setup_logging
from pipelines.common.parse import record_to_row
from pipelines.common.person import (
    add_person_arg,
    enriched_path,
    load_person_env,
    resolve_person,
)

setup_logging()
logger = logging.getLogger(__name__)


def load(path: str) -> None:
    logger.info("Loading %s ...", path)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    logger.info("Read %d entries. Mapping and upserting...", len(data))

    rows = (record_to_row(entry) for entry in data)

    conn = get_conn()
    inserted, skipped = batch_upsert_history(conn, rows, batch=1000)
    logger.info("Upsert complete: %d inserted, %d skipped (already present).", inserted, skipped)

    # Bookmark the newest UTC instant seen, for the incremental updater.
    with conn.cursor() as cur:
        cur.execute("SELECT max(\"time\") FROM history")
        row = cur.fetchone()
        max_time = row[0] if row else None
    if max_time is not None:
        iso = max_time.isoformat()
        set_pipeline_state(conn, "last_synced_time", iso)
        logger.info("pipeline_state.last_synced_time set to %s", iso)

    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM history")
        row = cur.fetchone()
        logger.info("history now has %d rows.", row[0] if row else 0)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load an enriched MyActivity export into `history`.")
    add_person_arg(parser)
    parser.add_argument("--enriched", default=None, help="Override the enriched-JSON path")
    args = parser.parse_args()

    person = load_person_env(resolve_person(args.person))
    load(args.enriched or str(enriched_path(person)))
