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

from core.educational_metadata import metadata_from_ova
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


def _ready_summaries(db: Session, *conditions) -> list[OvaSummary]:
    """OVAs listas con versión activa, en una sola consulta y sin cargar el HTML de las fases.

    El selector de Deep Linking lista toda la biblioteca del docente: cargar cada
    fase (con videos embebidos) solo para saber si hay evaluación era un N+1 pesado.
    """
    active = select(OvaVersion.id).where(
        OvaVersion.ova_id == Ova.id, OvaVersion.is_active.is_(True)
    )
    has_evaluation = (
        select(OvaPhase.id)
        .join(OvaVersion, OvaPhase.version_id == OvaVersion.id)
        .where(
            OvaVersion.ova_id == Ova.id,
            OvaVersion.is_active.is_(True),
            OvaPhase.phase_type == _EVALUATION_PHASE,
        )
        .exists()
    )
    rows = db.execute(
        select(Ova.id, Ova.title, Ova.description, has_evaluation.label("has_evaluation"))
        .where(Ova.deleted_at.is_(None), Ova.status == _READY, active.exists(), *conditions)
        .order_by(Ova.updated_at.desc().nulls_last(), Ova.created_at.desc())
    ).all()
    return [
        OvaSummary(
            id=str(row.id),
            title=row.title,
            description=row.description,
            has_evaluation=bool(row.has_evaluation),
        )
        for row in rows
    ]


def get_ready_ova(db: Session, ova_id: str, owner_id: str | None = None) -> OvaSummary | None:
    key = _uuid(ova_id)
    if key is None:
        return None
    conditions = [Ova.id == key]
    if owner_id is not None:
        owner = _uuid(owner_id)
        if owner is None:
            return None
        conditions.append(Ova.user_id == owner)
    found = _ready_summaries(db, *conditions)
    return found[0] if found else None


def list_ready_ovas(db: Session, owner_id: str) -> list[OvaSummary]:
    owner = _uuid(owner_id)
    if owner is None:
        return []
    return _ready_summaries(db, Ova.user_id == owner)


_cache: OrderedDict[tuple[str, ...], tuple[float, PlayerPackage]] = OrderedDict()
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
    theme = ova.package_theme or "upao"
    # El tema y los metadatos (idioma, licencia) se editan sin crear versión nueva.
    key = (str(ova.id), str(version.id), theme, str(ova.updated_at))
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
    # Mismo tema y metadatos que la exportación: sin ellos el alumno veía siempre UPAO.
    zipped = get_export_format("html").build(
        ova.title, phases, metadata=metadata_from_ova(ova), theme=theme
    )
    with ZipFile(BytesIO(zipped)) as archive:
        files = {name: archive.read(name) for name in archive.namelist()}
    package = PlayerPackage(title=ova.title, files=files)
    with _cache_lock:
        _cache[key] = (now, package)
        _cache.move_to_end(key)
        # Los paquetes caducados se sueltan ya: llevan los medios del OVA en base64
        # y, sin esto, seguían en RAM hasta que hubiera más de _CACHE_MAX.
        for stale in [k for k, (ts, _) in _cache.items() if now - ts >= _CACHE_TTL_S]:
            del _cache[stale]
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return package
