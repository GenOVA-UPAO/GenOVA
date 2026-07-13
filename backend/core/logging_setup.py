"""Structured logging setup (structlog + stdlib) for GenOVA.

JSON in production, colored console in local. Integrates Uvicorn/stdlib loggers
via ProcessorFormatter and keeps RedactingFilter on every handler (R8).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import structlog
from starlette.middleware.base import BaseHTTPMiddleware

from core.log_redaction import RedactingFilter, redact_event_dict


def configure_logging(*, log_level: str, env: str) -> None:
    """Configure structlog + root stdlib handlers. Call once at process start."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    is_prod = env.lower() == "production"

    shared: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        redact_event_dict,
    ]

    structlog.configure(
        processors=[
            *shared,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    renderer: Any = (
        structlog.processors.JSONRenderer()
        if is_prod
        else structlog.dev.ConsoleRenderer()
    )
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
        foreign_pre_chain=shared,
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(RedactingFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        ul = logging.getLogger(name)
        ul.handlers.clear()
        ul.propagate = True


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Bind request_id (+ method/path) for the duration of each request."""

    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        try:
            response = await call_next(request)
            response.headers.setdefault("X-Request-Id", request_id)
            return response
        finally:
            structlog.contextvars.clear_contextvars()


def build_invoke_config(
    *,
    thread_id: str,
    max_concurrency: int,
    env: str,
) -> dict[str, Any]:
    """LangGraph invoke config with non-PII LangSmith-friendly metadata."""
    return {
        "configurable": {"thread_id": thread_id},
        "max_concurrency": max(1, max_concurrency),
        "tags": ["prometheus", "ova-generation", env],
        "metadata": {
            "thread_id": thread_id,
            "env": env,
            "component": "prometheus",
        },
    }
