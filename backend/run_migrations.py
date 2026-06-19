"""Idempotent SQL migration runner.

Each *.sql file under `backend/migrations/` is applied at most once. Applied
filenames are tracked in the `_migrations_applied` table (bootstrapped below).
Each file runs in a single transaction so SET LOCAL changes survive pgbouncer's
per-transaction server-session reassignment.

Squash migrations (000_*) are skipped on existing databases — they are designed
for fresh deployments only. If any incremental migration (001+) is already
recorded, the squash is auto-marked applied without running.

On lock contention or timeout, the failing migration is logged as a warning and
startup continues. The migration retries on the next deployment.
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

_LOCK_TIMEOUT = "25s"
_STMT_TIMEOUT = "30s"


def _split_statements(sql: str) -> list[str]:
    cleaned_lines = [
        line for line in sql.splitlines() if not line.strip().startswith("--")
    ]
    cleaned = "\n".join(cleaned_lines)
    return [q.strip() for q in cleaned.split(";") if q.strip()]


def _applied_set(conn) -> set[str]:
    rows = conn.execute(text("SELECT filename FROM _migrations_applied")).fetchall()
    return {r[0] for r in rows}


def _kill_zombies() -> None:
    """Terminate idle-in-transaction connections older than 30 s.

    These stale connections hold locks that block DDL (ALTER TABLE, CREATE INDEX).
    Runs before migrations; permission errors on managed Postgres are silently ignored.
    """
    try:
        with engine.begin() as conn:
            result = conn.execute(text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity"
                " WHERE datname = current_database()"
                " AND pid <> pg_backend_pid()"
                " AND state = 'idle in transaction'"
                " AND state_change < NOW() - INTERVAL '30 seconds'"
            ))
            killed = sum(1 for (ok,) in result if ok)
            if killed:
                logger.info("Terminated %d idle-in-transaction zombie connection(s).", killed)
    except Exception as exc:
        logger.warning("Could not terminate zombie connections (%s).", exc)


def _record_applied(name: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO _migrations_applied (filename) VALUES (:f)"
                " ON CONFLICT (filename) DO NOTHING"
            ),
            {"f": name},
        )


def run_migrations() -> None:
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        logger.warning("Migrations directory not found: %s", migrations_dir)
        return

    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    if not sql_files:
        return

    _kill_zombies()

    with engine.begin() as conn:
        conn.execute(text(_TRACKING_TABLE_DDL))

    with engine.connect() as conn:
        applied = _applied_set(conn)

    # Squash migrations (000_*) are for fresh databases only. If any incremental
    # migration is already recorded the schema already exists — auto-mark the
    # squash without running it to avoid DDL lock fights on live tables.
    has_incremental = any(not f.startswith("000_") for f in applied)

    skipped = 0
    applied_now = 0

    for sql_file in sql_files:
        name = os.path.basename(sql_file)
        if name in applied:
            skipped += 1
            continue

        if name.startswith("000_") and has_incremental:
            _record_applied(name)
            applied_now += 1
            logger.info("Squash migration %s auto-applied (incremental schema already present)", name)
            continue

        with open(sql_file, encoding="utf-8") as f:
            content = f.read()
        statements = _split_statements(content)

        try:
            with engine.begin() as conn:
                conn.execute(text(f"SET LOCAL statement_timeout = '{_STMT_TIMEOUT}'"))
                conn.execute(text(f"SET LOCAL lock_timeout = '{_LOCK_TIMEOUT}'"))
                for query in statements:
                    conn.execute(text(query))
            _record_applied(name)
            applied_now += 1

        except Exception as exc:
            err = str(exc).lower()
            if "already exists" in err or "duplicate key" in err:
                try:
                    _record_applied(name)
                    applied_now += 1
                except Exception:
                    logger.exception("Failed to record migration %s after schema-exists", name)
            else:
                logger.warning(
                    "Migration %s failed (%s): %s — will retry on next startup.",
                    name, type(exc).__name__, exc,
                )

    logger.info(
        "Migrations done: %d applied, %d already-applied skipped.",
        applied_now,
        skipped,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
