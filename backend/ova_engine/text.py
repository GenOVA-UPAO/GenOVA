"""Capa de TEXTO: el único sitio donde el motor llama a un LLM.

Pide un JSON que cumpla el schema de la plantilla, lo valida y, si falla, hace
UN reintento con los errores de validación como feedback. Backends
(`OVA_TEXT_BACKEND`):
  - router (por defecto) `llm.router.generar_texto` (OpenRouter/Groq/... con la
           cadena de respaldos, cassettes y presupuesto existentes).
  - local  Ollama (`OVA_LOCAL_LLM_URL`, `OVA_LOCAL_LLM_MODEL`) con salida
           estructurada nativa (`format` = JSON Schema). Simulación local sin coste.
"""

from __future__ import annotations

import json
import os

import httpx
import structlog
from llm.utils.utils import parse_json
from ova_engine.schema import validate

logger = structlog.get_logger(__name__)


class TextGenerationError(RuntimeError):
    pass


_SYSTEM_RULES = (
    "Escribe SOLO el contenido textual en español neutro, preciso y fiel al concepto. "
    "No escribas HTML, CSS, JavaScript ni markdown. Responde únicamente con un JSON "
    "válido que cumpla exactamente este JSON Schema:\n"
)


def _full_prompt(prompt: str, schema: dict) -> str:
    return f"{prompt}\n\n{_SYSTEM_RULES}{json.dumps(schema, ensure_ascii=False)}"


def _local(prompt: str, schema: dict, max_tokens: int) -> str:
    url = os.getenv("OVA_LOCAL_LLM_URL", "http://localhost:11435").rstrip("/")
    model = os.getenv("OVA_LOCAL_LLM_MODEL", "qwen3:8b")
    r = httpx.post(
        f"{url}/api/chat",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "format": schema,
            "stream": False,
            "think": False,
            "options": {"num_predict": max_tokens, "temperature": 0.6},
        },
        timeout=float(os.getenv("OVA_LOCAL_LLM_TIMEOUT", "240")),
    )
    r.raise_for_status()
    return r.json()["message"]["content"]


def _router(prompt: str, max_tokens: int, llm_config, enabled_models, deadline) -> str:
    from llm.router import generar_texto

    return generar_texto(
        prompt, "texto", max_tokens, llm_config, enabled_models, deadline=deadline, thinking=False
    )


def generate_json(
    prompt: str,
    schema: dict,
    *,
    llm_config=None,
    enabled_models=None,
    deadline: float | None = None,
    max_tokens: int = 6000,
) -> dict:
    backend = os.getenv("OVA_TEXT_BACKEND", "router").strip().lower()
    full = _full_prompt(prompt, schema)
    errors: list[str] = []
    for attempt in range(2):
        ask = full
        if errors:
            ask += (
                "\n\nTu respuesta anterior no cumplía el schema. Corrige estos errores y "
                "devuelve el JSON completo:\n- " + "\n- ".join(errors)
            )
        raw = (
            _local(ask, schema, max_tokens)
            if backend == "local"
            else _router(ask, max_tokens, llm_config, enabled_models, deadline)
        )
        try:
            data = parse_json(raw)
        except Exception:
            errors = ["la respuesta no es JSON válido"]
            continue
        errors = validate(data, schema)[:8]
        if not errors:
            return data
        logger.warning("ova text schema errors", attempt=attempt, errors=errors[:3])
    raise TextGenerationError("; ".join(errors) or "texto inválido")
