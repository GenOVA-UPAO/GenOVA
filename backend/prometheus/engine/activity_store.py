"""Persistencia de los datos estructurados de cada recurso generado por plantilla.

Guarda en `ova_resource_activities` la clave de la plantilla, el JSON de texto
validado y los params, ligados al sha256 del HTML generado (`core.text.content_hash`).
La exportación (H5P, iDevices de eXeLearning) los usa sólo si el HTML actual de la
fase sigue teniendo esa huella. Best-effort: un fallo aquí nunca aborta la generación.
"""

from __future__ import annotations

import contextlib

import structlog
from sqlalchemy import select

from core.database import SessionLocal
from core.text import content_hash
from models import ResourceActivityRow

logger = structlog.get_logger(__name__)


def record_activity(html: str | None, activity: dict | None) -> None:
    """`activity` = {"template", "phase", "resource_type", "data", "params"} (ver
    `prometheus.plans.generate`). Idempotente por huella del HTML."""
    if not html or not activity or not isinstance(activity.get("data"), dict | list):
        return
    sha = content_hash(html)
    db = SessionLocal()
    try:
        exists = db.execute(
            select(ResourceActivityRow.id).where(ResourceActivityRow.content_sha256 == sha)
        ).first()
        if exists is None:
            db.add(
                ResourceActivityRow(
                    content_sha256=sha,
                    template_key=str(activity.get("template") or "")[:40],
                    phase_type=str(activity.get("phase") or "")[:30],
                    resource_type=str(activity.get("resource_type") or "")[:40] or None,
                    data=activity["data"],
                    params=activity.get("params") or {},
                )
            )
            db.commit()
    except Exception:  # noqa: BLE001 — best-effort (incluye la carrera por la misma huella)
        logger.exception("record_activity failed", template=activity.get("template"))
        with contextlib.suppress(Exception):
            db.rollback()
    finally:
        db.close()
