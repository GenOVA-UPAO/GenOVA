"""Observabilidad opt-in: Logfire + LangSmith (sin PII, R8).

Sin token/key todo es no-op. Espeja el patrón de Sentry.
"""

from __future__ import annotations

import os
from functools import lru_cache

import structlog

from core.config import settings

logger = structlog.get_logger(__name__)


def init_logfire(app, engine) -> None:
    """Instrumenta FastAPI + SQLAlchemy + SDK OpenAI si hay token; si no, no-op.

    ``logfire.configure(...)`` ya corrió en ``configure_logging()`` (antes de
    que se arme el pipeline de structlog), así que aquí solo se agregan los
    spans de instrumentación automática.
    """
    if not settings.logfire_token:
        return
    try:
        import logfire
    except Exception as exc:
        # logger.warning (sin exc_info) evita la UserWarning de structlog
        # (`Remove format_exc_info…`) que dispara cualquier log con traceback.
        logger.warning("Logfire no disponible", error=str(exc))
        return

    # NO instrumentar FastAPI: otel-instrumentation-fastapi lee `route.path` sobre los
    # nodos _IncludedRouter que FastAPI 0.137+ mete en `app.routes` (ahora un árbol, no
    # una lista plana de APIRoute) → AttributeError en el middleware ASGI → 500 en todo
    # /api/* antes de CORS. Re-habilitar cuando OTel migre a iter_route_contexts().

    # Cada instrumentación aislada: un fallo no tumba a las otras ni ensucia el log.
    try:
        logfire.instrument_sqlalchemy(engine=engine)
    except Exception as exc:
        logger.warning("Logfire SQLAlchemy no instrumentado", error=str(exc))

    # Span por llamada al SDK OpenAI (OpenRouter y compatibles) con el uso de tokens →
    # base del cost/usage tracking por request (R8: sin PII).
    # The installed SDK captures full requests/responses and explicitly skips
    # scrubbing OpenAI spans. Fail closed instead of claiming regex redaction.
    if settings.telemetry_include_content:
        try:
            logfire.instrument_openai()
        except Exception as exc:
            logger.warning("Logfire OpenAI no instrumentado", error=str(exc))

    logger.info("Logfire instrumentado", environment=settings.env)


def init_langsmith() -> None:
    """Activa tracing LangGraph→LangSmith si hay API key y flag; si no, no-op.

    LangGraph lee LANGSMITH_TRACING / LANGSMITH_API_KEY del entorno al invocar.
    """
    hidden = "false" if settings.telemetry_include_content else "true"
    os.environ["LANGSMITH_HIDE_INPUTS"] = hidden
    os.environ["LANGSMITH_HIDE_OUTPUTS"] = hidden
    if not settings.langsmith_api_key or not settings.langsmith_tracing:
        return
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project or "genova"
    logger.info(
        "LangSmith tracing habilitado",
        project=settings.langsmith_project or "genova",
        environment=settings.env,
    )


@lru_cache(maxsize=4)
def _langsmith_client(api_key: str, include_content: bool):
    from langsmith import Client

    return Client(api_key=api_key, hide_inputs=not include_content, hide_outputs=not include_content)


def private_langsmith_client():
    """Explicit policy for wrappers/RunTree, even before ASGI startup."""
    return _langsmith_client(settings.langsmith_api_key, settings.telemetry_include_content)
