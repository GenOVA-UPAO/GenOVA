"""SCORM de la versión actual de un OVA tras meter un video tardío en sus fases.

El zip se guarda al materializar (o al regenerar), no al descargar: si el video
llega después, el paquete guardado aún lleva el aviso «en preparación». Aquí se
reconstruye con las fases actuales (el video sale a un archivo aparte, como en
`scorm.domain.package`) y se apunta el OVA a él.

Sin transacción abierta mientras se construye y se sube el zip (segundos de red
con Supabase): se toma una foto de las fases, se construye y se sube, y luego,
con la fila del OVA bloqueada, se comprueba que nada cambió (misma versión
actual, no está regenerándose, mismas fases). Si el docente editó entre medias
se repite con las fases nuevas: su edición manda.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import structlog
from sqlalchemy import select

from models import Ova, OvaPhase, OvaVersion

logger = structlog.get_logger(__name__)

_MODULE_TITLE = "OVA Generado por GenOVA"
_ATTEMPTS = 3


@dataclass(frozen=True)
class _Snapshot:
    ova_id: object  # uuid.UUID, como en el ORM
    user_id: str
    title: str
    version_id: object
    version_number: int
    phases: list[dict]
    fingerprint: str


def _eligible(ova: Ova | None, version_id) -> bool:
    """Solo la versión actual de un OVA vivo que nadie está regenerando."""
    return (
        ova is not None
        and ova.deleted_at is None
        and ova.status != "generando"
        and str(ova.current_version_id) == str(version_id)
    )


def _phases(db, version_id) -> tuple[list[dict], str]:
    rows = (
        db.execute(
            select(OvaPhase).where(OvaPhase.version_id == version_id).order_by(OvaPhase.phase_order)
        )
        .scalars()
        .all()
    )
    digest = hashlib.sha256()
    phases = []
    for row in rows:
        for part in (str(row.id), str(row.phase_order), row.title or "", row.content or ""):
            digest.update(part.encode("utf-8", "replace") + b"\0")
        phases.append(
            {"type": row.phase_type, "order": row.phase_order, "content": row.content or "", "title": row.title}
        )
    return phases, digest.hexdigest()


def _snapshot(version_id) -> _Snapshot | None:
    from core.database import SessionLocal

    db = SessionLocal()
    try:
        version = db.get(OvaVersion, version_id)
        ova = db.get(Ova, version.ova_id) if version is not None else None
        if version is None or not _eligible(ova, version_id):
            return None
        phases, fingerprint = _phases(db, version_id)
        return _Snapshot(
            ova.id, str(ova.user_id), ova.title, version.id, int(version.version_number), phases, fingerprint
        )
    finally:
        db.close()


def _point_to(snap: _Snapshot, storage_key: str | None, file_path: str | None) -> bool | None:
    """Apunta el OVA al zip nuevo. None = las fases cambiaron: hay que repetir."""
    from core.database import SessionLocal

    db = SessionLocal()
    try:
        ova = db.execute(select(Ova).where(Ova.id == snap.ova_id).with_for_update()).scalar_one_or_none()
        if not _eligible(ova, snap.version_id):
            db.rollback()
            return False
        _, fingerprint = _phases(db, snap.version_id)
        if fingerprint != snap.fingerprint:
            db.rollback()
            return None
        ova.storage_key = storage_key
        ova.file_path = file_path
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def rebuild_current_scorm(version_id) -> bool:
    """Reconstruye el SCORM si `version_id` es la versión actual. True si lo hizo."""
    from ova import persist_scorm_zip
    from scorm import build_scorm_zip_bytes

    for _ in range(_ATTEMPTS):
        snap = _snapshot(version_id)
        if snap is None:
            return False
        zip_bytes = build_scorm_zip_bytes(course_title=snap.title, module_title=_MODULE_TITLE, phases=snap.phases)
        storage_key, file_path = persist_scorm_zip(zip_bytes, snap.user_id, str(snap.ova_id), snap.version_number)
        done = _point_to(snap, storage_key, file_path)
        if done is not None:
            if done:
                logger.info("scorm rebuilt with late video", ova_id=str(snap.ova_id), version=snap.version_number)
            return done
    logger.warning("scorm not rebuilt: phases kept changing", version_id=str(version_id))
    return False
