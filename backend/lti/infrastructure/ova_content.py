"""Contenido de las OVAs para LTI: las OVAs listas de un docente (selector de Deep
Linking) y el paquete web de reproducción.

El reproductor reutiliza el mismo shell que la exportación «Web (HTML)»
(`scorm.get_export_format("html")`): `index.html` + un iframe en sandbox por fase
con `scorm.js`/`app.js`. Se construye al vuelo desde la versión activa, igual que
`ExportPackage`, y se guarda unos segundos en memoria porque el navegador pide
varios archivos del mismo paquete seguidos.
"""

from __future__ import annotations

import threading
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass
from io import BytesIO
from zipfile import ZipFile

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Ova, OvaPhase, OvaVersion, User
from scorm import get_export_format

_READY = "listo"
_EVALUATION_PHASE = "evaluate"
_CACHE_TTL_S = 120.0
_CACHE_MAX = 16


@dataclass(frozen=True, slots=True)
class OvaSummary:
    id: str
    title: str
    description: str | None
    has_evaluation: bool


@dataclass(frozen=True, slots=True)
class PlayerPackage:
    title: str
    files: dict[str, bytes]


def _uuid(value) -> uuid.UUID | None:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def find_user_id_by_email(db: Session, email: str | None) -> str | None:
    if not email:
        return None
    user = db.execute(
        select(User).where(func.lower(User.email) == email.strip().lower(), User.is_active)
    ).scalar_one_or_none()
    return str(user.id) if user else None


def _active_version(db: Session, ova_id) -> OvaVersion | None:
    return db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
    ).scalar_one_or_none()


def _phases(db: Session, version_id) -> list[OvaPhase]:
    return list(
        db.execute(
            select(OvaPhase).where(OvaPhase.version_id == version_id).order_by(OvaPhase.phase_order)
        ).scalars()
    )


def _has_evaluation(phases: list[OvaPhase]) -> bool:
    return any(p.phase_type == _EVALUATION_PHASE for p in phases)


def get_ready_ova(db: Session, ova_id: str) -> OvaSummary | None:
    key = _uuid(ova_id)
    ova = db.get(Ova, key) if key else None
    if ova is None or ova.deleted_at is not None or ova.status != _READY:
        return None
    version = _active_version(db, ova.id)
    if version is None:
        return None
    return OvaSummary(
        id=str(ova.id),
        title=ova.title,
        description=ova.description,
        has_evaluation=_has_evaluation(_phases(db, version.id)),
    )


def list_ready_ovas(db: Session, owner_id: str) -> list[OvaSummary]:
    owner = _uuid(owner_id)
    if owner is None:
        return []
    ovas = db.execute(
        select(Ova)
        .where(Ova.user_id == owner, Ova.deleted_at.is_(None), Ova.status == _READY)
        .order_by(Ova.updated_at.desc().nulls_last(), Ova.created_at.desc())
    ).scalars()
    result = []
    for ova in ovas:
        summary = get_ready_ova(db, str(ova.id))
        if summary is not None:
            result.append(summary)
    return result


_cache: OrderedDict[tuple[str, str], tuple[float, PlayerPackage]] = OrderedDict()
_cache_lock = threading.Lock()


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


def build_player_package(db: Session, ova_id: str) -> PlayerPackage | None:
    key = _uuid(ova_id)
    ova = db.get(Ova, key) if key else None
    if ova is None or ova.deleted_at is not None or ova.status != _READY:
        return None
    version = _active_version(db, ova.id)
    if version is None:
        return None
    key = (str(ova.id), str(version.id))
    now = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < _CACHE_TTL_S:
            _cache.move_to_end(key)
            return hit[1]

    phases = [
        {"type": p.phase_type, "order": p.phase_order, "content": p.content, "title": p.title}
        for p in _phases(db, version.id)
    ]
    zipped = get_export_format("html").build(ova.title, phases)
    with ZipFile(BytesIO(zipped)) as archive:
        files = {name: archive.read(name) for name in archive.namelist()}
    package = PlayerPackage(title=ova.title, files=files)
    with _cache_lock:
        _cache[key] = (now, package)
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return package
