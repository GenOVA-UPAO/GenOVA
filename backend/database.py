import logging

from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import settings

_logger = logging.getLogger(__name__)

load_dotenv()

database_url = settings.database_url
if not database_url:
    raise RuntimeError("DATABASE_URL is required")

# Normalize the legacy scheme some hosts emit (Supabase/Heroku give postgres://);
# SQLAlchemy needs the postgresql:// driver name.
if database_url.startswith("postgres://"):
    database_url = "postgresql://" + database_url[len("postgres://") :]

# This project ships psycopg v3 (psycopg[binary]), not psycopg2. A bare
# postgresql:// (what Supabase's UI copies) would resolve to the psycopg2 dialect
# and fail with "No module named 'psycopg2'". Pin the v3 driver explicitly so the
# connection string copied straight from Supabase works as-is.
if database_url.startswith("postgresql://"):
    database_url = "postgresql+psycopg://" + database_url[len("postgresql://") :]

# Fail fast on the most common misconfig: the Supabase *project* REST URL
# (https://<ref>.supabase.co) pasted in instead of the Postgres connection
# string. Otherwise SQLAlchemy raises a cryptic "Can't load plugin
# sqlalchemy.dialects:https" at engine creation.
if database_url.startswith(("http://", "https://")):
    raise RuntimeError(
        "DATABASE_URL must be a postgresql:// connection string, not an http(s) URL. "
        "Use the Supabase Postgres connection string "
        "(postgresql://postgres:<password>@<host>:6543/postgres — the Transaction "
        "pooler), not the project URL."
    )

connect_args: dict = {}
engine_kwargs: dict = {"echo": False, "future": True}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Supabase pooler (pgbouncer) and most managed Postgres hosts close idle
    # connections aggressively. Without pre-ping, the first query on a stale
    # conn surfaces as `SSL SYSCALL error: EOF detected`. Recycle every 5 min
    # so we never hand back a connection older than the pooler's idle window.
    engine_kwargs.update(
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
    )
    # Lightweight keepalive — covers cases where pre-ping passes but the
    # connection drops mid-request.
    connect_args = {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
        # Fail fast on an unreachable host (e.g. a paused Supabase project, or the
        # IPv6-only direct connection used from an IPv4-only CI runner) instead of
        # hanging startup migrations until the CI step times out.
        "connect_timeout": settings.db_connect_timeout,
        # The Supabase Transaction pooler (port 6543) multiplexes clients over
        # shared server connections, so psycopg3's server-side prepared
        # statements collide across sessions (DuplicatePreparedStatement
        # "_pg3_0" already exists). Disable them entirely.
        "prepare_threshold": None,
    }

engine = create_engine(database_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def commit_or_500(db: Session, op: str) -> None:
    """Commit the current session or roll back and raise HTTP 500."""
    try:
        db.commit()
    except Exception:
        db.rollback()
        _logger.exception("DB write failed during %s", op)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar la operación. Intenta de nuevo.",
        ) from None
