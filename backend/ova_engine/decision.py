"""Motor de decisión: elige la ESTRUCTURA de cada recurso, no escribe texto.

Backends (`OVA_DECISION_BACKEND`):
  - rules  (por defecto) reglas deterministas: defaults de la plantilla + ajustes
           por longitud/naturaleza del concepto. Sin red, sin coste.
  - laya   servidor Laya local (`OVA_DECISION_URL`, p. ej. http://localhost:8090),
           protocolo System One (`POST /v1/systemone`).
  - jev    Jev vía OpenRouter (`typesafe/jev-1.13`, `POST /api/alpha/decisions`).

Laya y Jev hablan el MISMO protocolo: preguntas tipadas `choice` / `noul` sobre
un `state`. Cada `Param` de la plantilla se traduce en una pregunta `choice`
(enteros → opciones "3","4",…). Una respuesta por debajo de
`OVA_DECISION_MIN_CONFIDENCE` o un fallo de red cae a las reglas: el motor nunca
bloquea la generación.
"""

from __future__ import annotations

import os
import re
import time

import httpx
import structlog

from ova_engine.contract import Param, TemplateSpec

logger = structlog.get_logger(__name__)

_TIMEOUT_S = 4.0


def _backend() -> str:
    return os.getenv("OVA_DECISION_BACKEND", "rules").strip().lower()


def _min_confidence() -> float:
    try:
        return float(os.getenv("OVA_DECISION_MIN_CONFIDENCE", "0.35"))
    except ValueError:
        return 0.35


def _options(p: Param) -> list[str]:
    if p.choices is not None:
        return [str(c) for c in p.choices]
    if p.min is not None and p.max is not None and p.max - p.min <= 12:
        return [str(n) for n in range(p.min, p.max + 1)]
    return []


def build_questions(spec: TemplateSpec) -> dict:
    questions = {}
    for p in spec.params:
        opts = _options(p)
        if len(opts) < 2:
            continue
        questions[p.name] = {
            "type": "choice",
            "instructions": p.help or f"Valor de «{p.name}» para el recurso {spec.title}",
            "criteria": {o: f"{p.name} = {o}" for o in opts},
        }
    return questions


def build_state(spec: TemplateSpec, concept: str, contexto: str = "") -> str:
    state = (
        f"Recurso educativo «{spec.title}» (fase 5E {spec.phase}) para enseñar "
        f"«{concept}» a universitarios del curso Sistemas de Gestión de Base de Datos."
    )
    if contexto:
        state += f"\nMaterial del docente (extracto): {contexto[:1500]}"
    return state


# ---------------------------------------------------------------- reglas


def rules_decide(spec: TemplateSpec, concept: str, contexto: str = "") -> dict:
    """Defaults de la plantilla con dos ajustes baratos y predecibles:
    conceptos compuestos («A y B», listas) piden más ítems; con material RAG
    largo se sube un escalón la cantidad (hay más que contar)."""
    words = len(re.findall(r"\w+", concept))
    compound = bool(re.search(r"\by\b|,|/|\bvs\.?\b", concept, re.IGNORECASE))
    bump = (1 if compound or words > 6 else 0) + (1 if len(contexto) > 2000 else 0)
    decided = {}
    for p in spec.params:
        if p.choices is None and p.max is not None and isinstance(p.default, int):
            decided[p.name] = min(p.max, p.default + bump)
        else:
            decided[p.name] = p.default
    return decided


# ---------------------------------------------------------------- System One


def _endpoint() -> tuple[str, dict, dict]:
    if _backend() == "jev":
        key = os.getenv("OPENROUTER_API_KEY", "")
        url = os.getenv("OVA_DECISION_URL", "https://openrouter.ai/api/alpha/decisions")
        return url, {"Authorization": f"Bearer {key}"}, {
            "model": os.getenv("OVA_DECISION_MODEL", "typesafe/jev-1.13"),
            "provider": {"allow_fallbacks": True, "data_collection": "deny"},
        }
    base = os.getenv("OVA_DECISION_URL", "http://localhost:8090").rstrip("/")
    headers = {}
    if os.getenv("LAYA_API_KEY"):
        headers["Authorization"] = f"Bearer {os.environ['LAYA_API_KEY']}"
    return f"{base}/v1/systemone", headers, {"model": "multilingual"}


def _confidence(answer: dict) -> float:
    # Laya: answer_confidence (prob. de la elegida); Jev: confidence.
    for k in ("answer_confidence", "confidence"):
        if isinstance(answer.get(k), (int, float)):
            return float(answer[k])
    probs = answer.get("probabilities") or {}
    return float(max(probs.values())) if probs else 0.0


def systemone_decide(spec: TemplateSpec, concept: str, contexto: str = "") -> dict:
    questions = build_questions(spec)
    if not questions:
        return {}
    url, headers, extra = _endpoint()
    payload = {"state": build_state(spec, concept, contexto), "questions": questions, **extra}
    t0 = time.monotonic()
    r = httpx.post(url, json=payload, headers=headers, timeout=_TIMEOUT_S)
    r.raise_for_status()
    answers = r.json().get("answers") or {}
    floor = _min_confidence()
    decided = {}
    for name, ans in answers.items():
        if not isinstance(ans, dict) or ans.get("choice") is None:
            continue
        if _confidence(ans) < floor:
            continue
        decided[name] = ans["choice"]
    logger.info(
        "ova decision",
        backend=_backend(),
        key=spec.key,
        ms=round((time.monotonic() - t0) * 1000),
        decided=decided,
        asked=list(questions),
    )
    return decided


# ---------------------------------------------------------------- API


def decide(spec: TemplateSpec, concept: str, contexto: str = "", override: dict | None = None) -> dict:
    """Parámetros finales del recurso. `override` = resource_config del docente:
    lo que el docente fija explícitamente gana sobre cualquier decisión."""
    decided = rules_decide(spec, concept, contexto)
    if _backend() in ("laya", "jev", "planner-atributos"):
        try:
            decided.update(systemone_decide(spec, concept, contexto))
        except Exception as exc:  # red, 5xx, formato: las reglas ya decidieron
            logger.warning("ova decision fallback to rules", key=spec.key, error=str(exc)[:200])
    if override:
        decided.update({k: v for k, v in override.items() if v is not None})
    return spec.resolve_params(decided)
