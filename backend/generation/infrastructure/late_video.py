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

Varios procesos: la web y el worker ejecutan los dos `recover_late_videos`.
Cada espera se reclama antes en `late_video_claims` (`late_video_claims.py`):
un trabajo que otro proceso vivo ya espera no se reanuda aquí. Si el reclamo es
de un proceso que murió sin soltarlo, caduca en segundos; por eso esos avisos se
vuelven a mirar cuando caduque el reclamo (`_recheck`).
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

# Reclamo compartido entre procesos (None con SQLite: un único proceso).
_claims = None
# Veces que se vuelve a mirar un aviso reclamado por otro proceso al arrancar.
_RECHECK_ROUNDS = 3
_RECHECK_MAX_WAIT_S = 900.0


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
    """Registra el sumidero y el reclamo en `video_late` (una vez por proceso)."""
    from generation.infrastructure.late_video_claims import make_claims
    from llm.images.video_late import install_sink

    global _claims
    _claims = make_claims()
    install_sink(apply_late_video, claims=_claims)


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


def _held_elsewhere(job_ids: list[str]) -> dict[str, float]:
    """Avisos que otro proceso ya espera → segundos hasta que caduque su reclamo."""
    if _claims is None or not job_ids:
        return {}
    try:
        return _claims.held_elsewhere(job_ids)
    except Exception:  # noqa: BLE001 — sin tabla/BD: `watch` decide (falla abierto)
        logger.exception("late video claim lookup failed")
        return {}


def _resume_pending(only: set[str] | None = None) -> tuple[int, dict[str, float]]:
    """Reanuda los avisos pendientes (de `only`, si se da) que nadie más espera.
    → (reanudados, {job_id: segundos} de los que tiene otro proceso)."""
    from llm.images.video_late import resume

    pending = _scan_pending()
    if only is not None:
        pending = {job: v for job, v in pending.items() if job in only}
    held = _held_elsewhere(list(pending))
    resumed = 0
    for job_id, (marker, owner) in pending.items():
        if job_id not in held:
            resume(marker, _key(marker, owner))
            resumed += 1
    return resumed, held


def _schedule_recheck(held: dict[str, float], rounds: int) -> None:
    """Vuelve a mirar los avisos reclamados por otro proceso cuando caduque su
    reclamo: si ese proceso murió, nadie más los reanudaría hasta otro reinicio."""
    if not held or rounds <= 0:
        return
    wait = min(max(held.values()) + 5.0, _RECHECK_MAX_WAIT_S)
    timer = threading.Timer(wait, _recheck, args=(set(held), rounds - 1))
    timer.daemon = True
    timer.start()


def _recheck(job_ids: set[str], rounds: int) -> None:
    try:
        resumed, held = _resume_pending(job_ids)
    except Exception:  # noqa: BLE001
        logger.exception("late video recheck failed")
        return
    # Sin nada que reanudar es lo normal: el otro proceso ya lo entregó.
    logger.info("late video recheck", jobs=len(job_ids), resumed=resumed, still_held=len(held))
    _schedule_recheck(held, rounds)


def recover_late_videos() -> int:
    """Reanuda los avisos pendientes que dejó un proceso anterior. Nunca lanza.
    Devuelve cuántos reanuda este proceso (no cuenta los que espera otro)."""
    if _claims is not None:
        try:
            _claims.purge()
        except Exception:  # noqa: BLE001 — limpieza, no bloquea la recuperación
            logger.exception("late video claims purge failed")
    try:
        resumed, held = _resume_pending()
    except Exception:  # noqa: BLE001 — el arranque sigue aunque falle
        logger.exception("late video recovery scan failed (continuing)")
        return 0
    if resumed:
        logger.info("late videos resumed", count=resumed)
    if held:
        logger.info("late videos watched by another process", count=len(held))
        _schedule_recheck(held, _RECHECK_ROUNDS)
    return resumed
