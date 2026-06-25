"""Editor de Coherencia 5E — LangGraph node (EN-016).

Revisa el arco completo del OVA antes del ensamble, detecta inconsistencias
pedagógicas entre fases y aplica parches ligeros de texto. Noop cuando
OVA_EDITOR != "1". Best-effort: fallo → coherence_report={} sin bloquear.
"""

import json
import logging
import re

from core.config import settings
from llm.router import generar_texto
from prometheus.engine.state import OvaGenerationState

logger = logging.getLogger(__name__)

_PROMPT_TMPL = """\
[ROL] Editor de coherencia pedagógica 5E.
[TAREA] Revisa el arco completo de este OVA (5 fases Engage-Explore-Explain-Elaborate-Evaluate) \
y detecta inconsistencias pedagógicas entre fases.
Evalúa:
1. Terminología/analogía consistente entre fases (¿la misma metáfora del Engage se retoma?)
2. Progresión cognitiva 5E (hook→manipular→formalizar→aplicar→evaluar) sin saltos
3. Sin repeticiones ni contradicciones entre recursos
4. Transiciones coherentes de una fase a la siguiente
[RECURSOS_OVA]
{recursos_json}
[RESPUESTA] Solo JSON válido:
{{"hallazgos": ["hallazgo 1"], "parches": [{{"phase": "explore", "buscar": "texto exacto a reemplazar", "reemplazar": "texto corregido"}}]}}
Parches: solo cambios de texto mínimos. Si no hay problemas, parches=[]."""


def _parse_editor_response(response: str) -> dict:
    try:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if not match:
            return {}
        data = json.loads(match.group())
        return {
            "hallazgos": list(data.get("hallazgos", [])),
            "parches": list(data.get("parches", [])),
        }
    except Exception:  # noqa: BLE001
        logger.debug("editor parse failed; returning empty report")
        return {}


def _apply_patches(results: list[dict], parches: list[dict]) -> None:
    """Apply text patches in-place. Anti-regression: skip if HTML shrinks below 80%."""
    phase_index: dict[str, list[dict]] = {}
    for r in results:
        phase_index.setdefault(r.get("phase", ""), []).append(r)

    for patch in parches:
        phase = patch.get("phase", "")
        buscar = patch.get("buscar", "")
        reemplazar = patch.get("reemplazar", "")
        if not buscar or phase not in phase_index:
            continue
        for r in phase_index[phase]:
            html_viejo = r.get("html", "")
            if buscar not in html_viejo:
                continue
            html_nuevo = html_viejo.replace(buscar, reemplazar, 1)
            if len(html_nuevo) >= len(html_viejo) * 0.8:
                r["html"] = html_nuevo
            break


def editor_node(state: OvaGenerationState) -> dict:
    """Nodo LangGraph: revisa coherencia 5E del arco completo.

    Noop cuando ova_editor != "1" (DB config o env). Best-effort: fallo →
    coherence_report={}. Parches aplicados in-place en results.
    """
    from prometheus.config.nodes_config import get_nodes_config

    nc = get_nodes_config()
    if str(nc.get("ova_editor", settings.ova_editor)).strip() != "1":
        return {}

    try:
        results = state.get("results", [])
        phase_order = state.get("phase_order", [])

        def _sort_key(r: dict) -> tuple:
            phase = r.get("phase", "")
            try:
                idx = phase_order.index(phase)
            except ValueError:
                idx = len(phase_order)
            return (idx, r.get("resource_type", 0))

        extracto = [
            {
                "phase": r.get("phase", ""),
                "title": r.get("title", ""),
                "extracto": r.get("html", "")[:600],
            }
            for r in sorted(results, key=_sort_key)
        ]

        prompt = _PROMPT_TMPL.format(recursos_json=json.dumps(extracto, ensure_ascii=False))
        response = generar_texto(
            prompt, "texto", 1024, state.get("llm_config", {}), state.get("enabled_models", [])
        )
        report = _parse_editor_response(response)

        parches = report.get("parches", [])
        if parches:
            _apply_patches(results, parches)

        logger.info(
            "Editor: %d hallazgos, %d parches", len(report.get("hallazgos", [])), len(parches)
        )
        return {"coherence_report": report}

    except Exception:  # noqa: BLE001
        logger.exception("editor_node failed; continuing without coherence_report")
        return {"coherence_report": {}}
