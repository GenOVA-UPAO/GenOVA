"""Graba los cassettes LLM del pipeline de generación (uno por tipo de recurso).

Corre el pipeline REAL (ver scripts/llm_replay.py) contra OpenRouter con
deepseek/deepseek-v4-flash para cada (fase, tipo de recurso) y guarda las
respuestas en tests/fixtures/llm_cassettes/<fase>_<NN>.json. Los tests
(`tests/test_resource_generation_replay.py`) las reproducen sin red ni claves.

Uso (desde backend/, con la clave SOLO en el entorno del proceso):

    OPENROUTER_API_KEY=sk-or-... RAG_DISABLED=1 LANGSMITH_TRACING=false \\
        python -m scripts.record_llm_cassettes --only evaluate:1 --cap-usd 0.15
    python -m scripts.record_llm_cassettes --skip-existing      # lo que falte
    python -m scripts.record_llm_cassettes --ova                # + OVA completo (editor)

Controla el gasto consultando /api/v1/key de OpenRouter antes y después de cada
recurso: se detiene en cuanto el gasto de la ejecución supera `--cap-usd`.
Los cassettes nunca guardan claves ni cabeceras (solo extractos del prompt y la
respuesta).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts import llm_replay as rp  # noqa: E402


def _usage_usd() -> float | None:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return None
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/key", headers={"Authorization": f"Bearer {key}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310 — URL fija
            return float(json.load(resp)["data"]["usage"])
    except Exception as exc:  # noqa: BLE001
        print(f"  (no se pudo leer el gasto: {type(exc).__name__})")
        return None


def _selected(only: list[str]) -> list[tuple[str, int]]:
    todos = rp.all_resources()
    if not only:
        return todos
    wanted = set()
    for item in only:
        for part in item.split(","):
            phase, _, rt = part.strip().partition(":")
            wanted.add((phase, int(rt)))
    unknown = wanted - set(todos)
    if unknown:
        sys.exit(f"Recursos desconocidos: {sorted(unknown)}")
    return [r for r in todos if r in wanted]


def _record_resource(phase: str, rt: int) -> str:
    from llm.cassette import RECORD, use_cassette

    with rp.offline_env(), use_cassette(rp.cassette_path(phase, rt), RECORD) as c:
        run = rp.run_resource(phase, rt)
    errors = sum(1 for e in c.entries if "error" in e)
    return (
        f"{len(c.entries)} llamadas ({errors} con error), {len(run.html)} chars HTML, "
        f"defectos={len(run.defects)}, crítico={run.critic.get('puntaje')}, {run.seconds}s"
    )


def _record_ova() -> str:
    from llm.cassette import RECORD, use_cassette

    base = [rp.cassette_path(p, n) for p, n in rp.OVA_RESOURCES]
    missing = [str(b.name) for b in base if not b.exists()]
    if missing:
        return f"faltan los cassettes de recurso {missing}: grábalos antes"
    # Lo ya grabado por recurso se reutiliza gratis; solo lo nuevo (editor,
    # repair…) se paga y queda en ova_full.json.
    with rp.offline_env(), use_cassette(rp.CASSETTE_DIR / rp.OVA_CASSETTE, RECORD, base=base) as c:
        out = rp.run_ova()
    return f"{len(c.entries)} llamadas nuevas, {len(out.get('results', []))} recursos, estado={out.get('ova_status')}"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument(
        "--only", action="append", default=[], help="fase:tipo (repetible o separado por comas)"
    )
    ap.add_argument(
        "--skip-existing", action="store_true", help="no regraba cassettes que ya existen"
    )
    ap.add_argument("--cap-usd", type=float, default=0.15, help="tope de gasto de esta ejecución")
    ap.add_argument("--ova", action="store_true", help="graba también el OVA completo (editor)")
    ap.add_argument("--no-resources", action="store_true", help="solo --ova, sin recursos")
    args = ap.parse_args()

    if not os.getenv("OPENROUTER_API_KEY"):
        sys.exit("Falta OPENROUTER_API_KEY en el entorno (nunca en archivos del repo).")
    os.environ.setdefault("RAG_DISABLED", "1")

    start = _usage_usd()
    print(f"Gasto inicial de la clave: {start}")
    todo = [] if args.no_resources else _selected(args.only)
    failed: list[tuple[str, str]] = []

    def spent() -> float:
        now = _usage_usd()
        return (now - start) if (now is not None and start is not None) else 0.0

    for phase, rt in todo:
        path = rp.cassette_path(phase, rt)
        if args.skip_existing and path.exists():
            continue
        print(f"→ {phase}:{rt} …", flush=True)
        try:
            print(f"  ok: {_record_resource(phase, rt)}")
        except Exception as exc:  # noqa: BLE001 — se informa y se sigue
            failed.append((f"{phase}:{rt}", f"{type(exc).__name__}: {exc}"[:300]))
            print(f"  FALLO: {failed[-1][1]}")
        gasto = spent()
        print(f"  gasto acumulado: ${gasto:.4f}", flush=True)
        if gasto > args.cap_usd:
            print(f"Tope de ${args.cap_usd} superado: se detiene la grabación.")
            break
    if args.ova and spent() <= args.cap_usd:
        print(f"→ OVA completo: {_record_ova()}")
    print(f"Gasto total de la ejecución: ${spent():.4f}")
    for name, err in failed:
        print(f"  no grabado {name}: {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
