"""Cleanup of expired auth artifacts (run at startup, like RAG purge).

Keeps the JWT blocklist and the single-use token tables from growing without
bound. A row in any of these is useless once `expires_at` is in the past:
- jwt_blocklist: the token it revokes has itself expired, so re-issuing the jti
  would never validate anyway.
- password_reset_tokens / email_verification_tokens: already past their TTL.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_TABLES = (
    "jwt_blocklist",
    "password_reset_tokens",
    "email_verification_tokens",
)


def purge_expired_auth(db: Session) -> int:
    """Delete rows past their expiry across all expiring auth tables. Returns the
    total number of rows removed. Best-effort: skips tables that don't exist yet
    (e.g. before their migration ran)."""
    total = 0
    for table in _TABLES:
        try:
            result = db.execute(text(f"DELETE FROM {table} WHERE expires_at < now()"))  # noqa: S608
            db.commit()
            total += result.rowcount or 0
        except Exception:
            db.rollback()
            logger.exception("Auth cleanup failed for table %s (continuing).", table)
    return total
