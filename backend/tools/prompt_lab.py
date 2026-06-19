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
import sys
from pathlib import Path

# ── Paths para imports de agents.* y tests/specs/* ────────────────────────────
_TOOL_DIR    = Path(__file__).parent
_BACKEND_DIR = _TOOL_DIR.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "tests"))

from tools.prompt_lab_core import run_lab  # noqa: E402
from tools.prompt_lab_dryrun import show_dry_run  # noqa: E402
from tools.prompt_lab_helpers import RESOURCE_LABELS  # noqa: E402

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
