import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env before importing modules that read env vars at import time.
load_dotenv()

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.exc import DataError

import models  # noqa: F401  — imported for side-effect of registering ORM models
from auth.dependencies import require_admin
from auth.router import router as auth_router
from core.config import settings
from core.database import Base, engine
from core.http_errors import data_error_handler
from core.http_middleware import ProcessTimeMiddleware, SecurityHeadersMiddleware
from core.logging_setup import RequestContextMiddleware, configure_logging
from core.openapi_ids import generate_operation_id
from core.openapi_tags import OPENAPI_TAGS
from core.rate_limit import limiter
from generation.jobs.jobs_router import router as ova_jobs_router
from generation.jobs.jobs_stream import router as ova_jobs_stream_router
from llm.catalog.catalog_router import router as agents_router
from ova.chat.router import router as ova_chat_router
from ova.crud.edit_router import router as ova_edit_router
from ova.crud.subelement_router import router as ova_subelement_router
from ova.phases.add_phase_router import router as ova_add_phase_router
from ova.phases.history_router import router as ova_history_router
from ova.phases.phase_version_router import router as ova_phase_version_router
from ova.router import router as ova_router
from rag.router import router as rag_router
from roles.interface.http.router import router as roles_router
from run_migrations import run_migrations
from scorm.router import router as scorm_router
from seed import seed_db
from uploads.router import router as uploads_router
from users.admin.list_router import router as users_list_router
from users.admin.nodes_config_router import router as nodes_config_router
from users.admin.platform_settings_router import router as platform_settings_router
from users.router import router as users_router

configure_logging(
    log_level=settings.log_level, env=settings.env, logfire_token=settings.logfire_token
)
logger = structlog.get_logger(__name__)

_IS_PROD = settings.env.lower() == "production"

# Error tracking opcional: solo se activa si SENTRY_DSN está configurado.
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,  # nunca enviar PII (correos, tokens) a Sentry
    )
    logger.info("Sentry inicializado", environment=settings.env)


def _background_rag_purge() -> None:
    try:
        from sqlalchemy.orm import Session

        from rag.store import purge_expired

        with Session(engine) as session:
            removed = purge_expired(session)
            if removed:
                logger.info("RAG chunks purgados en startup", count=removed)
    except Exception:
        logger.exception("RAG startup cleanup failed (continuing).")


def _background_auth_purge() -> None:
    try:
        from sqlalchemy.orm import Session

        from auth.cleanup import purge_expired_auth

        with Session(engine) as session:
            removed = purge_expired_auth(session)
            if removed:
                logger.info("Auth tokens purgados en startup", count=removed)
    except Exception:
        logger.exception("Auth startup cleanup failed (continuing).")


def _background_regen_recovery() -> None:
    # Regen jobs live in an in-memory dict (one thread per regen); a restart
    # loses them while ova.status stays "generando" in DB, bricking the OVA.
    try:
        from generation.regen.regen_jobs import recover_orphan_regen

        recover_orphan_regen()
    except Exception:
        logger.exception("Regen orphan recovery on startup failed (continuing).")


def _background_catalog_refresh() -> None:
    try:
        from sqlalchemy.orm import Session

        from llm.catalog.catalog_refresh import refresh_catalog

        with Session(engine) as session:
            refresh_catalog(session)
    except Exception:
        logger.exception("Catalog refresh on startup failed (continuing).")


@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()
    Base.metadata.create_all(bind=engine)
    seed_db()
    asyncio.create_task(asyncio.to_thread(_background_rag_purge))
    asyncio.create_task(asyncio.to_thread(_background_auth_purge))
    asyncio.create_task(asyncio.to_thread(_background_regen_recovery))
    asyncio.create_task(asyncio.to_thread(_background_catalog_refresh))
    yield


app = FastAPI(
    title="GENOVA Backend API",
    version="0.1.0",
    description=(
        "API de GenOVA: generación asistida por IA de Objetos Virtuales de Aprendizaje "
        "con exportación SCORM 1.2. La sesión se mantiene con la cookie httpOnly "
        "`genova_token` que devuelve `POST /api/auth/login`."
    ),
    openapi_tags=OPENAPI_TAGS,
    generate_unique_id_function=generate_operation_id,
    lifespan=lifespan,
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    openapi_url=None if _IS_PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Un identificador o valor con formato inválido es 400, no 500.
app.add_exception_handler(DataError, data_error_handler)

_env = settings.env.lower()
_extra = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if _env == "production":
    if not _extra:
        raise RuntimeError(
            "CORS_ORIGINS must be set in production (comma-separated frontend origins)."
        )
    allowed_origins = _extra
else:
    allowed_origins = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:4200",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4200",
        *_extra,
    ]

app.add_middleware(ProcessTimeMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    max_age=86400,
)
logger.info("CORS origins configurados", origins=allowed_origins)

if settings.metrics_enabled:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    logger.info("Prometheus /metrics habilitado")

from core.observability import init_langsmith, init_logfire

init_logfire(app, engine)
init_langsmith()

_HEALTH_CACHE = "public, max-age=10"


@app.get("/health", tags=["Health"], summary="Estado del servicio")
def health(response: Response) -> dict[str, str]:
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok"}


@app.get("/api/health", tags=["Health"], summary="Estado de la API")
def api_health(response: Response) -> dict[str, str]:
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok", "scope": "api"}


@app.get("/api/db/health", tags=["Health"], summary="Estado de la base de datos")
def db_health(response: Response) -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok", "scope": "db"}


@app.post(
    "/api/admin/refresh-catalog",
    tags=["Admin · Plataforma"],
    summary="Refrescar el catálogo global de modelos",
)
@limiter.limit("2/minute")
def admin_refresh_catalog(
    request: Request,
    _admin: None = Depends(require_admin),
):
    from sqlalchemy.orm import Session

    from llm.catalog.catalog_refresh import get_catalog_entries, refresh_catalog

    try:
        with Session(engine) as session:
            refresh_catalog(session)
        return {"status": "ok", "entries": len(get_catalog_entries())}
    except Exception as exc:
        logger.exception("Admin catalog refresh failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo refrescar el catálogo.",
        ) from exc


app.include_router(agents_router, prefix="/api/agents")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(rag_router, prefix="/api/rag")
app.include_router(roles_router, prefix="/api/roles")
app.include_router(scorm_router, prefix="/api/scorm")
app.include_router(ova_router, prefix="/api/ovas")
app.include_router(ova_jobs_router, prefix="/api/jobs")
app.include_router(ova_jobs_stream_router, prefix="/api/jobs")
app.include_router(ova_history_router, prefix="/api/ovas")
app.include_router(ova_edit_router, prefix="/api/ovas")
# Chat también montado aquí: include anidado en edit_router a veces no aparece
# en el proceso que queda pegado a un socket zombie de :8000.
app.include_router(ova_chat_router, prefix="/api/ovas")
app.include_router(ova_phase_version_router, prefix="/api/ovas")
app.include_router(ova_add_phase_router, prefix="/api/ovas")
app.include_router(ova_subelement_router, prefix="/api/ovas")
app.include_router(users_router, prefix="/api/users")
# La colección `/api/users` se monta aquí porque su ruta es "" y FastAPI no
# admite prefijo y ruta vacíos en un include anidado.
app.include_router(users_list_router, prefix="/api/users")
app.include_router(uploads_router, prefix="/api/uploads")
app.include_router(platform_settings_router, prefix="/api/admin")
app.include_router(nodes_config_router, prefix="/api/admin")

# Alias heredados: el recurso vivía en /api/ova (singular) y los trabajos colgaban
# de /api/ova/jobs. Se mantienen fuera del esquema para no romper clientes ya
# desplegados; se retiran cuando ninguno los use.
app.include_router(ova_router, prefix="/api/ova", include_in_schema=False)
app.include_router(ova_jobs_router, prefix="/api/ova/jobs", include_in_schema=False)
app.include_router(ova_jobs_stream_router, prefix="/api/ova/jobs", include_in_schema=False)
