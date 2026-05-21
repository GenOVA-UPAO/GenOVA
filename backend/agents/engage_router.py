import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.engage_prompts import RECURSOS_META, prompt_html, prompt_simulador, prompt_texto
from agents.llm_router import generar_texto
from agents.utils import parse_json, strip_markdown, SCORM_JS
from auth.dependencies import get_current_user
from database import get_db
from labs.service import get_active_prompt
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_TAREA_POR_RECURSO = {
    1: "texto", 2: "texto", 3: "texto", 4: "texto", 5: "texto",
    6: "texto", 7: "texto", 8: "texto", 9: "orquestador", 10: "codigo",
}


def _podcast_html(concept: str, monologue: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Micro-Podcast · {concept}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Georgia',serif;background:#1a1a2e;color:#eee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
.card{{background:#16213e;border-radius:16px;padding:40px;max-width:620px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)}}
.tag{{font-size:.8rem;color:#a78bfa;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}}
h2{{font-size:1.8rem;margin-bottom:28px;color:#fff}}
.wave{{display:flex;align-items:center;gap:4px;height:60px;margin:24px 0}}
.bar{{width:5px;border-radius:4px;background:#7c3aed;animation:wave 1.2s ease-in-out infinite}}
.bar:nth-child(2){{height:20px;animation-delay:.1s}}.bar:nth-child(3){{height:38px;animation-delay:.2s}}
.bar:nth-child(4){{height:55px;animation-delay:.3s}}.bar:nth-child(5){{height:38px;animation-delay:.4s}}
.bar:nth-child(6){{height:20px;animation-delay:.5s}}.bar:nth-child(7){{height:12px;animation-delay:.6s}}
@keyframes wave{{0%,100%{{transform:scaleY(.3)}}50%{{transform:scaleY(1)}}}}
.monologue{{font-size:1.1rem;line-height:1.9;color:#d1d5db;border-left:3px solid #7c3aed;padding-left:20px;margin:20px 0}}
.btn{{background:#7c3aed;color:#fff;border:none;padding:13px 30px;border-radius:8px;font-size:1rem;cursor:pointer;margin-top:20px;transition:background .2s}}
.btn:hover{{background:#6d28d9}}
.btn.done{{background:#059669}}
.meta{{color:#9ca3af;font-size:.85rem;margin-top:14px}}
</style></head>
<body><div class="card">
<p class="tag">🎙️ Micro-Podcast · Fase ENGAGE</p>
<h2>{concept}</h2>
<div class="wave">
  <div class="bar" style="height:12px"></div><div class="bar"></div><div class="bar"></div>
  <div class="bar"></div><div class="bar"></div><div class="bar"></div>
  <div class="bar" style="height:12px"></div>
</div>
<div class="monologue">{monologue}</div>
<button class="btn" id="btn" onclick="finish()">He terminado de escuchar ✓</button>
<p class="meta">⏱ Duración estimada: 45 segundos</p>
</div>
<script>
function finish(){{document.getElementById('btn').className='btn done';document.getElementById('btn').textContent='¡Completado! ✓';_scormComplete();}}
{SCORM_JS}
</script></body></html>"""


class GenerateEngageRequest(BaseModel):
    resource_type: int
    concept: str


@router.get("/recursos")
def list_recursos():
    return {
        "fase": "ENGAGE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate")
def generate_engage_resource(
    payload: GenerateEngageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = payload.resource_type
    concept = payload.concept.strip()

    if n not in RECURSOS_META:
        raise HTTPException(status_code=400, detail="resource_type debe estar entre 1 y 10.")
    if len(concept) < 3:
        raise HTTPException(status_code=400, detail="El concepto debe tener al menos 3 caracteres.")

    meta = RECURSOS_META[n]

    # Production override: use active prompt version from DB if available
    _active_prompt = get_active_prompt("engage", n, db)

    def _step1_prompt() -> str:
        if _active_prompt:
            return _active_prompt.replace("{concept}", concept)
        return None  # caller falls back to hardcoded

    try:
        # Resource 10: direct code generation (no JSON step)
        if n == 10:
            p = _step1_prompt() or prompt_simulador(concept)
            html = strip_markdown(generar_texto(p, "codigo", max_tokens=4000))
            return {**meta, "resource_type": n, "concepto": concept, "raw_json": None, "html_content": html}

        # Resource 3 (podcast): plain text → styled HTML wrapper
        if n == 3:
            p = _step1_prompt() or prompt_texto(n, concept)
            monologue = generar_texto(p, "texto", max_tokens=500)
            return {**meta, "resource_type": n, "concepto": concept,
                    "raw_json": {"monologue": monologue},
                    "html_content": _podcast_html(concept, monologue)}

        # Resources 1,2,4-9: Step 1 = text/JSON, Step 2 = HTML via code agent
        tarea = _TAREA_POR_RECURSO[n]
        p = _step1_prompt() or prompt_texto(n, concept)
        raw_text = generar_texto(p, tarea, max_tokens=2000)

        try:
            json_data = parse_json(raw_text)
        except Exception:
            logger.warning("JSON parse failed for resource %d, using raw text", n)
            json_data = {"contenido": raw_text}

        json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
        html = strip_markdown(generar_texto(prompt_html(n, concept, json_str), "codigo", max_tokens=4000))

        return {**meta, "resource_type": n, "concepto": concept, "raw_json": json_data, "html_content": html}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error generating ENGAGE resource %d: %s", n, exc)
        raise HTTPException(status_code=500, detail=f"Error al generar el recurso: {exc}")
