"""TOTP login-ticket store and backup-code helpers.

Shared by ``auth.totp_router`` (enrollment/verify endpoints) and
``auth.router`` (issues a ticket after a password check when 2FA is on), so
the ticket store lives here as the single owner.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import structlog

from core.security import hash_password, verify_password

logger = structlog.get_logger(__name__)

# Tickets del paso TOTP del login: ticket → {user_id, expires_at, remember_me}.
# Con Postgres viven en `totp_login_tickets` (migración 042): el ticket se emite
# en el proceso que comprobó la contraseña y el código puede llegar a otro worker
# de uvicorn, que en memoria no lo conocía («ticket caducado» al azar). En
# memoria solo con SQLite (un proceso) o si la tabla aún no existe.
_TOTP_TICKETS: dict[str, dict] = {}
_TICKET_TTL_SECONDS = 300  # 5 min


def _ticket_hash(ticket: str) -> str:
    # Se guarda el hash: quien lea la tabla no puede completar un login ajeno.
    return hashlib.sha256(ticket.encode()).hexdigest()


def _shared_engine():
    from core.database import engine

    return engine if engine.dialect.name == "postgresql" else None


def _clean_expired_tickets() -> None:
    now = datetime.now(UTC)
    expired = [k for k, v in _TOTP_TICKETS.items() if v["expires_at"] < now]
    for k in expired:
        del _TOTP_TICKETS[k]


def _store_shared(ticket: str, user_id: str, remember_me: bool) -> bool:
    engine = _shared_engine()
    if engine is None:
        return False
    from sqlalchemy import text

    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM totp_login_tickets WHERE expires_at < now()"))
            conn.execute(
                text(
                    "INSERT INTO totp_login_tickets (ticket_hash, user_id, remember_me, expires_at)"
                    " VALUES (:h, CAST(:u AS uuid), :r, now() + make_interval(secs => :ttl))"
                ),
                {"h": _ticket_hash(ticket), "u": str(user_id), "r": remember_me, "ttl": _TICKET_TTL_SECONDS},
            )
        return True
    except Exception as exc:  # noqa: BLE001 — sin tabla (migración pendiente): en memoria
        logger.warning("totp ticket store unavailable; in-memory", error_type=type(exc).__name__)
        return False


def _issue_ticket(user_id: str, *, remember_me: bool = False) -> str:
    ticket = secrets.token_urlsafe(32)
    if _store_shared(ticket, user_id, remember_me):
        return ticket
    _clean_expired_tickets()
    _TOTP_TICKETS[ticket] = {
        "user_id": user_id,
        "remember_me": remember_me,
        "expires_at": datetime.now(UTC) + timedelta(seconds=_TICKET_TTL_SECONDS),
    }
    return ticket


def _consume_shared(ticket: str) -> tuple[str, bool] | None:
    engine = _shared_engine()
    if engine is None:
        return None
    from sqlalchemy import text

    try:
        # DELETE … RETURNING: un solo uso aunque dos procesos lo reciban a la vez.
        with engine.begin() as conn:
            row = conn.execute(
                text(
                    "DELETE FROM totp_login_tickets WHERE ticket_hash = :h"
                    " RETURNING user_id, remember_me, expires_at >= now() AS alive"
                ),
                {"h": _ticket_hash(ticket)},
            ).first()
    except Exception as exc:  # noqa: BLE001
        logger.warning("totp ticket store unavailable", error_type=type(exc).__name__)
        return None
    if row is None or not row.alive:
        return None
    return str(row.user_id), bool(row.remember_me)


def _consume_ticket(ticket: str) -> tuple[str, bool] | None:
    """Return (user_id, remember_me) or None if the ticket is missing/expired."""
    shared = _consume_shared(ticket)
    if shared is not None:
        return shared
    _clean_expired_tickets()
    entry = _TOTP_TICKETS.pop(ticket, None)
    if not entry:
        return None
    if entry["expires_at"] < datetime.now(UTC):
        return None
    return entry["user_id"], bool(entry.get("remember_me", False))


def _hash_backup(code: str) -> str:
    return hash_password(code)


def _verify_backup(code: str, hashed: str) -> bool:
    return verify_password(code, hashed)


def _generate_backup_codes() -> tuple[list[str], list[dict]]:
    """Returns (plaintext_codes, hashed_records) — plaintext shown once to user."""
    plaintext = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed = [{"hash": _hash_backup(c), "used": False} for c in plaintext]
    return plaintext, hashed
