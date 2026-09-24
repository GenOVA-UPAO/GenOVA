"""Prueba de un modelo: una llamada mínima con la clave que se usaría de verdad.

El administrador cambia de modelo a menudo y necesita saber, antes de guardar,
si un modelo responde con la clave de la plataforma (o, para un usuario, con su
clave propia). Se manda un prompt de pocas palabras con un tope de tokens muy
bajo y el razonamiento apagado: cuesta una fracción de céntimo.

El resultado es un código estable (`ok`, `invalid_key`, `no_credit`,
`rate_limited`, `model_not_found`, `timeout`, `unreachable`, `empty`, `no_key`,
`error`) que la interfaz traduce a qué hacer. La clave nunca sale de aquí: ni en
la respuesta ni en los logs (los mensajes de error de los SDK pueden incluir
parte de ella, así que solo se anotan el tipo de excepción y el código HTTP).

Con ``LLM_FAKE=1`` no sale nada a la red: la respuesta es simulada y
determinista (misma latencia y texto para el mismo modelo).
"""

import time
import zlib
from collections import deque
from threading import Lock

import httpx
import structlog

from core.config import settings

logger = structlog.get_logger(__name__)

PROBE_PROMPT = "Responde solo con la palabra: Listo."
PROBE_MAX_TOKENS = 64
PROBE_TIMEOUT_S = 25.0
EXCERPT_MAX = 160

OK = "ok"
NO_KEY = "no_key"
INVALID_KEY = "invalid_key"
NO_CREDIT = "no_credit"
RATE_LIMITED = "rate_limited"
MODEL_NOT_FOUND = "model_not_found"
TIMEOUT = "timeout"
UNREACHABLE = "unreachable"
EMPTY = "empty"
UNKNOWN = "error"

# Mensajes de 400 que en realidad dicen «ese modelo no existe» (OpenRouter
# responde 400 «is not a valid model ID»; Groq y OpenAI, 404).
_NOT_FOUND_HINTS = (
    "not a valid model",
    "model_not_found",
    "does not exist",
    "no endpoints found",
    "unknown model",
    "model not found",
    "invalid model",
)


def _status_of(exc: Exception) -> int | None:
    status = getattr(exc, "status_code", None)
    if status is None:
        status = getattr(getattr(exc, "response", None), "status_code", None)
    return status if isinstance(status, int) else None


def _is_timeout(exc: Exception) -> bool:
    name = type(exc).__name__
    return name == "APITimeoutError" or isinstance(exc, (httpx.TimeoutException, TimeoutError))


def _looks_like_missing_model(exc: Exception) -> bool:
    # Solo se inspecciona el texto para clasificar: nunca se devuelve ni se registra.
    text = str(getattr(exc, "message", "") or exc).lower()
    return any(hint in text for hint in _NOT_FOUND_HINTS)


def classify_probe_error(exc: Exception) -> str:
    """Traduce una excepción de la llamada a un código estable para la UI."""
    if type(exc).__name__ == "EmptyContentError":
        return EMPTY
    if _is_timeout(exc):
        return TIMEOUT
    status = _status_of(exc)
    if status in (401, 403):
        return INVALID_KEY
    if status == 402:
        return NO_CREDIT
    if status == 429:
        return RATE_LIMITED
    if status == 404 or (status in (400, 422) and _looks_like_missing_model(exc)):
        return MODEL_NOT_FOUND
    if status is not None and status >= 500:
        return UNREACHABLE
    if type(exc).__name__ == "APIConnectionError" or isinstance(
        exc, (httpx.TransportError, ConnectionError)
    ):
        return UNREACHABLE
    return UNKNOWN


def excerpt(text: str | None) -> str:
    """Primeras palabras de la respuesta, en una sola línea."""
    flat = " ".join((text or "").split())
    if len(flat) <= EXCERPT_MAX:
        return flat
    return flat[: EXCERPT_MAX - 1].rstrip() + "…"


def _result(provider: str, model_id: str, code: str, latency_ms: int | None, **extra) -> dict:
    out = {
        "ok": code == OK,
        "code": code,
        "provider": provider,
        "model_id": model_id,
        "latency_ms": latency_ms,
        "excerpt": None,
        "simulated": False,
    }
    out.update(extra)
    return out


def _fake_probe(provider: str, model_id: str, api_key: str, key_source: str) -> dict:
    """Respuesta simulada y determinista (modo LLM_FAKE)."""
    if api_key.startswith("fake-invalid"):
        return _result(provider, model_id, INVALID_KEY, 180, key_source=key_source, simulated=True)
    if api_key.startswith("fake-down"):
        return _result(provider, model_id, UNREACHABLE, None, key_source=key_source, simulated=True)
    seed = zlib.crc32(f"{provider}/{model_id}".encode())
    latency = 240 + seed % 900
    return _result(
        provider,
        model_id,
        OK,
        latency,
        excerpt="Listo.",
        key_source=key_source,
        simulated=True,
    )


def probe_model(provider: str, model_id: str, api_key: str | None, *, key_source: str) -> dict:
    """Llama una vez a `provider/model_id` con `api_key` y resume el resultado.

    `key_source` («platform», «server» u «own») solo se devuelve para que la UI
    diga con qué clave se probó. Nunca lanza.
    """
    if not api_key:
        return _result(provider, model_id, NO_KEY, None, key_source=key_source)
    if settings.llm_fake:
        result = _fake_probe(provider, model_id, api_key, key_source)
        _log(result)
        return result

    from llm.router import _chat_once
    from llm.utils.llm_helpers import with_thinking_disabled

    msgs = [{"role": "user", "content": PROBE_PROMPT}]
    extra = with_thinking_disabled(provider, model_id, {})
    started = time.monotonic()
    failure: Exception | None = None
    content = None
    try:
        content, _finish = _chat_once(
            provider, model_id, msgs, PROBE_MAX_TOKENS, extra, PROBE_TIMEOUT_S, api_key
        )
    except Exception as exc:
        failure = exc
    if failure is not None:
        # Se registra fuera del `except`: si el log fallara, su traza no
        # arrastraría la excepción del SDK (cuyo mensaje puede llevar la clave).
        return _failed(provider, model_id, failure, started, key_source)
    latency = round((time.monotonic() - started) * 1000)
    result = _result(
        provider, model_id, OK, latency, excerpt=excerpt(content), key_source=key_source
    )
    _log(result)
    return result


def _failed(provider: str, model_id: str, exc: Exception, started: float, key_source: str) -> dict:
    latency = round((time.monotonic() - started) * 1000)
    code = classify_probe_error(exc)
    logger.warning(
        "model probe failed",
        provider=provider,
        model_id=model_id,
        code=code,
        error_type=type(exc).__name__,
        status=_status_of(exc),
        latency_ms=latency,
    )
    return _result(provider, model_id, code, latency, key_source=key_source)


def _log(result: dict) -> None:
    logger.info(
        "model probe",
        provider=result["provider"],
        model_id=result["model_id"],
        code=result["code"],
        latency_ms=result["latency_ms"],
        key_source=result.get("key_source"),
        simulated=result["simulated"],
    )


class ProbeThrottle:
    """Ventana deslizante por persona: cada prueba es una llamada de pago.

    Va aparte del limitador por IP (que puede estar apagado en e2e) porque aquí
    lo que se limita es el gasto, no el abuso de la API.
    """

    def __init__(self, limit: int, window_s: float):
        self.limit = limit
        self.window_s = window_s
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def retry_after(self, who: str) -> int:
        """0 si puede probar ya (y lo anota); si no, segundos hasta poder."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(who, deque())
            while hits and now - hits[0] >= self.window_s:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(1, int(self.window_s - (now - hits[0])) + 1)
            hits.append(now)
            return 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# 10 pruebas por minuto y persona: de sobra para comparar modelos a mano.
probe_throttle = ProbeThrottle(limit=10, window_s=60.0)
