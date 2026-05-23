#!/usr/bin/env python3
"""
Quality gate para recursos ENGAGE y EXPLORE.
Complementa test_agents_io.py (smoke test) con checks de calidad del HTML generado:
  - Longitud mínima
  - Sin dependencias CDN externas
  - Callbacks SCORM presentes
  - Tags HTML requeridos por tipo de recurso
  - Patrones JS/texto requeridos por tipo de recurso

Uso:
    pip install requests beautifulsoup4
    python tests/test_resource_quality.py

    # Filtrar por fase y tipo:
    PHASE=engage TYPE=1 CONCEPT="Redes neuronales" python tests/test_resource_quality.py
"""
import os
import sys
import time

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instala con: pip install requests")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Falta 'beautifulsoup4'. Instala con: pip install beautifulsoup4")
    sys.exit(1)

# Importar spec desde backend/tests/specs/
sys.path.insert(0, os.path.dirname(__file__))
from specs.resource_quality_spec import QUALITY_BY_PHASE, FORBIDDEN_CDN, SCORM_REQUIRED

BASE    = os.getenv("BASE",    "http://localhost:8000")
EMAIL   = os.getenv("EMAIL",   "admin@genova.ai")
PASS    = os.getenv("PASS",    "admin1234password")
CONCEPT = os.getenv("CONCEPT", "Árboles de decisión")

PHASE_FILTER = os.getenv("PHASE", "")  # "engage" | "explore" | ""
TYPE_FILTER  = os.getenv("TYPE",  "")  # "1"–"10" | ""


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def generate(token: str, phase: str, resource_type: int, concept: str):
    t0 = time.time()
    r = requests.post(
        f"{BASE}/api/agents/{phase}/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"resource_type": resource_type, "concept": concept},
        timeout=180,
    )
    elapsed = time.time() - t0
    ct = r.headers.get("content-type", "")
    body = r.json() if "application/json" in ct else r.text
    return r.status_code, body, elapsed


def check_html_quality(html: str, spec: dict) -> list[str]:
    """Devuelve lista de fallas. Vacía = todo OK."""
    failures = []
    html_lower = html.lower()

    if len(html) < spec["min_chars"]:
        failures.append(
            f"html demasiado corto: {len(html)} chars < {spec['min_chars']} requeridos"
        )

    for cdn in FORBIDDEN_CDN:
        if cdn in html_lower:
            failures.append(f"CDN externo detectado: {cdn}")

    for token in SCORM_REQUIRED:
        if token not in html:
            failures.append(f"SCORM faltante: '{token}'")

    soup = BeautifulSoup(html, "html.parser")
    for tag in spec["required_tags"]:
        if not soup.find(tag):
            failures.append(f"tag HTML faltante: <{tag}>")

    for pattern in spec.get("required_patterns", []):
        if pattern.lower() not in html_lower:
            failures.append(f"patrón faltante en HTML: '{pattern}'")

    return failures


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Backend : {BASE}")
    print(f"Concepto: {CONCEPT}")
    if PHASE_FILTER:
        suffix = f" type={TYPE_FILTER}" if TYPE_FILTER else ""
        print(f"Filtro  : phase={PHASE_FILTER}{suffix}")

    print("\nAutenticando...")
    try:
        token = auth()
        print("✓ Token obtenido")
    except Exception as e:
        print(f"✗ Auth falló: {e}")
        sys.exit(1)

    # Construir casos de prueba según filtros
    test_cases = []
    for phase, quality in QUALITY_BY_PHASE.items():
        if PHASE_FILTER and phase != PHASE_FILTER:
            continue
        for rtype, spec in quality.items():
            if TYPE_FILTER and str(rtype) != TYPE_FILTER:
                continue
            test_cases.append((phase, rtype, spec))

    passed = failed = 0
    current_phase = None

    for phase, rtype, spec in test_cases:
        if phase != current_phase:
            current_phase = phase
            sep(f"QUALITY CHECKS — {phase.upper()}  (concepto: '{CONCEPT}')", "═")

        label = spec["label"]
        print(f"\n▶ [{phase.upper():7s} #{rtype:2d}] {label}")

        try:
            status_code, result, elapsed = generate(token, phase, rtype, CONCEPT)
        except requests.Timeout:
            print("  ✗ TIMEOUT (>180s)")
            failed += 1
            continue
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            failed += 1
            continue

        if status_code != 200:
            print(f"  ✗ HTTP {status_code}: {str(result)[:120]}")
            failed += 1
            continue

        html = result.get("html_content") or "" if isinstance(result, dict) else ""
        if not html.strip():
            print(f"  ✗ html_content vacío  ({elapsed:.1f}s)")
            failed += 1
            continue

        failures = check_html_quality(html, spec)

        if failures:
            print(f"  ✗ FALLÓ  ({elapsed:.1f}s, {len(html)} chars)")
            for f in failures:
                print(f"      • {f}")
            failed += 1
        else:
            print(f"  ✓ PASÓ   ({elapsed:.1f}s, {len(html)} chars)")
            passed += 1

    sep("RESUMEN")
    total = passed + failed
    print(f"  Pasaron : {passed}/{total}")
    print(f"  Fallaron: {failed}/{total}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
