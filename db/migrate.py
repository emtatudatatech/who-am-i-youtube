"""Apply SQL migrations in db/migrations/ against DATABASE_URL, in filename order.

Migrations are written to be idempotent (CREATE ... IF NOT EXISTS), and applied
ones are recorded in a schema_migrations table so re-runs are no-ops.

Usage (from repo root):
    python -m db.migrate
"""
import logging
import pathlib

from pipelines.common.db import get_conn

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

MIGRATIONS_DIR = pathlib.Path(__file__).parent / "migrations"


def main() -> None:
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "  filename text PRIMARY KEY,"
            "  applied_at timestamptz NOT NULL DEFAULT now())"
        )
    conn.commit()

    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        logger.warning("No migration files found in %s", MIGRATIONS_DIR)

    for path in files:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM schema_migrations WHERE filename = %s", (path.name,))
            if cur.fetchone():
                logger.info("skip  %s (already applied)", path.name)
                continue
            logger.info("apply %s", path.name)
            cur.execute(path.read_text())
            cur.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
            )
        conn.commit()

    conn.close()
    logger.info("Migrations complete.")


if __name__ == "__main__":
    main()
