"""Database helpers shared across pipelines.

Reads DATABASE_URL from the environment only (Ground Rule 4 — no hardcoded
credentials). All SQL here is parameterized (Ground Rule 6).
"""
import logging
import os
from urllib.parse import urlsplit

import psycopg2
from psycopg2.extras import execute_values

from pipelines.common.parse import COLUMNS
from pipelines.common.person import ACTIVE_PERSON_VAR

logger = logging.getLogger(__name__)


def _describe(dsn: str) -> str:
    """host/dbname of a DSN, for logging. Never includes the password."""
    parts = urlsplit(dsn)
    return f"{parts.hostname or '?'}{parts.path or ''}"


def get_conn():
    """Open a psycopg2 connection to the active person's Neon database.

    Refuses to run until `pipelines.common.person.load_person_env` has chosen a
    person, so a pipeline can never fall back to whatever DATABASE_URL happens
    to be lying around in `.env` and write one person's data into another's DB.
    """
    person = os.getenv(ACTIVE_PERSON_VAR)
    if not person:
        raise RuntimeError(
            "No active person. Call pipelines.common.person.load_person_env() "
            "before get_conn() — every pipeline entry point does this via --person."
        )
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError(f"DATABASE_URL is not set (check people/{person}.env).")

    # Logged on every connection so the target is visible in the log *before*
    # anything is written — the cheapest guard against loading into the wrong DB.
    logger.info("Connecting as person=%s → %s", person, _describe(dsn))
    return psycopg2.connect(dsn)


_INSERT_HISTORY = (
    f"INSERT INTO history ({', '.join(COLUMNS)}) VALUES %s "
    "ON CONFLICT (activity_hash) DO NOTHING RETURNING 1"
)


def batch_upsert_history(conn, rows, batch: int = 1000) -> tuple[int, int]:
    """Idempotently insert history rows in batches.

    Returns (inserted, skipped). Skipped = rows whose activity_hash already
    existed (Ground Rule 7). Uses RETURNING to count actual inserts accurately.
    """
    total = 0
    inserted = 0
    with conn.cursor() as cur:
        chunk = []
        for row in rows:
            chunk.append(row)
            total += 1
            if len(chunk) >= batch:
                inserted += len(execute_values(cur, _INSERT_HISTORY, chunk, fetch=True))
                chunk = []
        if chunk:
            inserted += len(execute_values(cur, _INSERT_HISTORY, chunk, fetch=True))
    conn.commit()
    return inserted, total - inserted


def get_pipeline_state(conn, key: str) -> str | None:
    with conn.cursor() as cur:
        cur.execute("SELECT value FROM pipeline_state WHERE key = %s", (key,))
        row = cur.fetchone()
        return row[0] if row else None


def set_pipeline_state(conn, key: str, value: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO pipeline_state (key, value) VALUES (%s, %s) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (key, value),
        )
    conn.commit()
