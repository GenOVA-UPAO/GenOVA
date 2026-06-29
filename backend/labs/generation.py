"""Background generation workers and job store for Labs."""

import logging
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from core.database import SessionLocal
from labs.catalog import quality_check_html
from labs.generation_core import _generate_one, _safe_error
from models import LabResult

logger = logging.getLogger(__name__)

# Bound worker concurrency so a burst of /labs/generate calls can't spawn
# unlimited threads on Render free tier (512MB RAM cap).
_MAX_LAB_WORKERS = int(os.getenv("LABS_MAX_WORKERS", "4"))
_lab_pool = ThreadPoolExecutor(max_workers=_MAX_LAB_WORKERS, thread_name_prefix="lab-gen")

# ──────────────────────────────────────────────────────────────
#  In-memory job store
# ──────────────────────────────────────────────────────────────
_lab_jobs: dict[str, dict] = {}
_lab_jobs_lock = threading.Lock()


def _worker(
    job_id: str,
    slot: int,
    phase: str,
    resource_type: int,
    concept: str,
    prompt_text: str,
    model_id: str,
    provider: str,
    user_id: str | None,
) -> None:
    db = SessionLocal()
    start = time.time()
    result_id = error = html = None
    quality = {"cdn_ok": False, "scorm_ok": False, "min_length_ok": False, "char_count": 0}
    try:
        html, raw_json, error = _generate_one(
            phase, resource_type, concept, prompt_text, model_id, provider
        )
        quality = quality_check_html(html) if html else quality
        result = LabResult(
            phase=phase,
            resource_type=resource_type,
            concept=concept,
            prompt_text=prompt_text,
            model_id=model_id,
            provider=provider,
            html_content=html,
            raw_json=raw_json,
            quality_checks=quality,
            generation_ms=int((time.time() - start) * 1000),
            error_message=error,
            created_by=uuid.UUID(user_id) if user_id else None,
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        result_id = str(result.id)
    except Exception as exc:
        logger.exception("Lab worker crashed (phase=%s type=%s)", phase, resource_type)
        error = _safe_error(exc)
    finally:
        db.close()

    with _lab_jobs_lock:
        if job_id in _lab_jobs:
            _lab_jobs[job_id]["slots"][slot] = {
                "result_id": result_id,
                "status": "error" if error else "done",
                "html_content": html,
                "quality_checks": quality,
                "model_id": model_id,
                "provider": provider,
                "error": error,
                "generation_ms": int((time.time() - start) * 1000),
            }
            _lab_jobs[job_id]["done"] += 1


def start_lab_job(
    phase: str,
    resource_type: int,
    concept: str,
    model_configs: list[dict],
    user_id: str | None,
) -> str:
    """Spawn one worker thread per model_config; return job_id."""
    job_id = str(uuid.uuid4())
    with _lab_jobs_lock:
        _lab_jobs[job_id] = {
            "total": len(model_configs),
            "done": 0,
            "slots": [None] * len(model_configs),
        }
    for i, cfg in enumerate(model_configs):
        _lab_pool.submit(
            _worker,
            job_id,
            i,
            phase,
            resource_type,
            concept,
            cfg["prompt_text"],
            cfg["model_id"],
            cfg["provider"],
            user_id,
        )
    return job_id


def get_job_results(job_id: str) -> dict | None:
    with _lab_jobs_lock:
        job = _lab_jobs.get(job_id)
        if job is None:
            return None
        return {
            "job_id": job_id,
            "total": job["total"],
            "done": job["done"],
            "finished": job["done"] >= job["total"],
            "results": [s for s in job["slots"] if s is not None],
        }
