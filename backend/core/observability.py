"""Observabilidad opt-in: Logfire + LangSmith (sin PII, R8).

Sin token/key todo es no-op. Espeja el patrón de Sentry.
"""

from __future__ import annotations

import os

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

        logfire.instrument_fastapi(app, capture_headers=False)
        logfire.instrument_sqlalchemy(engine=engine)
        # Captura un span por llamada al SDK OpenAI (OpenRouter y compatibles) con
        # el uso de tokens → base del cost/usage tracking por request (R8: sin PII).
        logfire.instrument_openai()
        logger.info("Logfire instrumentado", environment=settings.env)
    except Exception:
        logger.exception("Logfire instrumentation failed (continuing without it).")


def init_langsmith() -> None:
    """Activa tracing LangGraph→LangSmith si hay API key y flag; si no, no-op.

    LangGraph lee LANGSMITH_TRACING / LANGSMITH_API_KEY del entorno al invocar.
    """
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
