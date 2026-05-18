import logging
import os
import threading
import time
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, User
from ova.uploads_service import claim_user_uploads, max_files_per_request


router = APIRouter()
logger = logging.getLogger(__name__)

LLM_CATALOG = [
    {
        "id": "openai",
        "label": "OpenAI",
        "provider": "OpenAI",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "gemini",
        "label": "Gemini",
        "provider": "Google",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "claude",
        "label": "Claude",
        "provider": "Anthropic",
        "quality_tier": "high",
        "cost_tier": "high",
    },
]

PROGRESS_STAGES = [
    (5, "Validando solicitud"),
    (20, "Preparando contexto educativo"),
    (45, "Generando contenido base"),
    (70, "Estructurando actividades"),
    (90, "Ajustando evaluación"),
    (100, "Finalizando OVA"),
]

_generation_jobs: dict[str, dict] = {}
_generation_jobs_lock = threading.Lock()


class GenerateOvaRequest(BaseModel):
    prompt: str
    llm_id: str
    upload_ids: list[str] = Field(default_factory=list)


def _parse_int_env(name: str, fallback: int) -> int:
    try:
        return int(os.getenv(name, str(fallback)))
    except (TypeError, ValueError):
        return fallback


def _min_prompt_chars() -> int:
    return max(1, _parse_int_env("MIN_PROMPT_CHARS", 10))


def _job_duration_seconds() -> int:
    return max(1, _parse_int_env("OVA_GENERATION_DURATION_SECONDS", 14))


def _job_ttl_seconds() -> int:
    default_ttl = max(60, _job_duration_seconds() * 10)
    configured_ttl = _parse_int_env("OVA_GENERATION_JOB_TTL_SECONDS", default_ttl)
    min_ttl = max(60, _job_duration_seconds())
    return max(min_ttl, configured_ttl)


def _enabled_llm_ids() -> set[str]:
    raw_ids = os.getenv("OVA_ENABLED_LLMS", "openai,gemini")
    return {item.strip().lower() for item in raw_ids.split(",") if item.strip()}


def _enabled_llm_options() -> list[dict]:
    allowed_ids = _enabled_llm_ids()
    return [item for item in LLM_CATALOG if item["id"] in allowed_ids]


def _resolve_stage(percentage: int) -> str:
    for threshold, stage in PROGRESS_STAGES:
        if percentage <= threshold:
            return stage
    return PROGRESS_STAGES[-1][1]


def _current_progress(job: dict) -> tuple[int, str, str]:
    elapsed_seconds = max(0.0, time.time() - float(job["started_at"]))
    percentage = min(100, int((elapsed_seconds / _job_duration_seconds()) * 100))
    stage = _resolve_stage(percentage)
    status_label = "success" if percentage >= 100 else "running"
    return percentage, stage, status_label


def _prune_generation_jobs() -> None:
    now = time.time()
    ttl_seconds = _job_ttl_seconds()

    expired_job_ids = []
    for job_id, job in _generation_jobs.items():
        completed_at = job.get("completed_at")
        reference_timestamp = (
            completed_at if completed_at is not None else job["started_at"]
        )
        expires_at = float(reference_timestamp) + ttl_seconds

        if now >= expires_at:
            expired_job_ids.append(job_id)

    for job_id in expired_job_ids:
        _generation_jobs.pop(job_id, None)


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR", default)


def _title_from_prompt(prompt: str) -> str:
    for sep in (". ", ".\n", "\n"):
        idx = prompt.find(sep)
        if 0 < idx <= 80:
            return prompt[: idx + 1].strip()
    return prompt[:80].rstrip()


def _finalize_ova(ova_id: str, prompt: str, db: Session) -> None:
    from scorm.service import build_scorm_zip_bytes

    try:
        output_dir = _ova_output_dir()
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{ova_id}.zip")

        zip_bytes = build_scorm_zip_bytes(
            course_title=_title_from_prompt(prompt),
            module_title="OVA Generado por GenOVA",
        )
        with open(file_path, "wb") as f:
            f.write(zip_bytes)

        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if ova:
            ova.status = "listo"
            ova.file_path = file_path
            db.commit()
    except Exception as exc:
        logger.error("Failed to finalize OVA %s: %s", ova_id, exc)
        _mark_ova_error(ova_id, db)


def _mark_ova_error(ova_id: str, db: Session) -> None:
    try:
        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if ova and ova.status != "listo":
            ova.status = "error"
            db.commit()
    except Exception as exc:
        logger.error("Failed to mark OVA %s as error: %s", ova_id, exc)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    return {"items": _enabled_llm_options()}


@router.post("/generate")
def start_ova_generation(
    payload: GenerateOvaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = payload.prompt.strip()
    llm_id = payload.llm_id.strip().lower()

    if not prompt:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "prompt_required",
                "message": "El prompt es obligatorio.",
            },
        )

    min_chars = _min_prompt_chars()
    if len(prompt) < min_chars:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "prompt_too_short",
                "message": f"El prompt debe tener al menos {min_chars} caracteres.",
            },
        )

    enabled_options = _enabled_llm_options()
    if not enabled_options:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "llm_unavailable",
                "message": "No hay modelos LLM habilitados actualmente.",
            },
        )

    enabled_ids = {item["id"] for item in enabled_options}
    if llm_id not in enabled_ids:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "llm_invalid",
                "message": "Debes seleccionar un LLM válido.",
            },
        )

    upload_ids = [
        (item or "").strip() for item in payload.upload_ids if (item or "").strip()
    ]
    upload_limit = max_files_per_request()
    if len(upload_ids) > upload_limit:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "files_limit_exceeded",
                "message": f"Solo se permiten hasta {upload_limit} archivos.",
            },
        )

    uploads, upload_error = claim_user_uploads(str(current_user.id), upload_ids)
    if upload_error == "duplicate_upload_ids":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "duplicate_upload_ids",
                "message": "La lista de archivos contiene IDs duplicados.",
            },
        )

    if upload_error == "upload_not_found":
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "upload_not_found",
                "message": "Uno o más archivos temporales no fueron encontrados o expiraron.",
            },
        )

    ova = Ova(
        user_id=current_user.id,
        title=_title_from_prompt(prompt),
        description=prompt,
        status="generando",
    )
    db.add(ova)
    db.commit()
    db.refresh(ova)
    ova_id = str(ova.id)

    job_id = str(uuid.uuid4())

    with _generation_jobs_lock:
        _prune_generation_jobs()
        _generation_jobs[job_id] = {
            "job_id": job_id,
            "ova_id": ova_id,
            "llm_id": llm_id,
            "prompt": prompt,
            "uploads": uploads,
            "started_at": time.time(),
            "status": "running",
        }

    return {
        "job_id": job_id,
        "ova_id": ova_id,
        "status": "running",
        "message": "Generación de OVA iniciada.",
        "uploads_count": len(uploads),
    }


@router.get("/generate/{job_id}/progress")
def get_generation_progress(
    job_id: str,
    db: Session = Depends(get_db),
):
    with _generation_jobs_lock:
        _prune_generation_jobs()
        job = _generation_jobs.get(job_id)

    if not job:
        logger.warning(
            "OVA generation job not found: job_id=%s pid=%s (state is process-local in memory)",
            job_id,
            os.getpid(),
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": "No se encontró el proceso solicitado. Es posible que haya expirado.",
            },
        )

    percentage, stage, current_status = _current_progress(job)

    is_first_completion = False
    with _generation_jobs_lock:
        job["status"] = current_status
        if current_status == "success" and "completed_at" not in job:
            job["completed_at"] = time.time()
            is_first_completion = True

    ova_id = job.get("ova_id")
    if is_first_completion and ova_id:
        _finalize_ova(ova_id, job["prompt"], db)
    elif current_status == "error" and ova_id:
        _mark_ova_error(ova_id, db)

    return {
        "job_id": job_id,
        "ova_id": ova_id or "",
        "status": current_status,
        "percentage": percentage,
        "stage": stage,
        "message": "OVA generado correctamente." if current_status == "success" else "",
    }
