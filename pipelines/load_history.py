"""Initial loader: read datasets/MyActivity_enriched.json into the `history` table.

Idempotent (ON CONFLICT (activity_hash) DO NOTHING) and batched. Re-running never
duplicates rows. Parsing logic lives in pipelines.common.parse so the incremental
update script reuses it verbatim.

Usage (from repo root):
    python -m pipelines.load_history [path/to/enriched.json]
"""
import json
import logging
import sys

from pipelines.common.db import batch_upsert_history, get_conn, set_pipeline_state
from pipelines.common.parse import record_to_row

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_INPUT = "datasets/MyActivity_enriched.json"


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
        max_time = cur.fetchone()[0]
    if max_time is not None:
        iso = max_time.isoformat()
        set_pipeline_state(conn, "last_synced_time", iso)
        logger.info("pipeline_state.last_synced_time set to %s", iso)

    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM history")
        logger.info("history now has %d rows.", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    load(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT)
