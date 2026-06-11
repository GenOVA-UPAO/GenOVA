import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")
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
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
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
        "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
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
