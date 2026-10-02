"""Helper de tests: sesión SQLite en memoria con un subconjunto de tablas ORM.

Los tipos/defaults de Postgres (JSONB, ``'{}'::jsonb``) no existen en SQLite: se
renderiza JSONB como JSON y se quitan los server_default solo durante el CREATE.
"""

from __future__ import annotations

from sqlalchemy import DefaultClause, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_en_sqlite(_type, _compiler, **_kw):
    return "JSON"


def make_session(*tables) -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    saved = {c: c.server_default for t in tables for c in t.columns}
    for column, default in saved.items():
        txt = str(getattr(default, "arg", "")).lower()
        if "now()" in txt:
            column.server_default = DefaultClause(text("CURRENT_TIMESTAMP"))
        elif "::jsonb" in txt:
            column.server_default = DefaultClause(text(txt.split("::")[0]))
        elif txt in ("true", "false"):
            column.server_default = DefaultClause(text("1" if txt == "true" else "0"))
        elif txt and "(" not in txt and "::" not in txt:
            column.server_default = DefaultClause(text(txt))
        else:
            column.server_default = None
    try:
        for table in tables:
            table.create(engine)
    finally:
        for column, default in saved.items():
            column.server_default = default
    return sessionmaker(bind=engine)()
