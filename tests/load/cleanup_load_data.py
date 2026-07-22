"""Borra los datos que deja la prueba de carga.

La suite marca todo lo que crea con el prefijo ``[carga]`` en el título del OVA
y con el dominio ``@test.genova.ai`` en las cuentas. Este script inicia sesión
como administrador, manda esos OVAs a la papelera, los borra de forma
permanente y desactiva las cuentas de prueba (la API no expone borrado de
usuarios por administrador, sólo cambio de estado).

Uso:  python tests/load/cleanup_load_data.py [http://localhost:8000]
"""

import os
import re
import sys

import requests

MARCA = "[carga]"
# Igual que en locustfile.py: requests no reenvía la cookie Secure sobre
# http://localhost, así que se reinyecta sin el flag tras iniciar sesión.
_TOKEN_RE = re.compile(r"genova_token=([^;]+)")


def _fijar_cookie(ses: requests.Session, response: requests.Response) -> None:
    token = response.cookies.get("genova_token")
    if not token:
        match = _TOKEN_RE.search(response.headers.get("Set-Cookie") or "")
        token = match.group(1) if match else None
    if token:
        ses.cookies.set("genova_token", token, path="/")
DOMINIO_CARGA = "@test.genova.ai"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@genova.ai")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin1234password")


def _paginar(ses: requests.Session, base: str, ruta: str, clave: str) -> list[dict]:
    filas: list[dict] = []
    pagina = 1
    while True:
        resp = ses.get(
            f"{base}{ruta}", params={"page": pagina, "limit": 100}, timeout=30
        )
        if resp.status_code != 200:
            break
        datos = resp.json()
        lote = datos.get(clave) or datos.get("items") or []
        filas.extend(lote)
        total = datos.get("total_pages") or 1
        if pagina >= total or not lote:
            break
        pagina += 1
    return filas


def _por_lotes(ids: list[str], tam: int = 25):
    for inicio in range(0, len(ids), tam):
        yield ids[inicio : inicio + tam]


def _purgar_ovas(ses: requests.Session, base: str) -> int:
    """`GET /api/ovas` sólo lista los del usuario en sesión: hay que pasar por
    cada cuenta que la carga usó, no basta con la de administrador."""
    ovas = _paginar(ses, base, "/api/ovas", "ovas")
    marcados = [o["id"] for o in ovas if MARCA in (o.get("title") or "")]
    # En lotes: borrar cientos de OVAs de una vez también borra su zip SCORM en
    # Storage y una sola petición se pasa del timeout.
    for trozo in _por_lotes(marcados):
        ses.post(f"{base}/api/ovas/lote/papelera", json={"ova_ids": trozo}, timeout=180)

    papelera = _paginar(ses, base, "/api/ovas/papelera", "ovas")
    a_borrar = [o["id"] for o in papelera if MARCA in (o.get("title") or "")]
    for trozo in _por_lotes(a_borrar):
        ses.request(
            "DELETE",
            f"{base}/api/ovas/lote/permanente",
            json={"ova_ids": trozo},
            timeout=300,
        )
    return len(a_borrar)


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    cuentas = [
        (os.getenv("EMAIL", "user@genova.ai"), os.getenv("PASS", "user1234password")),
        (ADMIN_EMAIL, ADMIN_PASS),
    ]
    ses = requests.Session()
    borrados = 0
    for correo, clave in cuentas:
        login = ses.post(
            f"{base}/api/auth/login", json={"email": correo, "password": clave}, timeout=30
        )
        if login.status_code != 200:
            print(f"[limpieza] login de {correo} falló ({login.status_code})")
            continue
        _fijar_cookie(ses, login)
        borrados += _purgar_ovas(ses, base)
    print(f"[limpieza] OVAs de carga eliminados: {borrados}")

    # La sesión quedó como administrador: es quien puede listar y desactivar cuentas.
    usuarios = _paginar(ses, base, "/api/users", "users")
    desactivados = 0
    for usuario in usuarios:
        if DOMINIO_CARGA in (usuario.get("email") or "") and usuario.get(
            "is_active", True
        ):
            resp = ses.patch(
                f"{base}/api/users/{usuario['id']}/status",
                json={"is_active": False},
                timeout=30,
            )
            desactivados += 1 if resp.status_code == 200 else 0
    print(f"[limpieza] cuentas de carga desactivadas: {desactivados}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
