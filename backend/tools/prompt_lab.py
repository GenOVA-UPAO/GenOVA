#!/usr/bin/env python3
"""
Prompt Lab — genera un recurso N veces, abre en browser y guarda el mejor.
Herramienta SDD: itera hasta que el resultado pase los quality checks del spec.

Uso:
    python tools/prompt_lab.py --phase engage --type 1 --concept "Redes neuronales"
    python tools/prompt_lab.py --phase explore --type 3 --concept "K-Means" --n 2
    python tools/prompt_lab.py --phase engage --type 10 --concept "Backprop" --dry-run
    python tools/prompt_lab.py --phase engage --type 1 --concept "texto" --n 1 --no-open

Variables de entorno:
    BASE   (default: http://localhost:8000)
    EMAIL  (default: admin@genova.ai)
    PASS   (default: admin1234password)
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import webbrowser
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instala con: pip install requests")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────

TOOL_DIR    = Path(__file__).parent
BACKEND_DIR = TOOL_DIR.parent
OUTPUTS_DIR = TOOL_DIR / "outputs"
WINNERS_DIR = TOOL_DIR / "winners"
LOG_FILE    = TOOL_DIR / "prompt_lab_log.jsonl"

# Para imports de agents.* y tests/specs/*
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "tests"))

# ── Config ────────────────────────────────────────────────────────────────────

BASE  = os.getenv("BASE",  "http://localhost:8000")
EMAIL = os.getenv("EMAIL", "admin@genova.ai")
PASS  = os.getenv("PASS",  "admin1234password")

RESOURCE_LABELS = {
    "engage": {
        1: "Cómic Interactivo",    2: "Video Opening",         3: "Micro-Podcast",
        4: "Juego de Gamificación", 5: "Dilema Ético",          6: "Noticia de Impacto",
        7: "Juego de Roles",       8: "Timeline Interactivo",  9: "Escape Room Virtual",
        10: "Simulador Intuitivo",
    },
    "explore": {
        1: "Simulador Virtual Lab", 2: "Agente Socrático",      3: "Juego Drag & Drop",
        4: "Video con Pausa Activa", 5: "Lectura Interactiva",  6: "Simulador de Slider",
        7: "Experimento Guiado",   8: "Juego de Roles",         9: "Mapa Mental",
        10: "Lab de Hipótesis",
    },
}

# Checks rápidos inline (sin importar BeautifulSoup)
FORBIDDEN_CDN = [
    "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com",
    "code.jquery.com", "stackpath.bootstrapcdn.com",
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


def generate(token: str, phase: str, rtype: int, concept: str) -> tuple[dict, float]:
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
    cdn_found  = [c for c in FORBIDDEN_CDN if c in html_lower]
    scorm_ok   = all(s in html for s in SCORM_REQUIRED)
    return {"chars": len(html), "cdn": cdn_found, "scorm": scorm_ok}


def fmt_check(chk: dict) -> str:
    cdn_part   = "CDN: NO" if not chk["cdn"] else f"CDN: ⚠ {', '.join(chk['cdn'])}"
    scorm_part = "SCORM: SÍ" if chk["scorm"] else "SCORM: ✗"
    ok = "✓" if not chk["cdn"] and chk["scorm"] and chk["chars"] > 0 else "⚠"
    return f"{ok} {chk['chars']:>6} chars | {cdn_part} | {scorm_part}"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]


# ── Dry-run ───────────────────────────────────────────────────────────────────

def show_dry_run(phase: str, rtype: int, concept: str) -> None:
    try:
        if phase == "engage":
            from agents.engage_prompts import prompt_html, prompt_simulador, prompt_texto
            if rtype == 10:
                print("\n── prompt_simulador ──────────────────────────────────")
                print(prompt_simulador(concept))
            else:
                print("\n── prompt_texto (paso 1) ─────────────────────────────")
                print(prompt_texto(rtype, concept))
                print("\n── prompt_html (paso 2) ──────────────────────────────")
                print(prompt_html(rtype, concept, '{"placeholder": "...JSON del paso 1..."}'))
        else:
            from agents.explore_prompts import CODE_ONLY, prompt_codigo, prompt_html, prompt_texto
            if rtype in CODE_ONLY:
                print("\n── prompt_codigo ─────────────────────────────────────")
                print(prompt_codigo(rtype, concept))
            else:
                print("\n── prompt_texto (paso 1) ─────────────────────────────")
                print(prompt_texto(rtype, concept))
                print("\n── prompt_html (paso 2) ──────────────────────────────")
                print(prompt_html(rtype, concept, '{"placeholder": "...JSON del paso 1..."}'))
    except ImportError as e:
        print(f"✗ No se pudo importar prompts: {e}")
        print("  Ejecuta desde backend/ o con el venv activado.")


# ── Lab loop ──────────────────────────────────────────────────────────────────

def run_lab(phase: str, rtype: int, concept: str, n: int, open_browser: bool) -> None:
    label = RESOURCE_LABELS.get(phase, {}).get(rtype, f"type-{rtype}")
    ts    = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = OUTPUTS_DIR / f"{phase}_{rtype}_{ts}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'─'*62}")
    print(f"  Prompt Lab  —  {phase.upper()} #{rtype}: {label}")
    print(f"  Concepto    :  {concept}")
    print(f"  Iteraciones :  {n}  (~{13 * n}s estimado)")
    if n > 3:
        print(f"  ⚠  n={n} puede provocar rate limit 429; se esperará 60s si ocurre.")
    print("─"*62)

    print("\nAutenticando...")
    try:
        token = auth()
        print("✓ Token obtenido\n")
    except Exception as e:
        print(f"✗ Auth falló: {e}")
        sys.exit(1)

    while True:  # bucle de regeneración ("r")
        html_files: list[Path | None] = []
        checks:     list[dict]        = []

        for i in range(1, n + 1):
            print(f"▶ Generando iteración {i}/{n}...", end=" ", flush=True)
            attempt = 0
            while True:
                try:
                    result, elapsed = generate(token, phase, rtype, concept)
                    html = result.get("html_content") or ""
                    chk  = quick_check(html)
                    print(f"({elapsed:.1f}s)  {fmt_check(chk)}")
                    out_file = out_dir / f"iter_{i}.html"
                    out_file.write_text(html, encoding="utf-8")
                    html_files.append(out_file)
                    checks.append(chk)
                    break
                except requests.HTTPError as e:
                    code = e.response.status_code if e.response is not None else 0
                    if code == 429 and attempt == 0:
                        print("429 — esperando 60s...", end=" ", flush=True)
                        time.sleep(60)
                        attempt += 1
                    else:
                        print(f"✗ HTTP {code}: {e}")
                        html_files.append(None)
                        checks.append({"chars": 0, "cdn": [], "scorm": False})
                        break
                except Exception as e:
                    print(f"✗ {e}")
                    html_files.append(None)
                    checks.append({"chars": 0, "cdn": [], "scorm": False})
                    break

        # Tabla resumen
        print(f"\n{'─'*62}")
        print("  Resumen de iteraciones:")
        for i, (f, chk) in enumerate(zip(html_files, checks, strict=True), 1):
            path_info = f"→ {f.name}" if f else "→ FALLÓ"
            print(f"  Iter {i}: {fmt_check(chk)}  {path_info}")
        print("─"*62)

        # Abrir en browser
        if open_browser:
            opened = [f for f in html_files if f is not None]
            if opened:
                print("\nAbriendo en browser...")
                for f in opened:
                    webbrowser.open(f.as_uri())
                    time.sleep(0.4)

        # Selección interactiva
        valid_nums = [str(i) for i in range(1, n + 1)]
        opts = "/".join(valid_nums) + "/r=regenerar/s=saltar"
        while True:
            try:
                choice = input(f"\n¿Cuál fue el mejor? [{opts}]: ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                print("\nSaliendo.")
                return

            if choice in valid_nums:
                idx = int(choice) - 1
                src = html_files[idx]
                if src is None:
                    print("  Esa iteración falló, elige otra.")
                    continue

                WINNERS_DIR.mkdir(parents=True, exist_ok=True)
                dest_name = f"{phase}_{rtype}_{slug(concept)}.html"
                dest = WINNERS_DIR / dest_name
                shutil.copy2(src, dest)

                log_entry = {
                    "phase": phase,
                    "type": rtype,
                    "concept": concept,
                    "iter_selected": int(choice),
                    "chars": checks[idx]["chars"],
                    "cdn_ok": not checks[idx]["cdn"],
                    "scorm_ok": checks[idx]["scorm"],
                    "saved_as": str(dest),
                    "selected_at": datetime.now().isoformat(),
                }
                with LOG_FILE.open("a", encoding="utf-8") as lf:
                    lf.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

                print(f"\n✓ Guardado : {dest}")
                print(f"  Log      : {LOG_FILE}")
                return

            elif choice == "r":
                print("\n♻  Regenerando todas las iteraciones...\n")
                break  # sale del while de selección, repite el while True exterior

            elif choice == "s":
                print("  Saltado sin guardar.")
                return

            else:
                print(f"  Opción no válida. Usa: {opts}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prompt Lab — itera generación de recursos y guarda el mejor resultado"
    )
    parser.add_argument("--phase",   required=True, choices=["engage", "explore"])
    parser.add_argument("--type",    required=True, type=int, metavar="1-10")
    parser.add_argument("--concept", required=True, help="Concepto educativo a generar")
    parser.add_argument(
        "--n", type=int, default=3, metavar="1-5",
        help="Número de iteraciones (default: 3, max: 5)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Solo muestra el prompt que se enviaría, sin llamar a la API",
    )
    parser.add_argument(
        "--no-open", action="store_true",
        help="No abrir los HTMLs en browser automáticamente",
    )
    args = parser.parse_args()

    if args.type not in range(1, 11):
        parser.error("--type debe estar entre 1 y 10")

    n = max(1, min(5, args.n))

    if args.dry_run:
        label = RESOURCE_LABELS.get(args.phase, {}).get(args.type, f"type-{args.type}")
        print(f"\nDRY RUN — {args.phase.upper()} #{args.type}: {label}")
        print(f"Concepto: {args.concept}")
        show_dry_run(args.phase, args.type, args.concept)
        return

    run_lab(args.phase, args.type, args.concept, n, not args.no_open)


if __name__ == "__main__":
    main()
