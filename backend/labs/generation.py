"""Background generation workers and job store for Labs."""
import json
import logging
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from agents.llm_router import generar_texto, generar_texto_with_model
from agents.podcast import build_podcast_html, podcast_audio_b64
from agents.utils import parse_json, strip_markdown
from database import SessionLocal
from labs.catalog import quality_check_html
from labs.prompt_utils import CONCEPT_PH, ENGAGE_CODE, ENGAGE_PODCAST, EXPLORE_CODE
from models import LabResult

logger = logging.getLogger(__name__)

# Bound worker concurrency so a burst of /labs/generate calls can't spawn
# unlimited threads on Render free tier (512MB RAM cap).
_MAX_LAB_WORKERS = int(os.getenv("LABS_MAX_WORKERS", "4"))
_lab_pool = ThreadPoolExecutor(max_workers=_MAX_LAB_WORKERS, thread_name_prefix="lab-gen")


def _safe_error(exc: BaseException) -> str:
    """Generic, leak-safe error label for the client. Full detail goes to logs."""
    name = type(exc).__name__
    if "RateLimit" in name or "429" in name:
        return "rate_limited"
    if "Timeout" in name:
        return "timeout"
    if "Auth" in name or "401" in name or "403" in name:
        return "auth_error"
    return "generation_failed"

# ──────────────────────────────────────────────────────────────
#  In-memory job store
# ──────────────────────────────────────────────────────────────
_lab_jobs: dict[str, dict] = {}
_lab_jobs_lock = threading.Lock()


def _generate_one(
    phase: str, resource_type: int, concept: str,
    prompt_text: str, model_id: str, provider: str,
) -> tuple[str | None, dict | None, str | None]:
    """Run one resource generation. Returns (html, raw_json, error)."""
    effective = prompt_text.replace(CONCEPT_PH, concept)
    try:
        if phase == "engage":
            if resource_type in ENGAGE_CODE:
                return strip_markdown(generar_texto_with_model(effective, model_id, provider, max_tokens=4000)), None, None
            if resource_type in ENGAGE_PODCAST:
                mono = generar_texto_with_model(effective, model_id, provider, max_tokens=700)
                return build_podcast_html(concept, mono, podcast_audio_b64(mono)), {"monologue": mono}, None
            # 2-step
            raw = generar_texto_with_model(effective, model_id, provider, max_tokens=2000)
            try:
                json_data = parse_json(raw)
            except Exception:
                json_data = {"contenido": raw}
            from agents.engage_prompts import prompt_html as engage_html
            html = strip_markdown(generar_texto(engage_html(resource_type, concept, json.dumps(json_data, ensure_ascii=False, indent=2)), "codigo", max_tokens=4000))
            return html, json_data, None
        # explore
        if resource_type in EXPLORE_CODE:
            return strip_markdown(generar_texto_with_model(effective, model_id, provider, max_tokens=4000)), None, None
        raw = generar_texto_with_model(effective, model_id, provider, max_tokens=2000)
        try:
            json_data = parse_json(raw)
        except Exception:
            json_data = {"contenido": raw}
        from agents.explore_prompts import prompt_html as explore_html
        html = strip_markdown(generar_texto(explore_html(resource_type, concept, json.dumps(json_data, ensure_ascii=False, indent=2)), "codigo", max_tokens=4000))
        return html, json_data, None
    except Exception as exc:
        logger.exception("Lab generation failed (phase=%s type=%s)", phase, resource_type)
        return None, None, _safe_error(exc)


def _worker(
    job_id: str, slot: int,
    phase: str, resource_type: int, concept: str,
    prompt_text: str, model_id: str, provider: str,
    user_id: str | None,
) -> None:
    db = SessionLocal()
    start = time.time()
    result_id = error = html = None
    quality = {"cdn_ok": False, "scorm_ok": False, "min_length_ok": False, "char_count": 0}
    try:
        html, raw_json, error = _generate_one(phase, resource_type, concept, prompt_text, model_id, provider)
        quality = quality_check_html(html) if html else quality
        result = LabResult(
            phase=phase, resource_type=resource_type, concept=concept,
            prompt_text=prompt_text, model_id=model_id, provider=provider,
            html_content=html, raw_json=raw_json, quality_checks=quality,
            generation_ms=int((time.time() - start) * 1000), error_message=error,
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
                "result_id": result_id, "status": "error" if error else "done",
                "html_content": html, "quality_checks": quality,
                "model_id": model_id, "provider": provider,
                "error": error, "generation_ms": int((time.time() - start) * 1000),
            }
            _lab_jobs[job_id]["done"] += 1


def start_lab_job(
    phase: str, resource_type: int, concept: str,
    model_configs: list[dict], user_id: str | None,
) -> str:
    """Spawn one worker thread per model_config; return job_id."""
    job_id = str(uuid.uuid4())
    with _lab_jobs_lock:
        _lab_jobs[job_id] = {"total": len(model_configs), "done": 0, "slots": [None] * len(model_configs)}
    for i, cfg in enumerate(model_configs):
        _lab_pool.submit(
            _worker,
            job_id, i, phase, resource_type, concept,
            cfg["prompt_text"], cfg["model_id"], cfg["provider"], user_id,
        )
    return job_id


def get_job_results(job_id: str) -> dict | None:
    with _lab_jobs_lock:
        job = _lab_jobs.get(job_id)
        if job is None:
            return None
        return {
            "job_id": job_id, "total": job["total"], "done": job["done"],
            "finished": job["done"] >= job["total"],
            "results": [s for s in job["slots"] if s is not None],
        }
