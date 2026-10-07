"""Plan del OVA (qué recursos por fase) con el motor de decisión, sin LLM de texto.

Una sola llamada System One (Laya/Jev) con 50 preguntas `noul` — «¿este recurso
encaja con el concepto?» — y se toman los `per_phase` más probables de cada fase
(orden del catálogo = progresión cognitiva). Sustituye a la descomposición con LLM
del concierge (4K tokens, segundos) por ~100 ms. Con backend `rules` devuelve
None y el concierge sigue con su camino de siempre.
"""

from __future__ import annotations

import os
import time

import httpx
import structlog

from ova_engine.decision import _backend, _endpoint

logger = structlog.get_logger(__name__)

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")
_GOAL = {
    "engage": "despertar curiosidad y activar ideas previas",
    "explore": "que el estudiante manipule y descubra patrones antes de la teoría",
    "explain": "formalizar la teoría con claridad",
    "elaborate": "aplicar a problemas reales y transferir",
    "evaluate": "comprobar el logro del aprendizaje",
}


def _catalog() -> dict[str, dict[int, str]]:
    from prometheus.nodes.repair import _recursos_meta_for

    return {p: {int(k): v["tipo"] for k, v in _recursos_meta_for(p).items()} for p in PHASES}


def plan_ova(concept: str, contexto: str = "", per_phase: int = 3, timeout: float = 6.0) -> dict | None:
    backend = _backend()
    if backend == "planner-atributos" or (backend in ("laya", "jev") and os.getenv("OVA_PLANNER_MODE") == "atributos"):
        from ova_engine.planner_attrs import plan_by_attributes

        return plan_by_attributes(concept, mode=os.getenv("OVA_PLANNER_PROFILE", "hibrido"), per_phase=per_phase)
    return plan_ova_global(concept, contexto, per_phase, timeout)


def plan_ova_global(concept: str, contexto: str = "", per_phase: int = 3, timeout: float = 6.0) -> dict | None:
    """Planner original: 50 preguntas `noul` globales (se conserva para comparar en el bench)."""
    if _backend() not in ("laya", "jev"):
        return None
    catalog = _catalog()
    questions = {
        f"{p}_{n}": {
            "type": "noul",
            "instructions": (
                f"¿El recurso «{name}» es una buena forma de {_GOAL[p]} sobre «{concept}»?"
            ),
        }
        for p, items in catalog.items()
        for n, name in items.items()
    }
    from ova_engine.domain_context import domain_for

    state = f"OVA 5E para {domain_for(concept, contexto).para_state} sobre «{concept}»."
    if contexto:
        state += f"\nMaterial del docente: {contexto[:1500]}"
    url, headers, extra = _endpoint()
    t0 = time.monotonic()
    try:
        r = httpx.post(url, json={"state": state, "questions": questions, **extra}, headers=headers, timeout=timeout)
        r.raise_for_status()
        answers = r.json().get("answers") or {}
    except Exception as exc:
        logger.warning("ova planner failed; concierge fallback", error=str(exc)[:200])
        return None
    plan = {}
    for p, items in catalog.items():
        scored = []
        for n in items:
            a = answers.get(f"{p}_{n}") or {}
            prob = a.get("noul", a.get("probability"))
            if isinstance(prob, (int, float)):
                scored.append((float(prob), n))
        if len(scored) < per_phase:
            return None
        best = sorted(scored, reverse=True)[:per_phase]
        plan[p] = sorted(n for _, n in best)
    logger.info("ova planner", ms=round((time.monotonic() - t0) * 1000), plan=plan)
    return plan
