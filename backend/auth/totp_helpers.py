"""TOTP login-ticket store and backup-code helpers.

Shared by ``auth.totp_router`` (enrollment/verify endpoints) and
``auth.router`` (issues a ticket after a password check when 2FA is on), so
the in-memory ticket store lives here as the single owner.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from core.security import hash_password, verify_password

# Temporary tickets for the TOTP login step (in-memory; acceptable for
# single-instance). Maps ticket → {user_id, expires_at}.
_TOTP_TICKETS: dict[str, dict] = {}
_TICKET_TTL_SECONDS = 300  # 5 min


def _clean_expired_tickets() -> None:
    now = datetime.now(UTC)
    expired = [k for k, v in _TOTP_TICKETS.items() if v["expires_at"] < now]
    for k in expired:
        del _TOTP_TICKETS[k]


def _issue_ticket(user_id: str) -> str:
    _clean_expired_tickets()
    ticket = secrets.token_urlsafe(32)
    _TOTP_TICKETS[ticket] = {
        "user_id": user_id,
        "expires_at": datetime.now(UTC) + timedelta(seconds=_TICKET_TTL_SECONDS),
    }
    return ticket


def _consume_ticket(ticket: str) -> str | None:
    _clean_expired_tickets()
    entry = _TOTP_TICKETS.pop(ticket, None)
    if not entry:
        return None
    if entry["expires_at"] < datetime.now(UTC):
        return None
    return entry["user_id"]


def _hash_backup(code: str) -> str:
    return hash_password(code)


def _verify_backup(code: str, hashed: str) -> bool:
    return verify_password(code, hashed)


def _generate_backup_codes() -> tuple[list[str], list[dict]]:
    """Returns (plaintext_codes, hashed_records) — plaintext shown once to user."""
    plaintext = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed = [{"hash": _hash_backup(c), "used": False} for c in plaintext]
    return plaintext, hashed
