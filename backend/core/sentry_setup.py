"""Error tracking opt-in con Sentry (sin PII, regla R8).

Sin ``SENTRY_DSN`` no se importa ``sentry_sdk``, no se inicializa nada y no hay
red. ``scrub_event`` es el ``before_send``: quita cabeceras Authorization/Cookie,
cuerpos de petición, contraseñas, claves de API y tokens antes de enviar.
"""

from __future__ import annotations

import os
import re
from typing import Any

import structlog

from core.config import settings
from core.log_redaction import redact

logger = structlog.get_logger(__name__)

_REDACTED = "[redacted]"
_SENSITIVE_HEADERS = {"authorization", "cookie", "set-cookie", "x-api-key", "proxy-authorization"}
_SENSITIVE_KEY = re.compile(
    r"(?i)pass(word|wd)?|secret|token|api[-_]?key|authorization|cookie|prompt|credential"
)
_API_KEY = re.compile(r"\bsk-[A-Za-z0-9_\-]{8,}")


def _clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            k: _REDACTED if _SENSITIVE_KEY.search(str(k)) else _clean(v)
            for k, v in value.items()
        }
    if isinstance(value, list | tuple):
        return [_clean(v) for v in value]
    if isinstance(value, str):
        return _API_KEY.sub("[key]", redact(value))
    return value


def scrub_event(event: dict, hint: dict | None = None) -> dict:
    """``before_send``: devuelve el evento sin secretos ni cuerpos de petición."""
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        request.pop("query_string", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            request["headers"] = {
                k: v for k, v in headers.items() if str(k).lower() not in _SENSITIVE_HEADERS
            }
    event.pop("user", None)
    for key in ("exception", "breadcrumbs", "extra", "contexts", "message", "logentry", "request"):
        if key in event:
            event[key] = _clean(event[key])
    return event


def init_sentry() -> bool:
    """Inicializa Sentry solo si hay DSN. Devuelve True si quedó activo."""
    if not settings.sentry_dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT") or settings.env,
        release=os.getenv("SENTRY_RELEASE") or os.getenv("RENDER_GIT_COMMIT") or None,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,  # nunca enviar PII (correos, tokens) a Sentry
        max_request_body_size="never",
        before_send=scrub_event,
    )
    logger.info("Sentry inicializado", environment=settings.env)
    return True
