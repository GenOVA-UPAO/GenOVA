"""Reintentos del embedder ante fallos pasajeros (red, 5xx, 408 y sobre todo 429).

Por qué esta espera y no 1 + 2 + 4 s: las cuotas del nivel gratuito de Gemini
son por minuto (peticiones y tokens por minuto). Un 429 significa «ya gastaste
el cupo de esta ventana», y 7 s de espera casi nunca llegan a la siguiente: la
ingesta fallaba entera aunque un minuto después hubiera salido bien. Ahora:

- Si la respuesta dice cuánto esperar (cabecera ``Retry-After`` o el
  ``google.rpc.RetryInfo.retryDelay`` que manda la API de Google en el cuerpo
  del error), se espera eso (más una fracción de segundo de margen).
- Si no, retroceso exponencial con *jitter* (2, 4, 8, 16, 30 s como techo, y se
  espera entre la mitad y el techo): la suma cubre una ventana de un minuto, y
  el azar evita que varias ingestas en paralelo reintenten a la vez y vuelvan a
  chocar con la cuota.
- Todo con un presupuesto total de espera (``RAG_EMBED_RETRY_BUDGET_S``, 60 s
  por defecto para documentos, que se indexan en segundo plano;
  ``RAG_EMBED_QUERY_RETRY_BUDGET_S``, 8 s para consultas, porque bloquean la
  generación y la rama léxica ya da contexto si el embedder no responde). Si la
  espera pedida no cabe en lo que queda, se abandona en el acto en vez de
  dormir para fallar igual.
"""

from __future__ import annotations

import os
import random
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from typing import TypeVar

import structlog

from rag.application.errors import EmbedderError

logger = structlog.get_logger(__name__)

T = TypeVar("T")

_RETRY_INFO = "type.googleapis.com/google.rpc.RetryInfo"
_DURATION = re.compile(r"^\s*(\d+(?:\.\d+)?)s\s*$")


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    budget_s: float  # tope de la suma de esperas
    base_s: float = 2.0  # techo de la primera espera sin pista del servidor
    cap_s: float = 30.0  # techo de cada espera exponencial
    max_attempts: int = 6  # peticiones como mucho (5 esperas)


def _env_float(name: str, default: float) -> float:
    try:
        return max(0.0, float(os.getenv(name, "") or default))
    except ValueError:
        return default


def document_policy() -> RetryPolicy:
    return RetryPolicy(budget_s=_env_float("RAG_EMBED_RETRY_BUDGET_S", 60.0))


def query_policy() -> RetryPolicy:
    return RetryPolicy(budget_s=_env_float("RAG_EMBED_QUERY_RETRY_BUDGET_S", 8.0))


def is_transient(exc: Exception) -> bool:
    """¿Puede salir bien al repetir? Sí: red, 5xx, 408 y 429 (cuota por minuto)."""
    if isinstance(exc, EmbedderError):
        return False
    code = getattr(exc, "code", None)  # google.genai.errors.APIError
    return not (isinstance(code, int) and 400 <= code < 500 and code not in (408, 429))


def _header_delay(exc: Exception) -> float | None:
    headers = getattr(getattr(exc, "response", None), "headers", None)
    try:
        value = headers.get("retry-after") if headers is not None else None
    except Exception:  # noqa: BLE001 — cabeceras de un cliente HTTP inesperado
        return None
    if not value:
        return None
    value = str(value).strip()
    try:
        return max(0.0, float(value))
    except ValueError:
        pass
    try:  # también puede ser una fecha HTTP
        return max(0.0, parsedate_to_datetime(value).timestamp() - time.time())
    except (TypeError, ValueError, OverflowError):
        return None


def _retry_info_delay(exc: Exception) -> float | None:
    body = getattr(exc, "details", None)
    error = body.get("error", body) if isinstance(body, dict) else None
    details = error.get("details") if isinstance(error, dict) else None
    for item in details if isinstance(details, list) else []:
        if isinstance(item, dict) and item.get("@type") == _RETRY_INFO:
            match = _DURATION.match(str(item.get("retryDelay", "")))
            if match:
                return float(match.group(1))
    return None


def retry_after_s(exc: Exception) -> float | None:
    """Lo que el servidor pide esperar, si lo dice (cabecera o RetryInfo)."""
    delay = _header_delay(exc)
    return delay if delay is not None else _retry_info_delay(exc)


def backoff_s(attempt: int, policy: RetryPolicy, rng: random.Random | None = None) -> float:
    """Espera exponencial con *equal jitter*: entre la mitad y el techo del intento."""
    ceiling = min(policy.cap_s, policy.base_s * 2**attempt)
    return ceiling / 2 + (rng or random).uniform(0, ceiling / 2)


def call_with_retry(fn: Callable[[], T], *, policy: RetryPolicy, what: str) -> T:
    """Ejecuta ``fn`` reintentando los fallos pasajeros dentro del presupuesto.

    Un fallo no transitorio (4xx salvo 408/429, EmbedderError) se propaga como
    EmbedderError sin reintentar: repetir no lo arregla.
    """
    waited = 0.0
    for attempt in range(policy.max_attempts):
        try:
            return fn()
        except Exception as exc:
            if not is_transient(exc):
                if isinstance(exc, EmbedderError):
                    raise
                raise EmbedderError(f"{what} failed: {exc}") from exc
            hinted = retry_after_s(exc)
            if hinted is not None:
                delay = hinted + random.uniform(0, 1)  # noqa: S311 — jitter, no cripto
            else:
                delay = backoff_s(attempt, policy)
            last = attempt + 1 >= policy.max_attempts
            if last or waited + delay > policy.budget_s:
                logger.warning(
                    "Embedding: se abandonan los reintentos",
                    attempts=attempt + 1,
                    waited_s=round(waited, 1),
                    next_delay_s=round(delay, 1),
                    budget_s=policy.budget_s,
                    error=str(exc),
                )
                raise EmbedderError(f"{what} failed: {exc}") from exc
            logger.warning(
                "Embedding retry",
                attempt=attempt + 1,
                delay_s=round(delay, 1),
                retry_after=hinted,
                error=str(exc),
            )
            time.sleep(delay)
            waited += delay
    raise AssertionError("unreachable")  # pragma: no cover
