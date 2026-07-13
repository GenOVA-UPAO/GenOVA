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
import re

import structlog
from sqlalchemy import text

from core.database import engine

logger = structlog.get_logger(__name__)

_TRACKING_TABLE_DDL = (
    "CREATE TABLE IF NOT EXISTS _migrations_applied ("
    " filename TEXT PRIMARY KEY,"
    " applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    ")"
)

_LOCK_TIMEOUT = "25s"
_STMT_TIMEOUT = "30s"


def _split_statements(sql: str) -> list[str]:
    """Split on top-level `;` only — a `;` inside a $$…$$ (o $tag$…$tag$) block
    pertenece al cuerpo del DO/función y no debe cortar la sentencia."""
    cleaned_lines = [line for line in sql.splitlines() if not line.strip().startswith("--")]
    cleaned = "\n".join(cleaned_lines)
    statements: list[str] = []
    buf: list[str] = []
    tag: str | None = None
    i = 0
    while i < len(cleaned):
        if tag is None:
            m = re.match(r"\$[A-Za-z_]*\$", cleaned[i:])
            if m:
                tag = m.group(0)
                buf.append(tag)
                i += len(tag)
                continue
            if cleaned[i] == ";":
                stmt = "".join(buf).strip()
                if stmt:
                    statements.append(stmt)
                buf = []
                i += 1
                continue
        elif cleaned.startswith(tag, i):
            buf.append(tag)
            i += len(tag)
            tag = None
            continue
        buf.append(cleaned[i])
        i += 1
    stmt = "".join(buf).strip()
    if stmt:
        statements.append(stmt)
    return statements


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
            result = conn.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity"
                    " WHERE datname = current_database()"
                    " AND pid <> pg_backend_pid()"
                    " AND state = 'idle in transaction'"
                    " AND state_change < NOW() - INTERVAL '30 seconds'"
                )
            )
            killed = sum(1 for (ok,) in result if ok)
            if killed:
                logger.info("Conexiones zombie terminadas", count=killed)
    except Exception as exc:
        logger.warning("No se pudieron terminar conexiones zombie", error=str(exc))


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
        logger.warning("Directorio de migraciones no encontrado", path=migrations_dir)
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
            logger.info(
                "Squash migration auto-aplicada (esquema incremental ya presente)",
                filename=name,
            )
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
                    "Migration falló — reintentará en el próximo startup",
                    filename=name,
                    exc_type=type(exc).__name__,
                    error=str(exc),
                )

    logger.info(
        "Migraciones completadas",
        applied=applied_now,
        skipped=skipped,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
