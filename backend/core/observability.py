"""B4 — Pydantic Logfire observability (opt-in).

Activa tracing distribuido + token/cost tracking de las llamadas LLM solo si
LOGFIRE_TOKEN está configurado. Sin token todo es no-op: ni se importa logfire en
caliente ni se envía nada fuera. Espeja el patrón opt-in de Sentry (no PII).
"""

import logging

from core.config import settings

logger = logging.getLogger(__name__)


def init_logfire(app, engine) -> None:
    """Instrumenta FastAPI + SQLAlchemy + SDK OpenAI si hay token; si no, no-op."""
    if not settings.logfire_token:
        return
    try:
        import logfire

        logfire.configure(
            token=settings.logfire_token,
            service_name="genova-backend",
            environment=settings.env,
            console=False,  # no duplicar cada span en stdout
        )
        logfire.instrument_fastapi(app, capture_headers=False)
        logfire.instrument_sqlalchemy(engine=engine)
        # Captura un span por llamada al SDK OpenAI (OpenRouter y compatibles) con
        # el uso de tokens → base del cost/usage tracking por request (R8: sin PII).
        logfire.instrument_openai()
        logger.info("Logfire inicializado (environment=%s)", settings.env)
    except Exception:
        logger.exception("Logfire init failed (continuing without it).")
