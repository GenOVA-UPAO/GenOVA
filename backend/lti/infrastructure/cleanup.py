"""Purga de artefactos LTI caducados (al arrancar y luego cada pocas horas).

- `lti_oidc_states`: state/nonce de un solo uso; inútiles tras `expires_at`.
- `lti_launches`: sesiones del reproductor y del selector. Se conservan unos días
  tras caducar (depurar una nota que no llegó al LMS) y luego se borran.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import delete
from sqlalchemy.orm import Session

from lti.infrastructure.orm import LtiLaunch, LtiOidcState

logger = structlog.get_logger(__name__)

LAUNCH_RETENTION = timedelta(days=7)


def purge_expired_lti(db: Session, now: datetime | None = None) -> dict[str, int]:
    """Borra states caducados y launches caducados hace más de `LAUNCH_RETENTION`.
    Devuelve las filas borradas por tabla. Best-effort: una tabla que aún no existe
    (migración pendiente) se salta sin romper el arranque."""
    now = now or datetime.now(UTC)
    removed: dict[str, int] = {}
    for name, statement in (
        ("lti_oidc_states", delete(LtiOidcState).where(LtiOidcState.expires_at < now)),
        ("lti_launches", delete(LtiLaunch).where(LtiLaunch.expires_at < now - LAUNCH_RETENTION)),
    ):
        try:
            removed[name] = db.execute(statement).rowcount or 0
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Purga LTI falló (continuando)", table=name)
            removed[name] = 0
    return removed
