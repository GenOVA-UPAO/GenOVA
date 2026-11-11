"""Provision the isolated benchmark database without printing credentials.

Uso (desde backend/): python scripts/setup_diagram_database.py --source RUTA/.env
(o DIAGRAM_SOURCE_ENV=RUTA/.env). El .env de origen aporta usuario y contraseña.
"""

import argparse
import os
from pathlib import Path

import psycopg
from dotenv import dotenv_values, set_key
from psycopg import sql
from sqlalchemy.engine import make_url

TARGET = Path(__file__).resolve().parents[1] / ".env"


def _source_env(argv: list[str] | None) -> Path:
    parser = argparse.ArgumentParser(description="Prepara la BD aislada genova_diagramas")
    parser.add_argument("--source", default=os.getenv("DIAGRAM_SOURCE_ENV"), help=".env de origen")
    args = parser.parse_args(argv)
    if not args.source:
        parser.error("indica el .env de origen con --source o DIAGRAM_SOURCE_ENV")
    return Path(args.source)


def setup(argv: list[str] | None = None):
    source = _source_env(argv)
    database_url = dotenv_values(source).get("DATABASE_URL")
    if not database_url:
        raise SystemExit(f"{source} no define DATABASE_URL")
    url = make_url(database_url)
    url = url.set(
        drivername="postgresql+psycopg", host="localhost", port=5434, database="genova_diagramas"
    )
    connection = {
        "host": url.host,
        "port": url.port,
        "user": url.username,
        "password": url.password,
        "dbname": "postgres",
    }
    with psycopg.connect(**connection, autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)
        ).fetchone()
        if not exists:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(url.database)))
    set_key(str(TARGET), "DATABASE_URL", url.render_as_string(hide_password=False))
    print("BD aislada genova_diagramas preparada en localhost:5434; .env local actualizado")


if __name__ == "__main__":
    setup()
