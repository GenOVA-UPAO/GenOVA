from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agents.router import router as agents_router
from auth.router import router as auth_router
from database import Base, engine
import models
from rag.router import router as rag_router
from roles.router import router as roles_router
from scorm.router import router as scorm_router
from seed import seed_db
from sqlalchemy import text

app = FastAPI(title="GENOVA Backend API", version="0.1.0")

allowed_origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_db()


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
