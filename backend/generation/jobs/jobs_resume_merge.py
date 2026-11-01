"""Reintento de recursos fallidos sobre un OVA ya creado.

`materialize_partial_ova` solo actúa con el OVA atascado en «generando» y, en ese
caso, reescribe la versión activa desde los recursos del job. Tras un job `done`
con recursos fallidos el OVA ya está «listo» (y el docente puede haberlo editado):
el reintento no entraba nunca en el OVA. Aquí los recursos recuperados se añaden
en una versión NUEVA que copia la activa, así no se pierde ninguna edición.
"""

import uuid
from collections import Counter

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
        # Mismo recurso en la versión nueva: conserva su historial de micro-versiones.
        "lineage_id": p.lineage_id or p.id,
    }


def _key(phase_type: str, resource_type) -> tuple[str, int | None]:
    return phase_type, resolve_resource_display(phase_type, resource_type)[0]


def _missing_slots(db: Session, job_id, current: list[OvaPhase]) -> Counter:
    """Por (fase, tipo): cuántos recursos del job aún no tienen fase en el OVA.

    Distingue un recurso que ya se materializó (un `degraded`, o todos en un
    doble run) de otro del mismo tipo en la misma fase que nunca entró.
    """
    in_job = Counter(
        _key(phase, rt)
        for phase, rt in db.execute(
            select(OvaJobResource.phase_type, OvaJobResource.resource_type).where(
                OvaJobResource.job_id == job_id
            )
        ).all()
    )
    return in_job - Counter((p.phase_type, p.resource_type_id) for p in current)


def _new_row(r: OvaJobResource) -> dict:
    rid, title, _emoji = resolve_resource_display(r.phase_type, r.resource_type)
    return {
        "phase_type": r.phase_type,
        "content": r.content or "",
        "regenerated": False,
        "resource_type_id": rid,
        "title": title,
    }


def _merged_rows(
    current: list[OvaPhase],
    recovered: list[OvaJobResource],
    missing: Counter,
    *,
    replace: bool,
) -> tuple[list[dict], int]:
    """Copia la versión activa y le aplica los recursos recuperados.

    Se añaden tantos recursos de cada (fase, tipo) como huecos le faltan al OVA
    (``missing``); el resto ya está dentro (un `degraded` materializado, o un
    doble run del mismo job) y no se duplica. Con ``replace`` se sustituye su
    contenido en su sitio (salvo que el docente ya regenerase esa fase); sin él
    (job cancelado) se omite. Se recorre del último al primero: al cancelar, los
    que faltan son los que terminaron tarde. Devuelve las filas y cuántos
    recursos cambiaron algo.
    """
    rows = [_phase_row(p) for p in sorted(current, key=lambda p: p.phase_order)]
    matched: set[int] = set()
    appended: list[dict] = []
    replaced = 0
    for r in reversed(recovered):
        key = _key(r.phase_type, r.resource_type)
        if missing[key] > 0:
            missing[key] -= 1
            appended.append(_new_row(r))
            continue
        # También desde el final: en un doble run cada uno cae en su propia fase.
        hit = next(
            (
                i
                for i in reversed(range(len(rows)))
                if i not in matched and (rows[i]["phase_type"], rows[i]["resource_type_id"]) == key
            ),
            None,
        )
        if hit is None:
            continue
        matched.add(hit)
        if replace and not rows[hit]["regenerated"]:
            rows[hit]["content"] = r.content or ""
            replaced += 1
    rows.extend(reversed(appended))
    # sorted() es estable: dentro de cada fase, primero lo que ya había y luego lo recuperado.
    return sorted(rows, key=lambda row: _rank(row["phase_type"])), len(appended) + replaced


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
    current = list(active.phases)
    missing = _missing_slots(db, job.id, current)
    rows, applied = _merged_rows(current, recovered, missing, replace=replace)
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
