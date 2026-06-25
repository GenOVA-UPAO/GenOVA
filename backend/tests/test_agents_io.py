#!/usr/bin/env python3
"""
Test de entrada/salida para recursos ENGAGE y EXPLORE.

Uso:
    pip install requests
    python tests/test_agents_io.py

    # Cambiar BASE si el backend corre en otro puerto:
    BASE=http://localhost:8000 python tests/test_agents_io.py
"""

import os
import sys
import time

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instala con: pip install requests")
    sys.exit(1)

BASE = os.getenv("BASE", "http://localhost:8000")
EMAIL = os.getenv("EMAIL", "admin@genova.ai")
PASS = os.getenv("PASS", "admin1234password")

CONCEPT = "Árboles de decisión"

# Todos los resource_type de cada fase (1–10)
ENGAGE_TYPES = list(range(1, 11))
EXPLORE_TYPES = list(range(1, 11))

TEST_CASES = [("engage", t, CONCEPT) for t in ENGAGE_TYPES] + [
    ("explore", t, CONCEPT) for t in EXPLORE_TYPES
]


# ── helpers ──────────────────────────────────────────────────────────────────


def sep(title: str, char: str = "─") -> None:
    print(f"\n{char * 60}")
    print(f"  {title}")
    print(char * 60)


def auth() -> str:
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": EMAIL, "password": PASS},
        timeout=10,
    )
    r.raise_for_status()
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        raise ValueError(f"No access_token en respuesta: {r.json()}")
    return token


def list_recursos(token: str, phase: str) -> list[dict]:
    r = requests.get(
        f"{BASE}/api/agents/{phase}/recursos",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("recursos", [])


def generate(token: str, phase: str, resource_type: int, concept: str):
    t0 = time.time()
    r = requests.post(
        f"{BASE}/api/agents/{phase}/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"resource_type": resource_type, "concept": concept},
        timeout=180,
    )
    elapsed = time.time() - t0
    return (
        r.status_code,
        r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text,
        elapsed,
    )


# ── main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    print(f"Backend : {BASE}")
    print(f"Email   : {EMAIL}")

    # 1. Auth
    print("\nAutenticando...")
    try:
        token = auth()
        print("✓ Token obtenido")
    except Exception as e:
        print(f"✗ Auth falló: {e}")
        sys.exit(1)

    # 2. Catálogo de recursos disponibles
    for phase in ("engage", "explore"):
        sep(f"Catálogo {phase.upper()}")
        recursos = list_recursos(token, phase)
        for r in recursos:
            print(
                f"  [{r['id']:2d}] {r.get('emoji', '')}{r['tipo']:<30} {r['duracion']:<12} {r['interactividad']}"
            )

    # 3. Tests de generación agrupados por fase
    passed = failed = 0
    current_phase = None

    for phase, rtype, concept in TEST_CASES:
        if phase != current_phase:
            current_phase = phase
            sep(f"PRUEBAS — {phase.upper()}  (concepto: '{concept}')", "═")
        print(f"\n▶ [{phase.upper():7s} #{rtype:2d}] concepto='{concept}'")
        print(f"  ENTRADA → phase={phase!r}, resource_type={rtype}, concept={concept!r}")

        try:
            status_code, result, elapsed = generate(token, phase, rtype, concept)
        except requests.Timeout:
            print("  SALIDA  ← ✗ TIMEOUT (>180s)")
            failed += 1
            continue
        except Exception as e:
            print(f"  SALIDA  ← ✗ ERROR: {e}")
            failed += 1
            continue

        if status_code != 200:
            print(f"  SALIDA  ← ✗ HTTP {status_code}")
            print(f"    detalle: {str(result)[:200]}")
            failed += 1
            continue

        passed += 1
        html = result.get("html_content") or ""
        raw = result.get("raw_json")
        html_ok = "✓" if html.strip() else "✗ VACÍO"

        print(f"  SALIDA  ← ✓ HTTP 200  ({elapsed:.1f}s)")
        print(f"    tipo          : {result.get('tipo')}")
        print(f"    concepto      : {result.get('concepto')}")
        print(f"    interactividad: {result.get('interactividad')}")
        print(f"    duracion      : {result.get('duracion')}")
        print(f"    html_content  : {len(html):>6} chars  {html_ok}")

        if isinstance(raw, dict):
            print(f"    raw_json keys : {list(raw.keys())}")
            for k, v in raw.items():
                preview = str(v)[:100].replace("\n", " ")
                print(f"      {k}: {preview}")
        elif isinstance(raw, list):
            print(f"    raw_json      : list de {len(raw)} items")
            if raw:
                print(
                    f"      [0] keys: {list(raw[0].keys()) if isinstance(raw[0], dict) else type(raw[0]).__name__}"
                )
        else:
            print(f"    raw_json      : {type(raw).__name__} = {str(raw)[:80]}")

    # 4. Resumen
    sep("RESUMEN")
    total = passed + failed
    print(f"  Pasaron : {passed}/{total}")
    print(f"  Fallaron: {failed}/{total}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
