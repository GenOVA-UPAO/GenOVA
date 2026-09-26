"""Ejecutor de una regeneración: crea una OvaVersion nueva con contenido real
de los agentes (vía `regen_agents.py` / `regen_edit.py`).

Corre en un hilo del web o en el worker arq (regen_launcher). Todo lo que
necesita lo lee de la fila `regen_jobs` que reclama: no depende del proceso que
recibió la petición.
"""

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import SessionLocal
from generation.infrastructure.regen_persist import _build_and_persist, _mark_ova_error
from generation.regen.regen_edit import regen_phases_parallel
from generation.regen.regen_heartbeat import JobHeartbeat
from generation.regen.regen_jobs import (
    RegenLost,
    claim_regen,
    fail_regen,
    mark_regen_success,
    touch_regen,
)
from generation.regen.regen_rag import build_regen_material
from models import Ova, OvaPhase, OvaVersion
from ova import ensure_version_exists, get_active_version, next_version_number

logger = structlog.get_logger(__name__)


def _finalize_edit(job_id: str, ova_id: str) -> None:
    """Regenera las fases elegidas, crea la versión nueva y el SCORM.

    Solo la ejecuta quien la reclama: un reintento de arq, o un proceso que la
    recibe cuando ya se dio por interrumpida, no hace nada.
    """
    job = claim_regen(job_id)
    if job is None:
        logger.info("regen ya tomada, terminada o interrumpida; no se ejecuta", job_id=job_id)
        return
    # El de la fila (UUID), no el del lanzador: es la fuente de verdad.
    ova_id = job["ova_id"]
    with JobHeartbeat(job_id) as beat:
        db = SessionLocal()
        try:
            _run(db, job_id, ova_id, job, beat)
        except RegenLost:
            # Otro proceso la dio por interrumpida (y liberó el OVA) mientras este
            # seguía: no se escribe nada, puede haber otra regeneración en marcha.
            db.rollback()
            logger.warning(
                "regen perdida: no se escribe la versión", ova_id=str(ova_id), job_id=job_id
            )
        except Exception as exc:
            logger.error("edit regen failed", ova_id=str(ova_id), error=str(exc))
            # La sesión puede haber quedado a medias (un flush fallido): sin el
            # rollback, _mark_ova_error fallaba en silencio y el OVA seguía
            # «generando».
            db.rollback()
            if fail_regen(job_id, str(exc)):
                _mark_ova_error(db, ova_id)
        finally:
            db.close()


def _run(db: Session, job_id: str, ova_id, job: dict, beat: JobHeartbeat) -> None:
    prompt = job["prompt"]
    instruction = job.get("instruction") or None
    phase_ids_to_regen = set(job.get("phase_ids") or [])
    regen_all = not phase_ids_to_regen

    ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
    if not ova:
        raise LookupError("OVA no encontrado")

    llm_config = _owner_llm_config(db, ova.user_id)
    image_settings = _owner_image_settings(db, ova.user_id)

    current_version = get_active_version(ova_id, db)
    if not current_version:
        current_version = ensure_version_exists(ova, db)

    current_phases = list(
        db.execute(
            select(OvaPhase)
            .where(OvaPhase.version_id == current_version.id)
            .order_by(OvaPhase.phase_order)
        )
        .scalars()
        .all()
    )

    # Regenerate the selected phases concurrently (each _regen_phase is a
    # pure-LLM call with no DB access). Regen-all is otherwise sequential —
    # N phases × 2 LLM calls each — so the progress bar sat at 99% for
    # minutes. DB writes below stay in this thread, in phase order.
    material = build_regen_material(db, ova_id, job.get("attachments") or [], prompt, instruction)
    # El informe RAG y el paso viajan por la fila compartida (otra conexión):
    # el sondeo lo sirve cualquier proceso.
    if not touch_regen(job_id, rag=material.report, step="llm"):
        raise RegenLost(job_id)

    to_regen = [p for p in current_phases if regen_all or str(p.id) in phase_ids_to_regen]
    # Sin transacción abierta mientras se espera al modelo. Sin expirar los
    # objetos: los hilos de regen_phases_parallel leen las fases, y recargarlas
    # usaría la misma sesión desde varios hilos (una sesión no es thread-safe).
    db.expire_on_commit = False
    db.commit()
    regen_content = regen_phases_parallel(
        to_regen,
        prompt,
        instruction,
        llm_config,
        image_settings=image_settings,
        contexto=material.contexto,
    )
    if beat.lost.is_set() or not touch_regen(job_id, step="persist"):
        raise RegenLost(job_id)

    # La versión nueva se escribe cuando ya está el contenido: insertarla antes
    # dejaba la transacción abierta durante las llamadas al modelo (minutos),
    # con un bloqueo sobre la fila del OVA que hacía esperar a quien la leyera
    # con FOR UPDATE (p. ej. GET /api/jobs).
    existing_numbers = tuple(
        db.execute(select(OvaVersion.version_number).where(OvaVersion.ova_id == ova_id))
        .scalars()
        .all()
    )
    new_version_number = next_version_number(existing_numbers)
    current_version.is_active = False

    new_version = OvaVersion(
        ova_id=ova_id,
        version_number=new_version_number,
        prompt=prompt,
        is_active=True,
    )
    db.add(new_version)
    db.flush()

    new_phases_data = []
    for phase in current_phases:
        should_regen = regen_all or str(phase.id) in phase_ids_to_regen
        new_content = phase.content

        if should_regen:
            new_content = regen_content.get(str(phase.id)) or phase.content

        new_phase = OvaPhase(
            version_id=new_version.id,
            phase_type=phase.phase_type,
            phase_order=phase.phase_order,
            content=new_content,
            regenerated=should_regen,
            resource_type_id=phase.resource_type_id,
            title=phase.title,
        )
        db.add(new_phase)
        new_phases_data.append(
            {
                "type": phase.phase_type,
                "order": phase.phase_order,
                "content": new_content,
                "title": phase.title,
            }
        )

    db.flush()
    # Cierre de la regeneración en la misma transacción que la versión (la
    # confirma _build_and_persist): el chat nunca ve «success» sin versión ni al
    # revés.
    mark_regen_success(db, job_id, new_version_number)
    _build_and_persist(ova, ova_id, new_version, new_version_number, new_phases_data, db)


def _owner_llm_config(db: Session, user_id) -> dict:
    """Elecciones de modelo del dueño del OVA que se respetan (vacío = config
    de la plataforma): solo las que paga su propia clave, salvo el admin."""
    from sqlalchemy import select

    from llm.utils.llm_helpers import with_owner
    from llm.utils.user_overrides import honored_overrides
    from models import Role, User, UserRole

    user = db.get(User, user_id)
    if not user:
        return {}
    is_admin = (
        db.execute(
            select(UserRole)
            .join(Role)
            .where(UserRole.user_id == user.id, Role.name == "administrador")
        )
        .scalars()
        .first()
        is not None
    )
    # Como en la generación inicial: el motor busca las claves propias por el
    # autor para que sus elecciones se paguen con ellas (nunca viajan las claves).
    return with_owner(
        honored_overrides(user.llm_settings, user.user_api_keys, is_admin=is_admin), user.id
    )


def _owner_image_settings(db: Session, user_id) -> dict:
    """image_settings del dueño del OVA — habilita imágenes en regen de engage."""
    from llm.images.image_providers import build_image_settings
    from models import User

    user = db.get(User, user_id)
    return build_image_settings(user, db) if user else {}
