import os
import threading
import time
import uuid

from fastapi import APIRouter, Body, status
from fastapi.responses import JSONResponse

router = APIRouter()

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
    return max(60, _parse_int_env("OVA_GENERATION_JOB_TTL_SECONDS", default_ttl))


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
    duration_seconds = _job_duration_seconds()
    ttl_seconds = _job_ttl_seconds()

    expired_job_ids = []
    for job_id, job in _generation_jobs.items():
        completed_at = job.get("completed_at")
        if completed_at is not None:
            expires_at = float(completed_at) + ttl_seconds
        else:
            expires_at = float(job["started_at"]) + duration_seconds + ttl_seconds

        if now >= expires_at:
            expired_job_ids.append(job_id)

    for job_id in expired_job_ids:
        _generation_jobs.pop(job_id, None)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    return {"items": _enabled_llm_options()}


@router.post("/generate")
def start_ova_generation(payload: dict = Body(default={})):
    prompt = (payload.get("prompt") or "").strip()
    llm_id = (payload.get("llm_id") or "").strip().lower()

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

    job_id = str(uuid.uuid4())
    with _generation_jobs_lock:
        _prune_generation_jobs()
        _generation_jobs[job_id] = {
            "job_id": job_id,
            "llm_id": llm_id,
            "prompt": prompt,
            "started_at": time.time(),
            "status": "running",
        }

    return {
        "job_id": job_id,
        "status": "running",
        "message": "Generación de OVA iniciada.",
    }


@router.get("/generate/{job_id}/progress")
def get_generation_progress(job_id: str):
    with _generation_jobs_lock:
        _prune_generation_jobs()
        job = _generation_jobs.get(job_id)

    if not job:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": (
                    "No se encontró el proceso solicitado. "
                    "Si el servidor usa múltiples workers, recuerda que este estado "
                    "es en memoria y local al proceso."
                ),
            },
        )

    percentage, stage, current_status = _current_progress(job)

    with _generation_jobs_lock:
        job["status"] = current_status
        if current_status == "success":
            job["completed_at"] = time.time()

    payload = {
        "job_id": job_id,
        "status": current_status,
        "percentage": percentage,
        "stage": stage,
        "message": "OVA generado correctamente." if current_status == "success" else "",
    }

    return payload
