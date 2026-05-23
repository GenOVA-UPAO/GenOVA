import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env before importing modules that read env vars at import time.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

import models  # noqa: F401  — imported for side-effect of registering ORM models
from agents.router import router as agents_router
from auth.router import router as auth_router
from database import Base, engine
from labs.generation_routes import router as labs_gen_router
from labs.router import router as labs_router
from ova.edit_router import router as ova_edit_router
from ova.history_router import router as ova_history_router
from ova.router import router as ova_router
from rag.router import router as rag_router
from rate_limit import limiter
from roles.router import router as roles_router
from run_migrations import run_migrations
from scorm.router import router as scorm_router
from seed import seed_db
from uploads.router import router as uploads_router
from users.router import router as users_router

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()
    Base.metadata.create_all(bind=engine)
    seed_db()
    yield


app = FastAPI(title="GENOVA Backend API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_extra = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return {"status": "ok", "scope": "api"}


@app.get("/api/db/health")
def db_health() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "scope": "db"}


app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(rag_router, prefix="/api/rag", tags=["rag"])
app.include_router(roles_router, prefix="/api/roles", tags=["roles"])
app.include_router(roles_router, prefix="/roles", tags=["roles"])
app.include_router(scorm_router, prefix="/api/scorm", tags=["scorm"])
app.include_router(ova_router, prefix="/api/ova", tags=["ova"])
app.include_router(ova_history_router, prefix="/api/ovas", tags=["ovas"])
app.include_router(ova_edit_router, prefix="/api/ovas", tags=["ovas-edit"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["uploads"])
app.include_router(labs_router, prefix="/api/labs", tags=["labs"])
app.include_router(labs_gen_router, prefix="/api/labs", tags=["labs"])
