"""Capa de TEXTO: el único sitio donde el motor llama a un LLM.

Pide un JSON que cumpla el schema de la plantilla, lo valida y, si falla, hace
UN reintento con los errores de validación como feedback.
Si el texto sigue fallando validación tras el reintento:
  - En router: reintenta con el siguiente modelo de la cadena del router.
  - Si se agota la cadena: marca el recurso como fallido con mensaje claro para
    "Revisar y reintentar" (sin generar HTML con LLM).

Backends (`OVA_TEXT_BACKEND`):
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


def _local(
    prompt: str,
    schema: dict,
    max_tokens: int,
    temperature: float = 0.6,
    timeout: float | None = None,
    model: str | None = None,
) -> str:
    url = os.getenv("OVA_LOCAL_LLM_URL", "http://localhost:11435").rstrip("/")
    model = model or os.getenv("OVA_LOCAL_LLM_MODEL", "qwen3:8b")
    r = httpx.post(
        f"{url}/api/chat",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "format": schema,
            "stream": False,
            "think": False,
            "options": {"num_predict": max_tokens, "temperature": temperature},
        },
        timeout=timeout or float(os.getenv("OVA_LOCAL_LLM_TIMEOUT", "240")),
    )
    r.raise_for_status()
    return r.json()["message"]["content"]


def _router(
    prompt: str,
    max_tokens: int,
    llm_config=None,
    enabled_models=None,
    deadline: float | None = None,
) -> str:
    from llm.router import generar_texto

    return generar_texto(
        prompt, "texto", max_tokens, llm_config, enabled_models, deadline=deadline, thinking=False
    )


def _resolve_candidate_models(backend: str, llm_config, enabled_models):
    if backend != "router":
        return [None]
    try:
        from llm.router import (
            _fallback_chain,
            _get_provider_key,
            _resolve_primary,
            own_keys,
            usable_chain,
        )

        primary, _ = _resolve_primary(
            "texto", llm_config, enabled_models=enabled_models
        )
        user_keys = own_keys(llm_config)
        chain = usable_chain(
            "texto",
            [primary, *_fallback_chain("texto", llm_config)],
            user_keys,
            _get_provider_key,
        )
        if chain:
            return list(chain)
    except Exception as exc:
        logger.debug("could not resolve router chain; using default router", error=str(exc))
    return [None]


def _invoke_backend(
    ask: str,
    schema: dict,
    backend: str,
    model_entry: tuple | None,
    max_tokens: int,
    temperature: float | None,
    timeout: float | None,
    model: str | None,
    llm_config,
    enabled_models,
    deadline: float | None,
) -> str:
    if backend == "local":
        return _local(
            ask,
            schema,
            max_tokens,
            0.6 if temperature is None else temperature,
            timeout,
            model,
        )
    cfg = llm_config
    if model_entry is not None:
        proveedor, model_id, extra = model_entry
        cfg = {
            **(llm_config or {}),
            "texto": {
                "provider": proveedor,
                "model_id": model_id,
                **(extra or {}),
                "fallbacks": [],
            },
        }
    return _router(ask, max_tokens, cfg, enabled_models, deadline)


def _run_model_attempts(
    model_entry: tuple | None,
    full: str,
    schema: dict,
    backend: str,
    attempts: int,
    max_tokens: int,
    temperature: float | None,
    timeout: float | None,
    model: str | None,
    llm_config,
    enabled_models,
    deadline: float | None,
) -> tuple[dict | None, list[str]]:
    errors: list[str] = []
    for attempt in range(attempts):
        ask = full
        if errors:
            ask += (
                "\n\nTu respuesta anterior no cumplía el schema. Corrige estos errores y "
                "devuelve el JSON completo:\n- " + "\n- ".join(errors)
            )
        try:
            raw = _invoke_backend(
                ask,
                schema,
                backend,
                model_entry,
                max_tokens,
                temperature,
                timeout,
                model,
                llm_config,
                enabled_models,
                deadline,
            )
        except Exception as call_err:
            logger.warning(
                "ova text model call failed",
                error=str(call_err)[:200],
                model_entry=model_entry[:2] if model_entry else None,
            )
            errors = [f"fallo en llamada al modelo: {str(call_err)[:100]}"]
            continue

        try:
            data = parse_json(raw)
        except Exception:
            errors = ["la respuesta no es JSON válido"]
            continue
        errors = validate(data, schema)[:8]
        if not errors:
            return data, []
        logger.warning(
            "ova text schema errors",
            attempt=attempt,
            errors=errors[:3],
            model=model_entry[:2] if model_entry else None,
        )
    return None, errors


def generate_json(
    prompt: str,
    schema: dict,
    *,
    llm_config=None,
    enabled_models=None,
    deadline: float | None = None,
    max_tokens: int = 6000,
    temperature: float | None = None,
    attempts: int = 2,
    timeout: float | None = None,
    model: str | None = None,
) -> dict:
    backend = os.getenv("OVA_TEXT_BACKEND", "router").strip().lower()
    full = _full_prompt(prompt, schema)
    models_to_try = _resolve_candidate_models(backend, llm_config, enabled_models)

    all_errors: list[str] = []
    for model_entry in models_to_try:
        data, errors = _run_model_attempts(
            model_entry,
            full,
            schema,
            backend,
            attempts,
            max_tokens,
            temperature,
            timeout,
            model,
            llm_config,
            enabled_models,
            deadline,
        )
        if data is not None:
            return data
        all_errors = errors
        if model_entry is not None and len(models_to_try) > 1:
            logger.warning(
                "ova text model failed schema after retries; trying next model in chain",
                provider=model_entry[0],
                model_id=model_entry[1],
            )

    detail = "; ".join(all_errors) or "texto inválido"
    raise TextGenerationError(
        f"Revisar y reintentar: error de esquema al generar el contenido ({detail})"
    )
