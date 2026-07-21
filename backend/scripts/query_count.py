"""Cuenta los round-trips SQL que hace cada endpoint caliente (RN-001).

El P90 de los endpoints con base de datos está dominado por la latencia de red
hacia Supabase, no por CPU: cada sentencia es una ida y vuelta. Esta herramienta
mide directamente la variable que sí controlamos —cuántas sentencias emite el
endpoint— para poder comparar antes/después de una optimización sin depender de
la red de la máquina que ejecuta la prueba de carga.

Uso (desde backend/, con el .env cargado):

    .venv/Scripts/python.exe scripts/query_count.py
    .venv/Scripts/python.exe scripts/query_count.py --include-register

`--include-register` crea un usuario real con un correo aleatorio; queda excluido
por defecto para no ensuciar la base.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import uuid
from collections.abc import Iterator
from contextlib import contextmanager

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import event  # noqa: E402

SEED_EMAIL = os.getenv("EMAIL", "user@genova.ai")
SEED_PASS = os.getenv("PASS", "user1234password")


@contextmanager
def counted(engine) -> Iterator[list[str]]:
    """Registra cada sentencia emitida sobre *engine* mientras dure el bloque."""
    statements: list[str] = []

    def _before(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
        statements.append(" ".join(statement.split())[:120])

    event.listen(engine, "before_cursor_execute", _before)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", _before)


def _report(label: str, statements: list[str], verbose: bool) -> None:
    print(f"\n{label}: {len(statements)} sentencias")
    if verbose:
        for i, stmt in enumerate(statements, 1):
            print(f"   {i:>2}. {stmt}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--include-register", action="store_true")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    from fastapi.testclient import TestClient

    from core.database import engine
    from main import app

    client = TestClient(app)

    with counted(engine) as stmts:
        resp = client.post("/api/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASS})
    if resp.status_code != 200:
        print(f"login falló ({resp.status_code}): {resp.text[:200]}", file=sys.stderr)
        return 1
    _report("POST /api/auth/login", stmts, args.verbose)

    # El backend puede emitir genova_token con Secure; el cliente de pruebas no lo
    # reenvía sobre http://testserver. Se reinyecta sin el flag, igual que hace
    # tests/load/locustfile.py.
    match = re.search(r"genova_token=([^;]+)", resp.headers.get("set-cookie") or "")
    if match:
        client.cookies.set("genova_token", match.group(1))

    with counted(engine) as stmts:
        resp = client.get("/api/ovas?page=1")
    if resp.status_code != 200:
        print(f"listado falló ({resp.status_code}): {resp.text[:200]}", file=sys.stderr)
        return 1
    _report("GET /api/ovas?page=1", stmts, args.verbose)

    if args.include_register:
        with counted(engine) as stmts:
            resp = client.post(
                "/api/auth/register",
                json={
                    "email": f"loadtest-{uuid.uuid4().hex[:12]}@genova.ai",
                    "password": "loadtest1234",
                    "full_name": "Medicion Carga",
                },
            )
        if resp.status_code not in (200, 201):
            print(f"registro falló ({resp.status_code}): {resp.text[:200]}", file=sys.stderr)
            return 1
        _report("POST /api/auth/register", stmts, args.verbose)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
