"""Estado compartido de las regeneraciones (tabla `regen_jobs`, migración 044).

Antes vivía en un dict de la memoria del proceso web: con varios workers de
uvicorn (o web + worker arq) el sondeo que caía en otro proceso daba 404, y la
recuperación al arrancar liberaba el OVA que otro proceso vivo regeneraba. Ahora:

- `start_regen` crea la fila en la MISMA transacción que pone el OVA en
  «generando»: nunca hay un OVA regenerándose sin su fila.
- El ejecutor (hilo del web o worker arq) la reclama (`claim_regen`) y renueva
  `heartbeat_at` cada `RENEW_S` (`regen_heartbeat.JobHeartbeat`).
- Cualquier proceso da por interrumpida una regeneración cuyo latido lleva más
  de `TTL_S` sin renovarse (o que lleva `QUEUED_TTL_S` en cola sin dueño), y
  solo entonces libera el OVA. Nunca toca la de otro proceso vivo.

Las escrituras de estado van en transacciones cortas propias (conexión del
engine), nunca en la sesión del hilo que espera al modelo: una sesión de
SQLAlchemy no se comparte entre hilos. La excepción es el cierre con éxito, que
va en la transacción de la versión nueva para que queden las dos o ninguna. Los
tiempos se miden con el reloj de la BD, no con el de cada máquina.
"""

from __future__ import annotations

import os
import socket
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta

import structlog
from sqlalchemy import and_, delete, exists, func, or_, select, update
from sqlalchemy.orm import Session

from generation.domain.regen_progress import estimate_percentage, is_terminal, resolve_regen_stage
from generation.regen.regen_job_model import RegenJob

logger = structlog.get_logger(__name__)

TTL_S = 90  # sin latido en este tiempo → el ejecutor murió
RENEW_S = 15.0  # cada cuánto late el ejecutor (TTL_S tolera varios latidos fallidos)
QUEUED_TTL_S = 600  # en la cola arq sin que ningún worker la tome
KEEP_FINISHED = timedelta(days=7)

ACTIVE = ("running", "generating")
INTERRUPTED_MSG = "Interrumpida: el proceso que la ejecutaba dejó de responder."

# Único por proceso y por arranque (el pid se repite tras reiniciar un contenedor).
OWNER = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"

_T = RegenJob.__table__


class RegenLost(Exception):
    """Otro proceso dio la regeneración por interrumpida mientras esta seguía."""


def _engine():
    from core.database import engine

    return engine


def _as_uuid(value) -> uuid.UUID | None:
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _db_now(conn) -> datetime:
    return conn.execute(select(func.now())).scalar_one()


def _seconds(later: datetime, earlier: datetime) -> float:
    # Postgres devuelve fechas con zona; SQLite (tests), sin ella. Ambas son UTC.
    if (later.tzinfo is None) != (earlier.tzinfo is None):
        later, earlier = later.replace(tzinfo=None), earlier.replace(tzinfo=None)
    return (later - earlier).total_seconds()


def _stale(now: datetime):
    """Condición SQL: regeneración abierta cuyo ejecutor ya no late."""
    return and_(
        _T.c.status.in_(ACTIVE),
        or_(
            and_(_T.c.owner.is_not(None), _T.c.heartbeat_at < now - timedelta(seconds=TTL_S)),
            and_(_T.c.owner.is_(None), _T.c.heartbeat_at < now - timedelta(seconds=QUEUED_TTL_S)),
        ),
    )


def start_regen(
    db: Session,
    ova,
    effective_prompt: str,
    phase_ids: list[str],
    total_phases: int,
    worker: Callable[[str, str], None],
    instruction: str | None = None,
    attachments: list[dict] | None = None,
) -> str:
    """Pone el OVA en «generando», registra la regeneración y la lanza.

    `worker(job_id, ova_id)` lo inyecta el router (regen_launcher.launch_regen:
    hilo o cola arq); importarlo aquí crearía un ciclo con regen_service.
    """
    from core.database import commit_or_500

    job_id = uuid.uuid4()
    ova.status = "generando"
    db.add(
        RegenJob(
            id=job_id,
            ova_id=ova.id,
            prompt=effective_prompt or "",
            instruction=instruction,
            phase_ids=list(phase_ids or []),
            attachments=list(attachments or []),
            total_phases=max(int(total_phases or 1), 1),
        )
    )
    commit_or_500(db, op="start_regen")
    worker(str(job_id), str(ova.id))
    return str(job_id)


def claim_regen(job_id: str) -> dict | None:
    """El ejecutor toma la regeneración (una sola vez). None si ya la tomó otro,
    terminó o se dio por interrumpida (p. ej. un reintento tardío de arq)."""
    jid = _as_uuid(job_id)
    if jid is None:
        return None
    with _engine().begin() as conn:
        row = (
            conn.execute(
                update(_T)
                .where(_T.c.id == jid, _T.c.status == "running")
                .where(or_(_T.c.owner.is_(None), _T.c.owner == OWNER))
                .values(
                    status="generating",
                    owner=OWNER,
                    step="material",
                    started_at=func.now(),
                    heartbeat_at=func.now(),
                )
                .returning(
                    _T.c.ova_id, _T.c.prompt, _T.c.instruction, _T.c.phase_ids, _T.c.attachments
                )
            )
            .mappings()
            .first()
        )
    return dict(row) if row else None


def _mine(job_id: str):
    return and_(_T.c.id == _as_uuid(job_id), _T.c.owner == OWNER, _T.c.status == "generating")


def touch_regen(job_id: str, **values) -> bool:
    """Latido (más campos opcionales: step, rag…). False = ya no es nuestra."""
    with _engine().begin() as conn:
        res = conn.execute(
            update(_T).where(_mine(job_id)).values(heartbeat_at=func.now(), **values)
        )
    return res.rowcount > 0


def mark_regen_success(db: Session, job_id: str, new_version_number: int) -> None:
    """Cierra la regeneración DENTRO de la transacción que escribe la versión
    nueva: o quedan las dos, o ninguna. Si otro proceso ya la dio por
    interrumpida (y liberó el OVA), lanza RegenLost y no se escribe nada."""
    res = db.execute(
        update(_T)
        .where(_mine(job_id))
        .values(
            status="success",
            step="done",
            new_version_number=new_version_number,
            heartbeat_at=func.now(),
            finished_at=func.now(),
        )
    )
    if res.rowcount == 0:
        raise RegenLost(job_id)


def fail_regen(job_id: str, error: str) -> bool:
    """Marca el fallo si la regeneración sigue siendo nuestra."""
    return touch_regen(
        job_id, status="error", step="done", error=(error or "error")[:500], finished_at=func.now()
    )


def _read(jid: uuid.UUID):
    with _engine().connect() as conn:
        return conn.execute(select(_T, func.now().label("db_now")).where(_T.c.id == jid)).first()


def regen_progress_dto(job_id: str, ova_id: str) -> dict | None:
    """Progreso para el sondeo (lo sirve cualquier proceso), o None si no existe.

    Si el ejecutor dejó de latir, aquí mismo se da por interrumpida: el chat
    recibe «error» y deja de girar sin esperar a que alguien reinicie.
    """
    jid, oid = _as_uuid(job_id), _as_uuid(ova_id)
    if jid is None or oid is None:
        return None
    row = _read(jid)
    if row is None or row.ova_id != oid:
        return None
    if row.status in ACTIVE:
        limit = TTL_S if row.owner else QUEUED_TTL_S
        if _seconds(row.db_now, row.heartbeat_at) > limit:
            recover_orphan_regen(ova_id=oid)
            row = _read(jid)

    elapsed = _seconds(row.db_now, row.started_at or row.created_at)
    percentage = estimate_percentage(
        status=row.status, total_phases=row.total_phases, started_at=0.0, now=elapsed, step=row.step
    )
    # No-terminal incluye "generating" (lo pone el ejecutor al reclamarla); antes
    # solo "running" mapeaba al stage por porcentaje y la etiqueta quedaba
    # congelada en "Finalizando" durante toda la generación.
    terminal = is_terminal(row.status)
    return {
        "job_id": str(jid),
        "ova_id": str(oid),
        "status": row.status,
        "percentage": percentage,
        "stage": resolve_regen_stage(100 if terminal else percentage),
        "new_version_number": row.new_version_number,
        # Qué material de referencia se consultó (None hasta que el ejecutor lo
        # recupera). El chat lo muestra al terminar.
        "rag": row.rag,
    }


def recover_orphan_regen(ova_id=None) -> int:
    """Da por interrumpidas las regeneraciones sin latido y libera sus OVAs.

    Solo libera un OVA en «generando» CON versión actual (la generación inicial
    lo mantiene sin versión hasta materializar) sin ninguna regeneración viva ni
    job de generación activo, comprobado en la misma sentencia UPDATE. Con
    `ova_id` se limita a ese OVA (recuperación perezosa del sondeo y del 409).
    Devuelve cuántos OVAs liberó.
    """
    from generation.jobs.jobs_model import OvaJob
    from models import Ova

    oid = _as_uuid(ova_id) if ova_id is not None else None
    only_ova = [_T.c.ova_id == oid] if oid else []
    try:
        with _engine().begin() as conn:
            now = _db_now(conn)
            interrupted = conn.execute(
                update(_T)
                .where(_stale(now), *only_ova)
                .values(
                    status="error",
                    step="interrupted",
                    error=INTERRUPTED_MSG,
                    finished_at=func.now(),
                )
                .returning(_T.c.id)
            ).all()
            live_regen = exists().where(_T.c.ova_id == Ova.id, _T.c.status.in_(ACTIVE))
            # Cinturón y tirantes: un job de generación activo sobre el OVA.
            active_job = exists().where(
                OvaJob.ova_id == Ova.id, OvaJob.status.in_(("queued", "running"))
            )
            released = conn.execute(
                update(Ova.__table__)
                .where(
                    Ova.status == "generando",
                    Ova.current_version_id.is_not(None),
                    ~live_regen,
                    ~active_job,
                    *([Ova.id == oid] if oid else []),
                )
                .values(status="listo")
            ).rowcount
            if oid is None:
                conn.execute(delete(_T).where(_T.c.finished_at < now - KEEP_FINISHED))
        if interrupted or released:
            logger.info(
                "regeneraciones huérfanas recuperadas",
                interrupted=len(interrupted),
                released=released,
                ova_id=str(oid) if oid else None,
            )
        return released
    except Exception:
        logger.exception("Regen orphan recovery failed (continuing).")
        return 0
