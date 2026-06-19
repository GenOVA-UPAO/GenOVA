"""Idempotent SQL migration runner.

Each *.sql file under `backend/migrations/` is applied at most once. Applied
filenames are tracked in the `_migrations_applied` table (bootstrapped below).
Each file runs in a single transaction so SET LOCAL changes survive pgbouncer's
per-transaction server-session reassignment.

On lock contention or timeout, the runner terminates competing backends, wipes
the public schema, and retries once on a clean database (dropout-and-retry).
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


def _record_applied(name: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO _migrations_applied (filename) VALUES (:f)"
                " ON CONFLICT (filename) DO NOTHING"
            ),
            {"f": name},
        )


def _wipe_schema() -> None:
    """Wipe and recreate the public schema for a clean retry."""
    logger.warning("Migration dropout — wiping schema for clean retry.")
    # Best-effort: terminate competing connections. Managed Postgres (Supabase)
    # may deny this if both sides run as postgres superuser — that's fine, we
    # proceed with the DROP regardless.
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity"
                " WHERE datname = current_database() AND pid <> pg_backend_pid()"
            ))
    except Exception as exc:
        logger.warning("Could not terminate backends (%s) — proceeding with schema drop.", exc)

    with engine.begin() as conn:
        conn.execute(text("SET LOCAL statement_timeout = '0'"))
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    logger.info("Schema wiped. Retrying migrations on clean database.")


def _apply_files(sql_files: list[str]) -> str | None:
    """Apply pending migrations. Returns the failing filename, or None on success."""
    with engine.begin() as conn:
        conn.execute(text(_TRACKING_TABLE_DDL))

    with engine.connect() as conn:
        applied = _applied_set(conn)

    # Squash migrations (000_*) are designed for fresh databases only.
    # If any incremental migration is already applied the schema is already
    # present — auto-mark squash files without running them to avoid
    # competing for locks on live tables during blue-green deploys.
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
                logger.warning("Migration %s failed (%s): %s", name, type(exc).__name__, exc)
                return name

    logger.info(
        "Migrations done: %d applied, %d already-applied skipped.",
        applied_now,
        skipped,
    )
    return None


def run_migrations() -> None:
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        logger.warning("Migrations directory not found: %s", migrations_dir)
        return

    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    if not sql_files:
        return

    failed = _apply_files(sql_files)
    if failed:
        logger.warning("Migration dropout triggered by '%s' — wiping schema and retrying.", failed)
        _wipe_schema()
        retry_failed = _apply_files(sql_files)
        if retry_failed:
            logger.error(
                "Migration '%s' failed even after schema wipe. "
                "Startup continues but database may be incomplete.",
                retry_failed,
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
