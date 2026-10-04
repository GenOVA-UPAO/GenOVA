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


# Errores de Oracle que los modelos repiten (QA en producción, 2026-10-04): se fijan
# como hechos para el texto y para el revisor (ambos pasan por aquí).
ORACLE_FACTS = (
    "Hechos de Oracle que NO puedes contradecir: "
    "(1) ante un interbloqueo (ORA-00060) Oracle revierte solo la SENTENCIA que lo detecta, "
    "no la transacción ni elige «víctima»; la sesión decide luego COMMIT o ROLLBACK; "
    "(2) un SELECT normal no bloquea filas (lectura consistente con undo); solo SELECT ... FOR UPDATE las bloquea; "
    "(3) Oracle no usa BEGIN TRANSACTION: la transacción empieza con la primera DML y termina con COMMIT/ROLLBACK; "
    "(4) SAVEPOINT marca un punto y ROLLBACK TO SAVEPOINT revierte hasta él; ROLLBACK sin más revierte toda la transacción; "
    "(5) las vistas V$ (V$LOCK, V$SESSION) son dinámicas de rendimiento, no del diccionario; "
    "(6) jerarquía de almacenamiento: tablespace → segmento → extensión → bloque; "
    "(7) SERIALIZABLE puede lanzar ORA-08177 (can't serialize access). "
    "No uses sintaxis ni comportamientos de SQL Server, MySQL o PostgreSQL.\n"
)

_SYSTEM_RULES = (
    ORACLE_FACTS
    + "Escribe SOLO el contenido textual en español neutro, preciso y fiel al concepto. "
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


def _coerce_root(data, schema: dict):
    """Repara las dos raíces equivocadas más comunes de los modelos cuando el schema
    pide un objeto: `[{...}]` (objeto envuelto en lista) y `[...]` (la lista de la
    única propiedad array, p. ej. `revision` del revisor, sin su objeto)."""
    if schema.get("type") != "object" or not isinstance(data, list):
        return data
    if len(data) == 1 and isinstance(data[0], dict):
        return data[0]
    props = schema.get("properties", {})
    if len(props) == 1:
        (name, sub), = props.items()
        if sub.get("type") == "array":
            return {name: data}
    return data


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
            data = _coerce_root(parse_json(raw), schema)
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


def generate_plain(
    prompt: str,
    *,
    llm_config=None,
    enabled_models=None,
    deadline: float | None = None,
    max_tokens: int = 700,
) -> str:
    """Texto libre (sin schema) con el mismo backend que `generate_json`: lo usa el
    podcast, que no tiene plantilla. Con `OVA_TEXT_BACKEND=local` va a Ollama."""
    if os.getenv("OVA_TEXT_BACKEND", "router").strip().lower() == "local":
        url = os.getenv("OVA_LOCAL_LLM_URL", "http://localhost:11435").rstrip("/")
        r = httpx.post(
            f"{url}/api/chat",
            json={
                "model": os.getenv("OVA_LOCAL_LLM_MODEL", "qwen3:8b"),
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "think": False,
                "options": {"num_predict": max_tokens, "temperature": 0.6},
            },
            timeout=float(os.getenv("OVA_LOCAL_LLM_TIMEOUT", "240")),
        )
        r.raise_for_status()
        return r.json()["message"]["content"]
    from llm.router import generar_texto

    return generar_texto(prompt, "texto", max_tokens, llm_config, enabled_models, deadline=deadline)
