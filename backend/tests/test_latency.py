#!/usr/bin/env python3
"""
Benchmark de latencia para verificación del OE1.

Mide tiempos de respuesta en endpoints no-LLM (CRUD, auth, salud).
Usa el header X-Process-Time-Ms (tiempo servidor) cuando está disponible;
si no, mide tiempo cliente con time.perf_counter().

Uso:
    pip install requests
    python tests/test_latency.py

Variables de entorno:
    BASE   — URL base del backend  (default: http://localhost:8000)
    EMAIL  — email de prueba       (default: admin@genova.ai)
    PASS   — contraseña de prueba  (default: admin1234password)
    SAMPLES — peticiones por endpoint (default: 10)
"""

import os
import statistics
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
SAMPLES = int(os.getenv("SAMPLES", "10"))

# OE1 metric: max average latency for non-LLM endpoints.
THRESHOLD_MS = 278.0

# Endpoints within scope of the OE1 metric (no LLM calls).
ENDPOINTS = [
    ("GET", "/health", False),
    ("GET", "/api/health", False),
    ("GET", "/api/db/health", False),
    ("GET", "/api/auth/me", True),
    ("GET", "/api/ovas", True),
    ("GET", "/api/ovas?page=1&limit=10", True),
    ("GET", "/api/roles", True),
]


def sep(title: str, char: str = "─") -> None:
    print(f"\n{char * 62}")
    print(f"  {title}")
    print(char * 62)


def auth() -> str:
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": EMAIL, "password": PASS},
        timeout=10,
    )
    if r.status_code != 200:
        print(f"✗ Login falló ({r.status_code}): {r.text[:200]}")
        sys.exit(1)
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        print(f"✗ Respuesta de login sin token: {r.json()}")
        sys.exit(1)
    return token


def measure_endpoint(method: str, path: str, token: str | None, n: int) -> list[float]:
    """Returns list of latency values in ms (server-side if header present, else client-side)."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    samples: list[float] = []
    for _ in range(n):
        t0 = time.perf_counter()
        try:
            r = requests.request(method, f"{BASE}{path}", headers=headers, timeout=15)
        except requests.exceptions.ConnectionError:
            print(f"  ✗ No se puede conectar a {BASE}. ¿Está corriendo el backend?")
            sys.exit(1)
        client_ms = (time.perf_counter() - t0) * 1000

        # Prefer server-side timing (excludes network overhead)
        server_header = r.headers.get("X-Process-Time-Ms")
        ms = float(server_header) if server_header else client_ms
        samples.append(ms)

    return samples


def print_stats(path: str, samples: list[float], use_server_time: bool) -> bool:
    avg = statistics.mean(samples)
    p95 = sorted(samples)[int(len(samples) * 0.95) - 1] if len(samples) >= 2 else samples[0]
    p_min = min(samples)
    p_max = max(samples)
    passed = avg <= THRESHOLD_MS
    icon = "✓" if passed else "✗"
    source = "srv" if use_server_time else "cli"
    print(
        f"  {icon} {path:<40} avg={avg:6.1f}ms  p95={p95:6.1f}ms"
        f"  min={p_min:5.1f}  max={p_max:5.1f}  [{source}]"
    )
    return passed


def main() -> None:
    sep("OE1 — Benchmark de Latencia GenOVA", "═")
    print(f"  Backend: {BASE}")
    print(f"  Muestras por endpoint: {SAMPLES}")
    print(f"  Umbral OE1: {THRESHOLD_MS:.0f}ms (promedio)")

    sep("Autenticando…")
    token = auth()
    print("  ✓ Token obtenido")

    sep(f"Midiendo {len(ENDPOINTS)} endpoints ({SAMPLES} muestras c/u)…")

    # Check if server-side timing header is available
    probe = requests.get(f"{BASE}/health", timeout=5)
    has_server_header = "X-Process-Time-Ms" in probe.headers
    if has_server_header:
        print("  ✓ X-Process-Time-Ms header detectado — usando tiempo servidor")
    else:
        print("  ⚠ X-Process-Time-Ms no disponible — usando tiempo cliente (incluye red)")

    results: list[bool] = []
    for method, path, needs_auth in ENDPOINTS:
        t = token if needs_auth else None
        samples = measure_endpoint(method, path, t, SAMPLES)
        passed = print_stats(path, samples, has_server_header)
        results.append(passed)

    sep("Resultado OE1", "═")
    total = len(results)
    passed_count = sum(results)
    if all(results):
        print(f"  ✓ PASA — {passed_count}/{total} endpoints bajo {THRESHOLD_MS:.0f}ms promedio")
    else:
        failed = [ENDPOINTS[i][1] for i, ok in enumerate(results) if not ok]
        print(f"  ✗ FALLA — {total - passed_count}/{total} endpoints sobre umbral:")
        for ep in failed:
            print(f"      • {ep}")
    print()


if __name__ == "__main__":
    main()
