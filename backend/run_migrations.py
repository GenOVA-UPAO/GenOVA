"""Idempotent SQL migration runner.

Each *.sql file under `backend/migrations/` is applied at most once. Applied
filenames are tracked in the `_migrations_applied` table (bootstrapped below).
Each file runs in a single transaction so SET LOCAL changes (e.g. disabling
statement_timeout) survive pgbouncer's per-transaction session reassignment.
"""
import glob
import logging
import os

from sqlalchemy import text

from database import engine

logger = logging.getLogger(__name__)

_TRACKING_TABLE_DDL = (
    "CREATE TABLE IF NOT EXISTS _migrations_applied ("
    " filename TEXT PRIMARY KEY,"
    " applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    ")"
)


def _split_statements(sql: str) -> list[str]:
    cleaned_lines = [
        line for line in sql.splitlines() if not line.strip().startswith("--")
    ]
    cleaned = "\n".join(cleaned_lines)
    return [q.strip() for q in cleaned.split(";") if q.strip()]


def _applied_set(conn) -> set[str]:
    rows = conn.execute(text("SELECT filename FROM _migrations_applied")).fetchall()
    return {r[0] for r in rows}


def run_migrations() -> None:
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        logger.warning("Migrations directory not found: %s", migrations_dir)
        return

    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    if not sql_files:
        return

    with engine.begin() as conn:
        conn.execute(text(_TRACKING_TABLE_DDL))

    with engine.connect() as conn:
        applied = _applied_set(conn)

    skipped = 0
    applied_now = 0

    for sql_file in sql_files:
        name = os.path.basename(sql_file)
        if name in applied:
            skipped += 1
            continue

        with open(sql_file, encoding="utf-8") as f:
            content = f.read()
        statements = _split_statements(content)

        try:
            # One transaction per file: SET LOCAL persists for the whole file
            # even through pgbouncer's per-transaction server-session handoff.
            # SQLAlchemy auto-commits on __exit__ and auto-rollbacks on error.
            with engine.begin() as conn:
                # Disable statement_timeout so DDL waiting for ACCESS EXCLUSIVE
                # lock (ALTER TABLE, CREATE INDEX) is never canceled by the
                # server's short default timeout.
                conn.execute(text("SET LOCAL statement_timeout = '0'"))
                for query in statements:
                    conn.execute(text(query))

            with engine.begin() as conn:
                conn.execute(
                    text(
                        "INSERT INTO _migrations_applied (filename) VALUES (:f)"
                        " ON CONFLICT (filename) DO NOTHING"
                    ),
                    {"f": name},
                )
            applied_now += 1

        except Exception as exc:
            err = str(exc).lower()
            if "already exists" in err or "duplicate key" in err:
                # Schema already present (manual apply or concurrent boot).
                # Record as applied so we don't retry on every restart.
                try:
                    with engine.begin() as conn:
                        conn.execute(
                            text(
                                "INSERT INTO _migrations_applied (filename) VALUES (:f)"
                                " ON CONFLICT (filename) DO NOTHING"
                            ),
                            {"f": name},
                        )
                    applied_now += 1
                except Exception:
                    logger.exception("Failed to record migration %s after schema-exists", name)
            else:
                logger.warning(
                    "Migration %s failed (%s): %s",
                    name, type(exc).__name__, exc,
                )

    logger.info(
        "Migrations done: %d applied, %d already-applied skipped.",
        applied_now, skipped,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
