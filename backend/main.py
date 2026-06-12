import asyncio
import logging
import os
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

import models  # noqa: F401  — imported for side-effect of registering ORM models
from api.auth import router as auth_router
from api.labs import generation_router as labs_gen_router
from api.labs import router as labs_router
from api.llm import router as agents_router
from api.ova import (
    add_phase_router as ova_add_phase_router,
)
from api.ova import (
    edit_router as ova_edit_router,
)
from api.ova import (
    history_router as ova_history_router,
)
from api.ova import (
    jobs_router as ova_jobs_router,
)
from api.ova import (
    phase_version_router as ova_phase_version_router,
)
from api.ova import (
    router as ova_router,
)
from api.ova import (
    subelement_router as ova_subelement_router,
)
from api.rag import router as rag_router
from api.rag import uploads_router
from api.scorm import router as scorm_router
from api.users import roles_router
from api.users import router as users_router
from auth.dependencies import require_admin
from database import Base, engine
from rate_limit import limiter
from run_migrations import run_migrations
from seed import seed_db
from users.admin.platform_settings_router import router as platform_settings_router

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# OE1 latency target (ms) for non-LLM endpoints.
_LATENCY_THRESHOLD_MS = float(os.getenv("LATENCY_THRESHOLD_MS", "278"))
# Paths excluded from slow-request warnings (LLM generation — inherently slow).
_LATENCY_EXCLUDED_PREFIXES = ("/api/agents/", "/api/ova/save", "/api/labs/generate")


class ProcessTimeMiddleware(BaseHTTPMiddleware):
    """Adds X-Process-Time-Ms header and warns on slow non-LLM requests."""

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
    """Run purge in a worker thread so cold boot isn't blocked by a slow DB."""
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
    """Fetch model catalogs from OpenRouter + Groq and cache in Supabase."""
    try:
        from sqlalchemy.orm import Session

        from llm.catalog_refresh import refresh_catalog

        with Session(engine) as session:
            refresh_catalog(session)
    except Exception:
        logger.exception("Catalog refresh on startup failed (continuing).")


@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()
    Base.metadata.create_all(bind=engine)
    seed_db()
    # Fire-and-forget cleanup; boot completes without waiting on the DB.
    asyncio.create_task(asyncio.to_thread(_background_rag_purge))
    # Fire-and-forget catalog refresh from provider APIs.
    asyncio.create_task(asyncio.to_thread(_background_catalog_refresh))
    yield


app = FastAPI(title="GENOVA Backend API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_env = os.getenv("ENV", "dev").lower()
_extra = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
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

# ProcessTimeMiddleware must be innermost so BaseHTTPMiddleware does not wrap
# CORSMiddleware — that combination causes 502 on OPTIONS preflight in Starlette.
app.add_middleware(ProcessTimeMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)
# CORSMiddleware must be outermost: it intercepts OPTIONS before any other
# middleware runs, avoiding the BaseHTTPMiddleware / preflight incompatibility.
app.add_middleware(
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
    """Force-refresh the LLM model catalog from provider APIs (admin-only)."""
    from sqlalchemy.orm import Session

    from llm.catalog_refresh import get_catalog_entries, refresh_catalog

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


app.include_router(agents_router, prefix="/api/agents", tags=["LLM Catalog"])
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
