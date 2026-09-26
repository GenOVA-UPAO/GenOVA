"""LLM routing — Groq (primary) + OpenRouter (secondary / arbitrary model)."""

import time

import structlog
from groq import RateLimitError as GroqRateLimitError
from openai import RateLimitError as OpenAIRateLimitError

from llm.clients.clients import (
    _LLM_TIMEOUT_S,
    _get_provider_key,
    _key_cache,
    _key_lock,
    current_parent,
    groq_client,
    huggingface_client,
    opencode_client,
    openrouter_client,
    traced_openai,
)
from llm.utils.llm_helpers import (
    _RECOVERABLE_ERRORS,
    _SEED_FALLBACK_CHAIN,
    _SEED_MODELOS,
    EmptyContentError,
    LLMBudgetExhaustedError,
    _default_models,
    _fallback_chain,
    _resolve_primary,
    _retry_delay,
    effective_llm_config,
    own_keys,
    with_model_thinking,
    with_thinking_disabled,
)
from llm.utils.vision_models import clean_description, rate_limit_wait, vision_chain

# ── Re-export everything external callers depend on ───────────────────────────
# Tests, catalog_refresh, admin router, and all llm/*_router.py files import
# from llm.router directly.  Keep these names available at module level so no
# caller needs to change its import path.
__all__ = [
    "EmptyContentError",
    "LLMBudgetExhaustedError",
    "_RECOVERABLE_ERRORS",
    "_SEED_FALLBACK_CHAIN",
    "_SEED_MODELOS",
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

logger = structlog.get_logger(__name__)

# Un intento con menos margen que esto no merece arrancarse (budget.py usa el
# mismo umbral para decidir si vale la pena otra llamada: MIN_LLM_SLACK_S=20).
_MIN_ATTEMPT_S = 15.0
# Tiempo reservado para el siguiente modelo de la cadena: un intento no puede
# consumir el presupuesto entero — un modelo primario lento debe poder degradar
# a un fallback rápido en vez de tumbar el recurso ("All LLM fallbacks failed"
# sin haber probado ni un fallback). Reparto, no presupuesto total.
_FALLBACK_MARGIN_S = 20.0


def _ls_extra(client) -> dict:
    """langsmith_extra para colgar la llamada del trace del job (parent explícito).

    Solo cuando el cliente está envuelto por wrap_openai (`_genova_traced`) y hay un
    job en curso — así el HTML de código (en threads del fan-out) anida igual que los
    nodos secuenciales. Vacío en cualquier otro caso (el cliente crudo no acepta el kw)."""
    if not getattr(client, "_genova_traced", False):
        return {}
    parent = current_parent()
    return {"langsmith_extra": {"parent": parent}} if parent is not None else {}


def _chat_once(
    provider: str,
    model_id: str,
    msgs: list[dict],
    max_tokens: int,
    extra: dict,
    timeout: float | None = None,
    key: str | None = None,
) -> tuple[str, str | None]:
    # La clave propia del usuario, si la hay, va primero; si no, la de plataforma.
    key = key or _get_provider_key(provider)
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
        client = traced_openai(opencode_client.with_options(**opts) if opts else opencode_client)
        call_extra = with_model_thinking(provider, model_id, extra, max_tokens)
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **call_extra, **_ls_extra(client)
        )
    elif provider == "huggingface":
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = traced_openai(
            huggingface_client.with_options(**opts) if opts else huggingface_client
        )
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **extra, **_ls_extra(client)
        )
    else:
        opts = {**({"api_key": key} if key else {}), **({"timeout": timeout} if timeout else {})}
        client = traced_openai(
            openrouter_client.with_options(**opts) if opts else openrouter_client
        )
        call_extra = with_model_thinking(provider, model_id, extra, max_tokens)
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **call_extra, **_ls_extra(client)
        )
    choice = r.choices[0] if r.choices else None
    content = (choice.message.content if choice and choice.message else None) or None
    if not content or not content.strip():
        raise EmptyContentError(f"Empty content from {provider}/{model_id}")
    return content, getattr(choice, "finish_reason", None)


# Continuación de salidas cortadas por el tope de tokens. Un recurso HTML largo
# (datos + JS) superaba el máximo de salida efectivo del proveedor y llegaba
# truncado a mitad del <script>: el recurso se veía bien pero no funcionaba.
_MAX_CONTINUATIONS = 2
_CONTINUE_PROMPT = (
    "Tu respuesta se cortó por el límite de longitud. Continúa EXACTAMENTE desde el "
    "último carácter que escribiste, sin repetir nada y sin comentarios ni markdown."
)


def _chat(
    provider: str,
    model_id: str,
    prompt: str,
    max_tokens: int,
    extra: dict,
    timeout: float | None = None,
    key: str | None = None,
) -> str:
    msgs = [{"role": "user", "content": prompt}]
    content, finish = _chat_once(provider, model_id, msgs, max_tokens, extra, timeout, key)
    for _ in range(_MAX_CONTINUATIONS):
        if finish != "length":
            break
        logger.info("llm output truncated; continuing", provider=provider, model_id=model_id)
        msgs = [
            *msgs,
            {"role": "assistant", "content": content},
            {"role": "user", "content": _CONTINUE_PROMPT},
        ]
        try:
            more, finish = _chat_once(provider, model_id, msgs, max_tokens, extra, timeout, key)
        except EmptyContentError:
            break
        content += more
    return content


def generar_texto(
    prompt: str,
    tarea: str,
    max_tokens: int = 8192,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
    *,
    deadline: float | None = None,
    thinking: bool | None = None,
) -> str:
    """Route a task to its model and walk the per-task fallback chain on any
    recoverable API error (rate-limit, 402 insufficient credit, provider 5xx,
    Crucible/sub-host failures). The chain ends in a Groq model that almost
    always responds within the free tier. `llm_config` carries per-user model/
    timeout overrides for the primary attempt. `enabled_models` restricts overrides
    to models the user has explicitly enabled (system defaults always pass).
    `deadline` (monotonic) corta fallbacks restantes y acota el timeout de cada
    intento — reservando margen para el siguiente modelo cuando queda cadena,
    de modo que un primario lento degrada a un fallback rápido en vez de
    tumbar el recurso. `thinking=False` fuerza thinking off en todos los
    modelos de la cadena (ruta de datos estructurados: el JSON no gana nada
    con CoT y su latencia se come el presupuesto — medido: 39.7s → 11.5s con
    el mismo JSON válido)."""
    primary, timeout = _resolve_primary(tarea, llm_config, enabled_models=enabled_models)
    user_keys = own_keys(llm_config)
    chain: list[tuple[str, str, dict]] = [primary, *_fallback_chain(tarea, llm_config)]

    last_err: Exception | None = None
    prev_provider: str | None = None
    cut_by_budget = False
    for i, (proveedor, model_id, extra) in enumerate(chain):
        role = "primary" if i == 0 else f"fallback {i}/{len(chain) - 1}"
        attempt_extra = extra
        if thinking is False:
            attempt_extra = with_thinking_disabled(proveedor, model_id, extra)
        attempt_timeout = timeout
        if deadline is not None:
            left = deadline - time.monotonic()
            if left < _MIN_ATTEMPT_S:
                cut_by_budget = True
                logger.info(
                    "task chain cut: resource budget exhausted",
                    tarea=tarea,
                    role=role,
                    attempts=i,
                    models_not_tried=len(chain) - i,
                )
                break
            # Reserva margen para el siguiente modelo: el intento actual no
            # puede gastar el presupuesto entero si queda cadena por probar.
            reserve = _FALLBACK_MARGIN_S if i < len(chain) - 1 else 0.0
            attempt_timeout = min(timeout or _LLM_TIMEOUT_S, max(left - reserve, _MIN_ATTEMPT_S))
        if i > 0:
            backoff = _retry_delay(last_err, prev_provider, proveedor, i)
            logger.info(
                "task switching to next model in chain",
                tarea=tarea,
                role=role,
                provider=proveedor,
                model_id=model_id,
                backoff_s=round(backoff, 1),
            )
            if backoff:
                time.sleep(backoff)
        logger.info(
            "task trying model",
            tarea=tarea,
            role=role,
            provider=proveedor,
            model_id=model_id,
        )
        try:
            content = _chat(
                proveedor,
                model_id,
                prompt,
                max_tokens,
                attempt_extra,
                attempt_timeout,
                user_keys.get(proveedor),
            )
            logger.info(
                "task model ok",
                tarea=tarea,
                role=role,
                provider=proveedor,
                model_id=model_id,
            )
            return content
        except _RECOVERABLE_ERRORS as exc:
            last_err = exc
            prev_provider = proveedor
            next_step = (
                f"{chain[i + 1][0]}/{chain[i + 1][1]}"
                if i + 1 < len(chain)
                else "<chain exhausted>"
            )
            logger.warning(
                "task attempt failed",
                tarea=tarea,
                role=role,
                provider=proveedor,
                model_id=model_id,
                error_type=type(exc).__name__,
                next_step=next_step,
            )
    if cut_by_budget and last_err is None:
        # La cadena se cortó por RELOJ, no por fallo de los modelos: error
        # distinto para que el log diga la causa real (no "All LLM fallbacks
        # failed" cuando los fallbacks ni se intentaron).
        raise LLMBudgetExhaustedError(
            f"Presupuesto del recurso agotado antes de probar la cadena "
            f"(tarea={tarea}, intentos=0, sin probar: "
            f"{[m for _, m, _ in chain]})"
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
            "rate limit hit, falling back to safety-net model",
            model_id=model_id,
            provider=provider,
            fallback_model=_FALLBACK_OR_MODEL,
        )
        fb_key = _get_provider_key("openrouter")
        fb_client = openrouter_client.with_options(api_key=fb_key) if fb_key else openrouter_client
        # El respaldo gratuito (Gemma 4) puede razonar y comerse el tope de
        # tokens (aquí a veces solo 512): mismo ajuste que en generar_texto.
        response = fb_client.chat.completions.create(
            model=_FALLBACK_OR_MODEL,
            messages=msgs,
            max_tokens=max_tokens,
            **with_model_thinking("openrouter", _FALLBACK_OR_MODEL, {}, max_tokens),
        )
        return response.choices[0].message.content


# Tope de salida en Groq. Medido el 2026-09-25 (qwen/qwen3.8-27b, matriz de
# confusión de prueba): 249-370 tokens de descripción, sin razonamiento ni
# «<think>», en 1,1-3,2 s. Antes eran 2048 por si razonaba, pero su plan
# gratuito reserva ese tope contra sus límites por minuto (8000 tokens en total
# y 1000 de salida; con 900 la petición ya contaba 849 de salida): cuanto menor,
# más imágenes seguidas caben antes del 429. 640 deja margen a las 250 palabras.
_VISION_GROQ_MIN_TOKENS = 640
# Esperas por 429 de Groq antes de pasar al respaldo de pago (ver rate_limit_wait).
_VISION_GROQ_RATE_RETRIES = 2


def _vision_once(provider: str, model_id: str, messages: list[dict], max_tokens: int, key: str) -> str:
    if provider == "groq":
        for attempt in range(_VISION_GROQ_RATE_RETRIES + 1):
            try:
                response = groq_client.with_options(api_key=key).chat.completions.create(
                    model=model_id,
                    messages=messages,
                    max_completion_tokens=max(max_tokens, _VISION_GROQ_MIN_TOKENS),
                    timeout=_LLM_TIMEOUT_S,
                )
                break
            except GroqRateLimitError as exc:
                # Límite por minuto, no cuota agotada: se espera lo que pide.
                wait = rate_limit_wait(exc)
                if wait is None or attempt == _VISION_GROQ_RATE_RETRIES:
                    raise
                logger.info("vision: Groq rate limit — waiting", model_id=model_id, wait_s=wait)
                time.sleep(wait)
    else:
        response = openrouter_client.with_options(api_key=key).chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=max_tokens,
            timeout=_LLM_TIMEOUT_S,
        )
    return clean_description(response.choices[0].message.content)


def generar_vision(messages: list[dict], max_tokens: int = 1024) -> str:
    """Describe una imagen (mensajes con bloques image_url) para el RAG.

    Prueba la cadena de `vision_chain()` con las claves de plataforma hasta que
    un modelo responde: un modelo retirado (404) o sin cuota pasa al siguiente.
    """
    last_err: Exception | None = None
    for provider, model_id in vision_chain():
        key = _get_provider_key(provider)
        if not key:
            continue
        try:
            text = _vision_once(provider, model_id, messages, max_tokens, key)
        except _RECOVERABLE_ERRORS as exc:
            logger.warning(
                "vision model failed — trying next",
                provider=provider,
                model_id=model_id,
                error_type=type(exc).__name__,
                status=getattr(exc, "status_code", None),
            )
            last_err = exc
            continue
        if text:
            return text
        last_err = EmptyContentError(f"{provider}/{model_id} devolvió una descripción vacía")
    raise last_err or RuntimeError("No hay ningún modelo de visión disponible")
