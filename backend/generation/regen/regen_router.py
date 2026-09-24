from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.http_errors import forbidden_response
from core.rate_limit import limiter
from generation.regen.regen_jobs import regen_progress_dto, start_regen
from generation.regen.regen_rag import attach_to_ova
from generation.regen.regen_service import _finalize_edit
from models import Ova, OvaPhase, OvaVersion, User
from ova import ensure_version_exists, get_active_version, is_ova_owner

router = APIRouter(tags=["Generación"])


class RegenRequest(BaseModel):
    prompt: str | None = None
    fase_ids: list[str] = Field(default_factory=list)
    # Archivos adjuntados con el clip del chat para ESTE cambio (HU-024). Se
    # recuperan sus fragmentos relevantes (y los de los archivos que el OVA ya
    # tenía) y se inyectan en el prompt de la regeneración.
    upload_ids: list[str] = Field(default_factory=list, max_length=10)


def _original_topic(ova_id: str, fallback: str | None, db: Session) -> str | None:
    """Tema con el que se creó el OVA: el prompt de su primera versión.

    Las regeneraciones crean la v2 en adelante y nunca tocan la v1, así que es
    la única fuente del tema que no puede haberse contaminado. Leerla de ahí, y
    no de la versión activa, también cura los OVAs cuya versión activa guardó
    como tema un mensaje del chat antes de este arreglo.
    """
    first = db.execute(
        select(OvaVersion.prompt)
        .where(OvaVersion.ova_id == ova_id)
        .order_by(OvaVersion.version_number)
        .limit(1)
    ).scalar_one_or_none()
    return first or fallback


@router.post("/{ova_id}/regenerar", summary="Regenerar los recursos de una OVA")
@limiter.limit("10/minute")
def regenerate_ova(
    request: Request,
    ova_id: str,
    payload: RegenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if not is_ova_owner(ova, current_user):
        return forbidden_response("No tienes permiso para editar este OVA.")

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "El OVA ya está en proceso de generación.",
            },
        )

    active_version = get_active_version(ova_id, db)
    if not active_version:
        active_version = ensure_version_exists(ova, db)

    if payload.fase_ids:
        valid_phase_ids = {
            str(p.id)
            for p in db.execute(select(OvaPhase).where(OvaPhase.version_id == active_version.id))
            .scalars()
            .all()
        }
        invalid = [fid for fid in payload.fase_ids if fid not in valid_phase_ids]
        if invalid:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "invalid_fase_ids",
                    "message": "Algunos IDs de fases no pertenecen a este OVA.",
                },
            )

    user_prompt = payload.prompt.strip() if payload.prompt and payload.prompt.strip() else None

    # El mensaje del chat es SIEMPRE una instrucción sobre el OVA, nunca el tema.
    # Antes, sin recursos seleccionados, el mensaje sustituía al tema: el botón
    # "Regenerar OVA completo" mandaba su propia etiqueta y el OVA de la Ley de
    # Ohm pasaba a tratar sobre cómo regenerar un OVA. El tema se fija al crear
    # el OVA y ninguna regeneración lo cambia:
    #   - sin mensaje         → se regenera desde cero sobre el tema original;
    #   - con mensaje         → se aplica el cambio partiendo del HTML actual;
    #   - con fase_ids        → solo a esos recursos; sin ellos, a todos.
    instruction = user_prompt
    effective_prompt = _original_topic(ova_id, active_version.prompt, db)

    # Phases actually being regenerated: an explicit subset, else every phase of
    # the active version ("Regenerar OVA completo"). Used to pace the progress
    # estimate — without it a full regen counts 0 phases and the bar saturates at
    # 99% in one estimation window while real work keeps running.
    if payload.fase_ids:
        total_phases = len(payload.fase_ids)
    else:
        total_phases = db.scalar(
            select(func.count())
            .select_from(OvaPhase)
            .where(OvaPhase.version_id == active_version.id)
        )

    # Los adjuntos pasan a ser material del OVA desde ya: salen de la lista del
    # chat y sus chunks quedan atados al OVA (no caducan en 1 h y los próximos
    # cambios también pueden consultarlos).
    attachments = (
        attach_to_ova(db, str(current_user.id), ova_id, payload.upload_ids)
        if payload.upload_ids
        else []
    )

    job_id = start_regen(
        db,
        ova,
        effective_prompt,
        payload.fase_ids,
        total_phases or 1,
        worker=_finalize_edit,
        instruction=instruction,
        attachments=attachments,
    )

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "job_id": job_id,
            "message": "Regeneración iniciada.",
            "ova_status": "generando",
        },
    )


@router.get(
    "/{ova_id}/regenerar/{job_id}/progress", summary="Consultar el progreso de una regeneración"
)
def get_regen_progress(
    ova_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if not is_ova_owner(ova, current_user):
        return forbidden_response()

    progress = regen_progress_dto(job_id, ova_id)
    if progress is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": "Job de regeneración no encontrado.",
            },
        )
    return progress
