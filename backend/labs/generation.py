"""Background generation workers and job store for Labs."""
import json
import threading
import time
import uuid
from typing import Optional

from agents.llm_router import generar_texto, generar_texto_with_model
from agents.utils import parse_json, strip_markdown, SCORM_JS
from database import SessionLocal
from labs.catalog import quality_check_html
from labs.prompt_utils import CONCEPT_PH, ENGAGE_CODE, ENGAGE_PODCAST, EXPLORE_CODE
from models import LabResult

# ──────────────────────────────────────────────────────────────
#  In-memory job store
# ──────────────────────────────────────────────────────────────
_lab_jobs: dict[str, dict] = {}
_lab_jobs_lock = threading.Lock()


def _podcast_html(concept: str, monologue: str) -> str:
    return (
        f'<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        f'<title>Micro-Podcast · {concept}</title><style>'
        "*{box-sizing:border-box;margin:0;padding:0}"
        "body{font-family:'Georgia',serif;background:#1a1a2e;color:#eee;"
        "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}"
        ".card{background:#16213e;border-radius:16px;padding:40px;max-width:620px;"
        "width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)}"
        ".tag{font-size:.8rem;color:#a78bfa;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}"
        "h2{font-size:1.8rem;margin-bottom:28px;color:#fff}"
        ".monologue{font-size:1.1rem;line-height:1.9;color:#d1d5db;"
        "border-left:3px solid #7c3aed;padding-left:20px;margin:20px 0}"
        ".btn{background:#7c3aed;color:#fff;border:none;padding:13px 30px;"
        "border-radius:8px;font-size:1rem;cursor:pointer;margin-top:20px;transition:background .2s}"
        ".btn:hover{background:#6d28d9}.btn.done{background:#059669}"
        f'</style></head><body><div class="card">'
        f'<p class="tag">🎙️ Micro-Podcast · Fase ENGAGE</p><h2>{concept}</h2>'
        f'<div class="monologue">{monologue}</div>'
        f'<button class="btn" id="btn" onclick="finish()">He terminado de escuchar ✓</button>'
        f'</div><script>function finish(){{document.getElementById("btn").className="btn done";'
        f'document.getElementById("btn").textContent="¡Completado! ✓";_scormComplete();}}'
        f"{SCORM_JS}</script></body></html>"
    )


def _generate_one(
    phase: str, resource_type: int, concept: str,
    prompt_text: str, model_id: str, provider: str,
) -> tuple[Optional[str], Optional[dict], Optional[str]]:
    """Run one resource generation. Returns (html, raw_json, error)."""
    effective = prompt_text.replace(CONCEPT_PH, concept)
    try:
        if phase == "engage":
            if resource_type in ENGAGE_CODE:
                return strip_markdown(generar_texto_with_model(effective, model_id, provider, max_tokens=4000)), None, None
            if resource_type in ENGAGE_PODCAST:
                mono = generar_texto_with_model(effective, model_id, provider, max_tokens=600)
                return _podcast_html(concept, mono), {"monologue": mono}, None
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
        return None, None, str(exc)


def _worker(
    job_id: str, slot: int,
    phase: str, resource_type: int, concept: str,
    prompt_text: str, model_id: str, provider: str,
    user_id: Optional[str],
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
        error = str(exc)
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
    model_configs: list[dict], user_id: Optional[str],
) -> str:
    """Spawn one worker thread per model_config; return job_id."""
    job_id = str(uuid.uuid4())
    with _lab_jobs_lock:
        _lab_jobs[job_id] = {"total": len(model_configs), "done": 0, "slots": [None] * len(model_configs)}
    for i, cfg in enumerate(model_configs):
        threading.Thread(
            target=_worker,
            args=(job_id, i, phase, resource_type, concept,
                  cfg["prompt_text"], cfg["model_id"], cfg["provider"], user_id),
            daemon=True,
        ).start()
    return job_id


def get_job_results(job_id: str) -> Optional[dict]:
    with _lab_jobs_lock:
        job = _lab_jobs.get(job_id)
        if job is None:
            return None
        return {
            "job_id": job_id, "total": job["total"], "done": job["done"],
            "finished": job["done"] >= job["total"],
            "results": [s for s in job["slots"] if s is not None],
        }
