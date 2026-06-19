"""Idempotent SQL migration runner.

Each *.sql file under `backend/migrations/` is applied at most once. Applied
filenames are tracked in the `_migrations_applied` table (bootstrapped by
`016_migrations_applied.sql`). Files prior to 016 are also skipped after their
first successful run via the same table — we backfill them on first boot if
they execute cleanly.
"""
import contextlib
import glob
import logging
import os

from sqlalchemy import text

from database import engine

logger = logging.getLogger(__name__)

_BOOTSTRAP_FILE = "016_migrations_applied.sql"
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
        # Always ensure tracking table exists before reading it.
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

        file_ok = True
        # Fresh connection per file so an OperationalError in one migration
        # (e.g. lock timeout, dropped connection) cannot poison later ones.
        with engine.connect() as conn:
            # DDL statements (e.g. ALTER TABLE) must wait for an ACCESS
            # EXCLUSIVE lock. If the server's statement_timeout is short and
            # concurrent queries hold the table, the lock wait is canceled.
            # Disable it for the duration of this migration connection.
            with contextlib.suppress(Exception):
                conn.execute(text("SET statement_timeout = '0'"))
                conn.commit()
            for query in statements:
                try:
                    conn.execute(text(query))
                    conn.commit()
                except Exception as exc:
                    with contextlib.suppress(Exception):
                        conn.rollback()
                    err = str(exc).lower()
                    if "already exists" in err or "duplicate key" in err:
                        # First-time tracking pass on a legacy DB: schema already there.
                        continue
                    logger.warning(
                        "Migration %s statement skipped (%s): %s",
                        name, type(exc).__name__, exc,
                    )
                    file_ok = False

            if file_ok:
                try:
                    conn.execute(
                        text(
                            "INSERT INTO _migrations_applied (filename) VALUES (:f) "
                            "ON CONFLICT (filename) DO NOTHING"
                        ),
                        {"f": name},
                    )
                    conn.commit()
                    applied_now += 1
                except Exception:
                    logger.exception("Failed to record migration %s", name)

    logger.info(
        "Migrations done: %d applied, %d already-applied skipped.",
        applied_now, skipped,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
