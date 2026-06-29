"""LLM routing — Groq (primary) + OpenRouter (secondary / arbitrary model)."""

import logging
import time

from groq import RateLimitError as GroqRateLimitError
from openai import RateLimitError as OpenAIRateLimitError

from llm.clients.clients import (
    _LLM_TIMEOUT_S,
    _get_provider_key,
    _key_cache,
    _key_lock,
    groq_client,
    huggingface_client,
    opencode_client,
    openrouter_client,
)
from llm.utils.llm_helpers import (
    _RECOVERABLE_ERRORS,
    _SEED_FALLBACK_CHAIN,
    _SEED_MODELOS,
    _VISION_MODEL,
    EmptyContentError,
    _default_models,
    _fallback_chain,
    _resolve_primary,
    _retry_delay,
    effective_llm_config,
)

# ── Re-export everything external callers depend on ───────────────────────────
# Tests, catalog_refresh, admin router, and all llm/*_router.py files import
# from llm.router directly.  Keep these names available at module level so no
# caller needs to change its import path.
__all__ = [
    "EmptyContentError",
    "_RECOVERABLE_ERRORS",
    "_SEED_FALLBACK_CHAIN",
    "_SEED_MODELOS",
    "_VISION_MODEL",
    "_chat",
    "_default_models",
    "_fallback_chain",
    "_get_provider_key",
    "_key_cache",
    "_key_lock",
    "_resolve_primary",
    "_retry_delay",
    "effective_llm_config",
    "generar_texto",
    "generar_texto_with_model",
    "generar_vision",
    "groq_client",
    "huggingface_client",
    "opencode_client",
    "openrouter_client",
    "time",
]

logger = logging.getLogger(__name__)


def _chat(
    provider: str,
    model_id: str,
    prompt: str,
    max_tokens: int,
    extra: dict,
    timeout: float | None = None,
) -> str:
    msgs = [{"role": "user", "content": prompt}]
    key = _get_provider_key(provider)
    if provider == "groq":
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = groq_client.with_options(**opts) if opts else groq_client
        # Groq models support up to 8192 output tokens. Previous cap at 3500
        # truncated HTML resources mid-script, breaking interactivity.
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_completion_tokens=min(max_tokens, 8192), **extra
        )
    elif provider == "opencode":
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = opencode_client.with_options(**opts) if opts else opencode_client
        call_extra = dict(extra)
        # Los modelos DeepSeek "thinking" (p.ej. deepseek-v4-pro) gastan el
        # presupuesto de tokens en reasoning y devuelven `content` vacío en
        # prompts largos (código) → EmptyContentError. Desactivar el thinking
        # salvo override explícito hace que emitan la respuesta en `content`.
        if "deepseek" in model_id and "extra_body" not in call_extra:
            call_extra["extra_body"] = {"thinking": {"type": "disabled"}}
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **call_extra
        )
    elif provider == "huggingface":
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = huggingface_client.with_options(**opts) if opts else huggingface_client
        r = client.chat.completions.create(model=model_id, messages=msgs, max_tokens=max_tokens, **extra)
    else:
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = openrouter_client.with_options(**opts) if opts else openrouter_client
        call_extra = dict(extra)
        if "deepseek" in model_id and "extra_body" not in call_extra:
            call_extra["extra_body"] = {"thinking": {"type": "disabled"}}
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **call_extra
        )
    content = r.choices[0].message.content if r.choices else None
    if not content or not content.strip():
        # Some reasoning models return reasoning_content separately and leave
        # `content` empty; treat that as a recoverable failure so the fallback
        # chain advances to the next model.
        raise EmptyContentError(f"Empty content from {provider}/{model_id}")
    return content


def generar_texto(
    prompt: str,
    tarea: str,
    max_tokens: int = 3000,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str:
    """Route a task to its model and walk the per-task fallback chain on any
    recoverable API error (rate-limit, 402 insufficient credit, provider 5xx,
    Crucible/sub-host failures). The chain ends in a Groq model that almost
    always responds within the free tier. `llm_config` carries per-user model/
    timeout overrides for the primary attempt. `enabled_models` restricts overrides
    to models the user has explicitly enabled (system defaults always pass)."""
    primary, timeout = _resolve_primary(tarea, llm_config, enabled_models=enabled_models)
    chain: list[tuple[str, str, dict]] = [primary, *_fallback_chain(tarea, llm_config)]

    last_err: Exception | None = None
    prev_provider: str | None = None
    for i, (proveedor, model_id, extra) in enumerate(chain):
        role = "primary" if i == 0 else f"fallback {i}/{len(chain) - 1}"
        if i > 0:
            backoff = _retry_delay(last_err, prev_provider, proveedor, i)
            logger.info(
                "Task '%s' switching to %s → %s/%s (backoff %.1fs)",
                tarea,
                role,
                proveedor,
                model_id,
                backoff,
            )
            if backoff:
                time.sleep(backoff)
        try:
            return _chat(proveedor, model_id, prompt, max_tokens, extra, timeout)
        except _RECOVERABLE_ERRORS as exc:
            last_err = exc
            prev_provider = proveedor
            next_step = (
                f"{chain[i + 1][0]}/{chain[i + 1][1]}"
                if i + 1 < len(chain)
                else "<chain exhausted>"
            )
            logger.warning(
                "Task '%s' %s %s/%s failed (%s). Next: %s.",
                tarea,
                role,
                proveedor,
                model_id,
                type(exc).__name__,
                next_step,
            )
    raise last_err or RuntimeError("All LLM fallbacks failed")


def generar_texto_with_model(
    prompt: str, model_id: str, provider: str, max_tokens: int = 4000
) -> str:
    """Call an arbitrary model on the given provider (groq or openrouter)."""
    from llm.utils.llm_helpers import _FALLBACK_OR_MODEL

    key = _get_provider_key(provider)
    msgs = [{"role": "user", "content": prompt}]
    try:
        if provider == "groq":
            client = groq_client.with_options(api_key=key) if key else groq_client
            response = client.chat.completions.create(
                model=model_id,
                messages=msgs,
                max_completion_tokens=max_tokens,
            )
        elif provider == "opencode":
            client = opencode_client.with_options(api_key=key) if key else opencode_client
            response = client.chat.completions.create(
                model=model_id,
                messages=msgs,
                max_tokens=max_tokens,
            )
        else:
            client = openrouter_client.with_options(api_key=key) if key else openrouter_client
            response = client.chat.completions.create(
                model=model_id,
                messages=msgs,
                max_tokens=max_tokens,
            )
        return response.choices[0].message.content

    except (GroqRateLimitError, OpenAIRateLimitError):
        logger.warning(
            "Rate limit on model='%s' provider='%s'; falling back to %s",
            model_id,
            provider,
            _FALLBACK_OR_MODEL,
        )
        fb_key = _get_provider_key("openrouter")
        fb_client = openrouter_client.with_options(api_key=fb_key) if fb_key else openrouter_client
        response = fb_client.chat.completions.create(
            model=_FALLBACK_OR_MODEL,
            messages=msgs,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


def generar_vision(messages: list[dict], max_tokens: int = 1024) -> str:
    """Multi-turn messages with image_url content blocks for RAG image analysis."""
    key = _get_provider_key("groq")
    client = groq_client.with_options(api_key=key) if key else groq_client
    response = client.chat.completions.create(
        model=_VISION_MODEL,
        messages=messages,
        max_completion_tokens=max_tokens,
        timeout=_LLM_TIMEOUT_S,
    )
    return response.choices[0].message.content
