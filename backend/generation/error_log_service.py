"""EN-012 — reusable generation error logging.

`log_generation_error()` mints an opaque Error ID, sanitizes the technical
message (R4: never persist API keys / tokens / credentials), and writes one row
to `ova_error_logs` via `commit_or_500()` (R7). The whole write is wrapped so a
logging failure never interrupts generation — the caller still gets an
`error_id` back to surface to the user (EN-013/HU-022). The internal message is
never returned to the client (R6).
"""
import contextlib
import logging
import re
import uuid

from sqlalchemy.orm import Session

from generation.error_log_model import DEFAULT_CATEGORY, ERROR_CATEGORIES, OvaErrorLog
from users.admin_helpers import commit_or_500

logger = logging.getLogger(__name__)

_REDACTED = "[REDACTED]"
_MAX_MESSAGE_LEN = 2000

# Patterns that strip secrets before persisting (R4). Order matters: key=value
# style assignments first, then standalone high-entropy tokens.
_SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    # api_key=..., "token": "...", authorization: Bearer ..., password=...
    re.compile(
        r"(?i)\b(api[_-]?key|secret|token|password|passwd|pwd|authorization|"
        r"bearer|access[_-]?token|refresh[_-]?token|service[_-]?role[_-]?key)\b"
        r"\s*[:=]\s*[\"']?[^\s\"',;}]+",
    ),
    # Bearer <token> without a key=value shape.
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]+"),
    # Provider key prefixes (OpenAI/Groq sk-..., Google AIza..., GitHub ghp_...).
    re.compile(r"\b(?:sk|rk|pk)-[A-Za-z0-9_\-]{16,}"),
    re.compile(r"\bAIza[A-Za-z0-9_\-]{20,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"),
    # JWTs (three base64url segments).
    re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"),
)


def _sanitize(message: str | None) -> str:
    """Strip secrets and clamp length before the message ever hits the DB (R4)."""
    if not message:
        return ""
    cleaned = str(message)
    for pattern in _SECRET_PATTERNS:
        cleaned = pattern.sub(_REDACTED, cleaned)
    return cleaned[:_MAX_MESSAGE_LEN]


def _normalize_category(category: str | None) -> str:
    return category if category in ERROR_CATEGORIES else DEFAULT_CATEGORY


def log_generation_error(
    db: Session,
    *,
    message: str | None,
    error_category: str | None = DEFAULT_CATEGORY,
    user_id: uuid.UUID | None = None,
    ova_id: uuid.UUID | None = None,
    job_id: uuid.UUID | None = None,
    job_resource_id: uuid.UUID | None = None,
) -> str:
    """Persist a sanitized generation error and return its opaque `error_id`.

    The returned `error_id` is what EN-013 stores on the resource and HU-022
    shows to the user; it always matches the persisted row (R2, R5). Never
    raises: if the write fails the generation continues (R7) and the caller
    still receives a usable Error ID.
    """
    error_id = uuid.uuid4()
    try:
        db.add(
            OvaErrorLog(
                error_id=error_id,
                ova_id=ova_id,
                job_id=job_id,
                job_resource_id=job_resource_id,
                user_id=user_id,
                error_category=_normalize_category(error_category),
                message=_sanitize(message),
            )
        )
        commit_or_500(db, op="log_generation_error")
    except Exception:
        # R7: logging is best-effort — never let it break generation. The
        # rollback inside commit_or_500 already cleared the session on DB
        # errors; cover the rare add()-time failure too.
        with contextlib.suppress(Exception):
            db.rollback()
        logger.exception("Failed to persist generation error log (error_id=%s)", error_id)
    return str(error_id)
