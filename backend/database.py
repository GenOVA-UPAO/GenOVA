import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is required")

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
        pool_size=5,
        max_overflow=5,
    )
    # Lightweight keepalive — covers cases where pre-ping passes but the
    # connection drops mid-request.
    connect_args = {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
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
