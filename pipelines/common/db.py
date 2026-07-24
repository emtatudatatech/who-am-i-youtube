"""Database helpers shared across pipelines.

Reads DATABASE_URL from the environment only (Ground Rule 4 — no hardcoded
credentials). All SQL here is parameterized (Ground Rule 6).
"""
import os

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

from pipelines.common.parse import COLUMNS


def get_conn():
    """Open a psycopg2 connection to the Neon Postgres instance."""
    load_dotenv()
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL is not set (check your .env).")
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
