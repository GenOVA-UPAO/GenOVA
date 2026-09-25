"""Video tardío en la base de datos: sustituir el aviso y reanudar tras un reinicio.

`llm.images.video_late` espera en segundo plano los videos que no llegaron
dentro del tope de la generación; aquí está su «sumidero» (`apply_late_video`):
busca el aviso `data-ova-video-pending="<id>"` en el recurso del job
(`OvaJobResource`) y en las fases de cualquier versión del OVA (`OvaPhase`), lo
sustituye por el video (o por el aviso definitivo) y reconstruye el SCORM de la
versión actual si la tocó.

Concurrencia: cada fila se lee y se escribe con bloqueo de fila (FOR UPDATE) en
una transacción corta, sin esperar a la red dentro. Solo se sustituye donde el
aviso sigue estando: si el docente lo quitó, editó o regeneró el recurso, esa
fila no se toca. Además se informa si un job o una regeneración que llegó a
contener el aviso sigue en marcha (`busy`): podría volver a escribirlo desde una
copia vieja, y `video_late` repite la entrega hasta que acaben.

Arranque (`recover_late_videos`, desde main.py y worker.py): los hilos de espera
viven en memoria y un reinicio los pierde. Se buscan los avisos pendientes y se
reanuda cada uno resolviendo la clave por el dueño, como al encargarlo; el
primer sondeo va aunque el tope ya pasara (el video está pagado y puede estar
listo). Si no llega, queda el aviso definitivo.
"""

from __future__ import annotations

import threading
import uuid
from collections import OrderedDict
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select

from llm.images.video_late import ApplyReport
from llm.images.video_placeholder import MARK_ATTR, PendingMarker, pending_markers, replace_pending
from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion

logger = structlog.get_logger(__name__)

# Relojes de procesos distintos: margen al filtrar filas por fecha.
_CLOCK_SLACK = timedelta(hours=1)
# Al arrancar solo se miran filas recientes: un aviso pendiente se resuelve en
# minutos (o en el siguiente arranque); no se lee el historial entero.
_SCAN_WINDOW = timedelta(days=7)
_RUNNING_JOB = ("queued", "running")

# Jobs y OVAs que llegaron a contener el aviso de cada video: aunque el aviso ya
# se sustituyera, siguen «escribiendo» mientras estén en marcha.
_related: OrderedDict[str, tuple[set, set]] = OrderedDict()
_related_lock = threading.Lock()
_RELATED_MAX = 256


def _remember(job_id: str, jobs: set, ovas: set) -> tuple[set, set]:
    with _related_lock:
        known_jobs, known_ovas = _related.get(job_id, (set(), set()))
        merged = (known_jobs | jobs, known_ovas | ovas)
        _related[job_id] = merged
        _related.move_to_end(job_id)
        while len(_related) > _RELATED_MAX:
            _related.popitem(last=False)
        return merged


def _like(column, job_id: str):
    # Dos LIKE baratos antes del regex: el id y el atributo del marcador.
    return column.like(f"%{MARK_ATTR}%") & column.like(f"%{job_id}%")


def _replace_rows(model, since_col, owner_col, job_id: str, since: datetime, fragment: str):
    """Sustituye el aviso en las filas de `model` que lo tienen. → (dueños, cuántos)."""
    from core.database import SessionLocal

    db = SessionLocal()
    try:
        rows = (
            db.execute(
                select(model)
                .where(since_col >= since, _like(model.content, job_id))
                .with_for_update()
            )
            .scalars()
            .all()
        )
        owners: set = set()
        replaced = 0
        for row in rows:
            content, count = replace_pending(row.content, job_id, fragment)
            if count:
                row.content = content
                replaced += count
                owners.add(getattr(row, owner_col))
        db.commit()
        return owners, replaced
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _state(job_ids: set, version_ids: set, ova_ids: set) -> tuple[bool, set, set]:
    """(alguien aún escribe, OVAs relacionados, versiones actuales a reconstruir)."""
    from core.database import SessionLocal

    db = SessionLocal()
    try:
        busy = False
        ova_ids = set(ova_ids)
        if job_ids:
            for status, ova_id in db.execute(select(OvaJob.status, OvaJob.ova_id).where(OvaJob.id.in_(job_ids))):
                busy |= status in _RUNNING_JOB
                if ova_id is not None:
                    ova_ids.add(ova_id)
        if version_ids:
            ova_ids |= set(db.execute(select(OvaVersion.ova_id).where(OvaVersion.id.in_(version_ids))).scalars())
        current: set = set()
        if ova_ids:
            for ova in db.execute(select(Ova).where(Ova.id.in_(ova_ids))).scalars():
                busy |= ova.status == "generando"
                if ova.current_version_id in version_ids:
                    current.add(ova.current_version_id)
        return busy, ova_ids, current
    finally:
        db.close()


def apply_late_video(job_id: str, started_at: float, fragment: str) -> ApplyReport:
    """Sumidero de `video_late`: sustituye el aviso de `job_id` donde siga estando."""
    from generation.infrastructure.late_video_scorm import rebuild_current_scorm

    since = datetime.fromtimestamp(started_at, UTC) - _CLOCK_SLACK
    jobs, in_resources = _replace_rows(
        OvaJobResource, OvaJobResource.updated_at, "job_id", job_id, since, fragment
    )
    versions, in_phases = _replace_rows(OvaPhase, OvaPhase.created_at, "version_id", job_id, since, fragment)
    known_jobs, known_ovas = _remember(job_id, jobs, set())
    busy, ova_ids, current = _state(known_jobs, versions, known_ovas)
    _remember(job_id, set(), ova_ids)
    for version_id in current:
        try:
            rebuild_current_scorm(version_id)
        except Exception:  # noqa: BLE001 — el SCORM se rehace en la próxima edición
            logger.exception("scorm rebuild with late video failed", version_id=str(version_id))
    replaced = in_resources + in_phases
    if replaced:
        logger.info(
            "late video placeholder replaced",
            job_id=job_id,
            resources=in_resources,
            phases=in_phases,
            scorm_rebuilt=len(current),
        )
    return ApplyReport(replaced, busy)


# ── Arranque ───────────────────────────────────────────────────────────────────


def install_late_video() -> None:
    """Registra el sumidero en `video_late` (una vez por proceso, al arrancar)."""
    from llm.images.video_late import install_sink

    install_sink(apply_late_video)


def _scan_pending() -> dict[str, tuple[PendingMarker, uuid.UUID | None]]:
    """Avisos pendientes de las filas recientes → (marcador, dueño del OVA/job)."""
    from core.database import SessionLocal

    since = datetime.now(UTC) - _SCAN_WINDOW
    db = SessionLocal()
    try:
        in_resources = db.execute(
            select(OvaJobResource.content, OvaJob.user_id)
            .join(OvaJob, OvaJob.id == OvaJobResource.job_id)
            .where(OvaJobResource.updated_at >= since, OvaJobResource.content.like(f"%{MARK_ATTR}%"))
        ).all()
        in_phases = db.execute(
            select(OvaPhase.content, Ova.user_id)
            .join(OvaVersion, OvaVersion.id == OvaPhase.version_id)
            .join(Ova, Ova.id == OvaVersion.ova_id)
            .where(OvaPhase.created_at >= since, OvaPhase.content.like(f"%{MARK_ATTR}%"))
        ).all()
    finally:
        db.close()
    found: dict[str, tuple[PendingMarker, uuid.UUID | None]] = {}
    for content, owner in [*in_resources, *in_phases]:
        for marker in pending_markers(content):
            found.setdefault(marker.job_id, (marker, owner))
    return found


def _key(marker: PendingMarker, owner) -> str | None:
    from llm.images.video_generation import SUPPORTED_PROVIDERS, key_for

    if marker.job_id.startswith("fake-") or marker.provider not in SUPPORTED_PROVIDERS:
        return None
    try:
        return key_for(marker.provider, owner)
    except Exception:  # noqa: BLE001 — sin clave: queda el aviso definitivo
        logger.exception("late video key resolution failed", job_id=marker.job_id)
        return None


def recover_late_videos() -> int:
    """Reanuda los avisos pendientes que dejó un proceso anterior. Nunca lanza."""
    from llm.images.video_late import resume

    try:
        pending = _scan_pending()
    except Exception:  # noqa: BLE001 — el arranque sigue aunque falle
        logger.exception("late video recovery scan failed (continuing)")
        return 0
    for marker, owner in pending.values():
        resume(marker, _key(marker, owner))
    if pending:
        logger.info("late videos resumed", count=len(pending))
    return len(pending)
