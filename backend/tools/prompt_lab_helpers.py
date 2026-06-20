#!/usr/bin/env python3
"""Shared helpers, paths, config, and quality checks for Prompt Lab tools."""

import os
import re
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instala con: pip install requests")
    raise SystemExit(1) from None

# ── Paths ─────────────────────────────────────────────────────────────────────

TOOL_DIR = Path(__file__).parent
BACKEND_DIR = TOOL_DIR.parent
OUTPUTS_DIR = TOOL_DIR / "outputs"
WINNERS_DIR = TOOL_DIR / "winners"
LOG_FILE = TOOL_DIR / "prompt_lab_log.jsonl"

# ── Config ────────────────────────────────────────────────────────────────────

BASE = os.getenv("BASE", "http://localhost:8000")
EMAIL = os.getenv("EMAIL", "admin@genova.ai")
PASS = os.getenv("PASS", "admin1234password")

RESOURCE_LABELS = {
    "engage": {
        1: "Cómic Interactivo",
        2: "Video Opening",
        3: "Micro-Podcast",
        4: "Juego de Gamificación",
        5: "Dilema Ético",
        6: "Noticia de Impacto",
        7: "Juego de Roles",
        8: "Timeline Interactivo",
        9: "Escape Room Virtual",
        10: "Simulador Intuitivo",
    },
    "explore": {
        1: "Simulador Virtual Lab",
        2: "Agente Socrático",
        3: "Juego Drag & Drop",
        4: "Video con Pausa Activa",
        5: "Lectura Interactiva",
        6: "Simulador de Slider",
        7: "Experimento Guiado",
        8: "Juego de Roles",
        9: "Mapa Mental",
        10: "Lab de Hipótesis",
    },
}

# Checks rápidos inline (sin importar BeautifulSoup)
FORBIDDEN_CDN = [
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "unpkg.com",
    "code.jquery.com",
    "stackpath.bootstrapcdn.com",
]
SCORM_REQUIRED = ["_scormInit", "_scormComplete", "cmi.core.lesson_status"]


# ── API helpers ───────────────────────────────────────────────────────────────


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


def generate(token: str, phase: str, rtype: int, concept: str) -> tuple:
    t0 = time.time()
    r = requests.post(
        f"{BASE}/api/agents/{phase}/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"resource_type": rtype, "concept": concept},
        timeout=180,
    )
    elapsed = time.time() - t0
    r.raise_for_status()
    return r.json(), elapsed


# ── Quality quick-check ───────────────────────────────────────────────────────


def quick_check(html: str) -> dict:
    html_lower = html.lower()
    cdn_found = [c for c in FORBIDDEN_CDN if c in html_lower]
    scorm_ok = all(s in html for s in SCORM_REQUIRED)
    return {"chars": len(html), "cdn": cdn_found, "scorm": scorm_ok}


def fmt_check(chk: dict) -> str:
    cdn_part = "CDN: NO" if not chk["cdn"] else f"CDN: ⚠ {', '.join(chk['cdn'])}"
    scorm_part = "SCORM: SÍ" if chk["scorm"] else "SCORM: ✗"
    ok = "✓" if not chk["cdn"] and chk["scorm"] and chk["chars"] > 0 else "⚠"
    return f"{ok} {chk['chars']:>6} chars | {cdn_part} | {scorm_part}"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]
