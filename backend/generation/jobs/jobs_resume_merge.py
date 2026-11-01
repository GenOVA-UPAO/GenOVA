"""Reintento de recursos fallidos sobre un OVA ya creado.

`materialize_partial_ova` solo actúa con el OVA atascado en «generando» y, en ese
caso, reescribe la versión activa desde los recursos del job. Tras un job `done`
con recursos fallidos el OVA ya está «listo» (y el docente puede haberlo editado):
el reintento no entraba nunca en el OVA. Aquí los recursos recuperados se añaden
en una versión NUEVA que copia la activa, así no se pierde ninguna edición.
"""

import uuid

import structlog
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from generation.jobs.jobs_materialize import _persist_scorm, resolve_resource_display
from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion

logger = structlog.get_logger(__name__)

_PHASE_ORDER = ["engage", "explore", "explain", "elaborate", "evaluate"]
_MERGEABLE = ("done", "degraded")


def _rank(phase_type: str) -> int:
    return _PHASE_ORDER.index(phase_type) if phase_type in _PHASE_ORDER else len(_PHASE_ORDER)


def _recovered(db: Session, job_id, resource_ids: list[uuid.UUID]) -> list[OvaJobResource]:
    return list(
        db.execute(
            select(OvaJobResource)
            .where(
                OvaJobResource.job_id == job_id,
                OvaJobResource.id.in_(resource_ids),
                OvaJobResource.status.in_(_MERGEABLE),
            )
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        )
        .scalars()
        .all()
    )


def _active_version(db: Session, ova_id) -> OvaVersion | None:
    return db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
    ).scalar_one_or_none()


def _phase_row(p: OvaPhase) -> dict:
    return {
        "phase_type": p.phase_type,
        "content": p.content,
        "regenerated": p.regenerated,
        "resource_type_id": p.resource_type_id,
        "title": p.title,
    }


def _merged_rows(
    current: list[OvaPhase], recovered: list[OvaJobResource], *, replace: bool
) -> tuple[list[dict], int]:
    """Copia la versión activa y le aplica los recursos recuperados.

    Un recurso cuyo (fase, tipo) ya está en el OVA no se añade otra vez: un
    `degraded` ya se materializó y un doble run del mismo job repite todos. Con
    ``replace`` se sustituye el contenido en su sitio (salvo que el docente ya
    regenerase esa fase); sin él (job cancelado) se omite. Cada fase casa con un
    solo recurso, así dos del mismo tipo encuentran cada uno la suya. Devuelve
    las filas y cuántos recursos cambiaron algo.
    """
    rows = [_phase_row(p) for p in sorted(current, key=lambda p: p.phase_order)]
    matched: set[int] = set()
    applied = 0
    for r in recovered:
        rid, title, _emoji = resolve_resource_display(r.phase_type, r.resource_type)
        hit = next(
            (
                i
                for i, row in enumerate(rows)
                if i not in matched
                and (row["phase_type"], row["resource_type_id"]) == (r.phase_type, rid)
            ),
            None,
        )
        if hit is None:
            rows.append(
                {
                    "phase_type": r.phase_type,
                    "content": r.content or "",
                    "regenerated": False,
                    "resource_type_id": rid,
                    "title": title,
                }
            )
            matched.add(len(rows) - 1)
            applied += 1
            continue
        matched.add(hit)
        if replace and not rows[hit]["regenerated"]:
            rows[hit]["content"] = r.content or ""
            applied += 1
    # sorted() es estable: dentro de cada fase, primero lo que ya había y luego lo recuperado.
    return sorted(rows, key=lambda row: _rank(row["phase_type"])), applied


def merge_resumed_resources(db: Session, job: OvaJob, resource_ids: list[uuid.UUID]) -> bool:
    """Añade al OVA (versión nueva) los recursos del reintento que salieron bien."""
    ova = db.get(Ova, job.ova_id) if job.ova_id is not None else None
    if ova is None or ova.status == "generando":
        return False
    recovered = _recovered(db, job.id, resource_ids)
    active = _active_version(db, ova.id)
    if not recovered or active is None:
        return False
    replace = getattr(job, "status", None) != "canceled"
    rows, applied = _merged_rows(list(active.phases), recovered, replace=replace)
    if not applied:
        return False
    db.execute(
        update(OvaVersion)
        .where(OvaVersion.ova_id == ova.id, OvaVersion.is_active.is_(True))
        .values(is_active=False)
    )
    latest = db.execute(
        select(OvaVersion.version_number)
        .where(OvaVersion.ova_id == ova.id)
        .order_by(OvaVersion.version_number.desc())
        .limit(1)
    ).scalar_one()
    version = OvaVersion(
        ova_id=ova.id,
        version_number=latest + 1,
        prompt="Reintento de recursos fallidos",
        is_active=True,
    )
    db.add(version)
    db.flush()
    phases_data: list[dict] = []
    for order, row in enumerate(rows, start=1):
        db.add(OvaPhase(version_id=version.id, phase_order=order, **row))
        phases_data.append(
            {
                "type": row["phase_type"],
                "order": order,
                "content": row["content"],
                "title": row["title"],
            }
        )
    _persist_scorm(ova, ova.title, phases_data, str(job.user_id))
    ova.current_version_id = version.id
    db.commit()
    logger.info(
        "recursos reintentados añadidos al OVA",
        ova_id=str(ova.id),
        job_id=str(job.id),
        version=version.version_number,
        added=applied,
    )
    return True
