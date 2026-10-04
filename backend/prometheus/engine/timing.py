"""Estado «generando» por recurso + duraciones históricas (tiempo restante).

Los workers llaman a `mark_running` al empezar un recurso (la UI lo muestra como
«generando» sin esperar al resto) y a `record_duration` al terminar con éxito.
Todo es best-effort: un fallo aquí nunca aborta la generación.
"""

import contextlib
import statistics
import uuid

import structlog
from sqlalchemy import select, update

from core.database import SessionLocal
from models import OvaJobResource, ResourceTiming

logger = structlog.get_logger(__name__)

_STARTABLE = ("pending", "error", "degraded", "running")
HISTORY_WINDOW = 30  # últimas N duraciones por (fase, tipo)


def mark_running(job_id, phase: str, rt) -> None:
    """Marca como `running` la primera fila del tipo que aún no está lista."""
    if not job_id:
        return
    db = SessionLocal()
    try:
        row = db.execute(
            select(OvaJobResource.id, OvaJobResource.resource_type)
            .where(
                OvaJobResource.job_id == uuid.UUID(str(job_id)),
                OvaJobResource.phase_type == phase,
                OvaJobResource.status.in_(_STARTABLE),
            )
            .order_by(
                # primero las que aún no arrancaron, para que dos del mismo tipo no pisen la misma fila
                (OvaJobResource.status == "running"),
                OvaJobResource.resource_order,
            )
        ).all()
        target = next((r for r in row if r[1] is not None and str(r[1]) == str(rt)), None)
        if target is None:
            return
        db.execute(
            update(OvaJobResource).where(OvaJobResource.id == target[0]).values(status="running")
        )
        db.commit()
    except Exception:  # noqa: BLE001 — best-effort
        logger.exception("mark_running failed", phase=phase, resource_type=rt)
        with contextlib.suppress(Exception):
            db.rollback()
    finally:
        db.close()


def record_duration(phase: str, rt, seconds: float) -> None:
    if seconds <= 0:
        return
    db = SessionLocal()
    try:
        db.add(ResourceTiming(phase_type=phase, resource_type=str(rt), seconds=float(seconds)))
        db.commit()
    except Exception:  # noqa: BLE001 — best-effort
        logger.exception("record_duration failed", phase=phase, resource_type=rt)
        with contextlib.suppress(Exception):
            db.rollback()
    finally:
        db.close()


def duration_medians(db, keys: list[tuple[str, str]]) -> dict[str, float]:
    """Mediana de las últimas duraciones por clave `fase:tipo` (solo las que tienen historial)."""
    out: dict[str, float] = {}
    for phase, rt in set(keys):
        rows = (
            db.execute(
                select(ResourceTiming.seconds)
                .where(ResourceTiming.phase_type == phase, ResourceTiming.resource_type == rt)
                .order_by(ResourceTiming.created_at.desc())
                .limit(HISTORY_WINDOW)
            )
            .scalars()
            .all()
        )
        if rows:
            out[f"{phase}:{rt}"] = float(statistics.median(rows))
    return out
