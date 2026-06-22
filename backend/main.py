import asyncio
import logging
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env before importing modules that read env vars at import time.
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware
from roles.router import router as roles_router

import models  # noqa: F401  — imported for side-effect of registering ORM models
from auth.dependencies import require_admin
from auth.router import router as auth_router
from core.config import settings
from core.database import Base, engine
from core.rate_limit import limiter
from generation.jobs.jobs_router import router as ova_jobs_router
from labs.generation_routes import router as labs_gen_router
from labs.router import router as labs_router
from llm.catalog.catalog_router import router as agents_router
from ova.crud.edit_router import router as ova_edit_router
from ova.crud.subelement_router import router as ova_subelement_router
from ova.phases.add_phase_router import router as ova_add_phase_router
from ova.phases.history_router import router as ova_history_router
from ova.phases.phase_version_router import router as ova_phase_version_router
from ova.router import router as ova_router
from rag.router import router as rag_router
from uploads.router import router as uploads_router
from run_migrations import run_migrations
from scorm.router import router as scorm_router
from seed import seed_db
from users.admin.platform_settings_router import router as platform_settings_router
from users.router import router as users_router

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
_LATENCY_THRESHOLD_MS = settings.latency_threshold_ms
_LATENCY_EXCLUDED_PREFIXES = ("/api/agents/", "/api/ova/save", "/api/labs/generate")


class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Process-Time-Ms"] = f"{ms:.1f}"
        if ms > _LATENCY_THRESHOLD_MS and not any(
            request.url.path.startswith(p) for p in _LATENCY_EXCLUDED_PREFIXES
        ):
            logger.warning(
                "SLOW %s %s → %.1fms (threshold %.0fms)",
                request.method,
                request.url.path,
                ms,
                _LATENCY_THRESHOLD_MS,
            )
        return response


def _background_rag_purge() -> None:
    try:
        from sqlalchemy.orm import Session

        from rag.store import purge_expired

        with Session(engine) as session:
            removed = purge_expired(session)
            if removed:
                logger.info("Purged %d expired RAG chunks on startup", removed)
    except Exception:
        logger.exception("RAG startup cleanup failed (continuing).")


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
    asyncio.create_task(asyncio.to_thread(_background_catalog_refresh))
    yield


app = FastAPI(title="GENOVA Backend API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
        *_extra,
    ]

app.add_middleware(ProcessTimeMiddleware)  # innermost: avoid 502 on OPTIONS preflight
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(  # outermost: intercept OPTIONS before other middleware
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    max_age=86400,
)
logger.info("CORS allowed origins: %s", allowed_origins)

_HEALTH_CACHE = "public, max-age=10"


@app.get("/health")
def health(response: Response) -> dict[str, str]:
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok"}


@app.get("/api/health")
def api_health(response: Response) -> dict[str, str]:
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok", "scope": "api"}


@app.get("/api/db/health")
def db_health(response: Response) -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    response.headers["Cache-Control"] = _HEALTH_CACHE
    return {"status": "ok", "scope": "db"}


@app.post("/api/admin/refresh-catalog")
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
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(rag_router, prefix="/api/rag", tags=["RAG"])
app.include_router(roles_router, prefix="/api/roles", tags=["Roles"])
app.include_router(roles_router, prefix="/roles", tags=["Roles"])
app.include_router(scorm_router, prefix="/api/scorm", tags=["SCORM"])
app.include_router(ova_router, prefix="/api/ova", tags=["OVA"])
app.include_router(ova_jobs_router, prefix="/api/ova/jobs", tags=["Generation"])
app.include_router(ova_history_router, prefix="/api/ovas", tags=["OVA"])
app.include_router(ova_edit_router, prefix="/api/ovas", tags=["OVA"])
app.include_router(ova_phase_version_router, prefix="/api/ovas", tags=["OVA"])
app.include_router(ova_add_phase_router, prefix="/api/ovas", tags=["OVA"])
app.include_router(ova_subelement_router, prefix="/api/ovas", tags=["OVA"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["RAG"])
app.include_router(labs_router, prefix="/api/labs", tags=["Labs"])
app.include_router(labs_gen_router, prefix="/api/labs", tags=["Labs"])
app.include_router(platform_settings_router, prefix="/api/admin", tags=["Admin"])
