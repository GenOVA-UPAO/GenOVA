"""Provision the isolated benchmark database without printing credentials."""

from pathlib import Path

import psycopg
from dotenv import dotenv_values, set_key
from psycopg import sql
from sqlalchemy.engine import make_url

SOURCE = Path("/home/jeffryru/github/GenOVA/backend/.env")
TARGET = Path(__file__).resolve().parents[1] / ".env"


def setup():
    values = dotenv_values(SOURCE)
    url = make_url(values["DATABASE_URL"])
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
