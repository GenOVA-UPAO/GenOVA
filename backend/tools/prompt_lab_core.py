#!/usr/bin/env python3
"""Core lab loop for Prompt Lab — generate N iterations, pick the best."""

import json
import shutil
import sys
import time
import webbrowser
from datetime import datetime
from pathlib import Path

import requests

from tools.prompt_lab_helpers import (
    LOG_FILE,
    OUTPUTS_DIR,
    RESOURCE_LABELS,
    WINNERS_DIR,
    auth,
    fmt_check,
    generate,
    quick_check,
    slug,
)


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
