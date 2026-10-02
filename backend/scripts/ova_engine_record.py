"""Graba fixtures de ova_engine con texto REAL de un LLM (cassettes del motor nuevo).

    OVA_TEXT_BACKEND=local python scripts/ova_engine_record.py [fase[:rt] ...] [--force] [--jobs N]
        [--concept "texto"] [--out DIR]

Por cada plantilla: decide params (ova_engine.decision.decide) -> generate_json ->
backend/tests/fixtures/ova_engine/<fase>_<NN>.json con {concept, params, data}.
El concepto rota por una lista de 8 conceptos del curso (salvo --concept).
Registra tiempos y fallos de schema en <out>/_record_log.json.
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("OVA_TEXT_BACKEND", "local")

from ova_engine.decision import decide  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402
from ova_engine.text import generate_json  # noqa: E402

CONCEPTS = [
    "índices B-tree",
    "transacciones y aislamiento",
    "backup y recovery con RMAN",
    "roles y privilegios",
    "tablespaces y datafiles",
    "bloqueos y deadlocks",
    "optimización de consultas con planes de ejecución",
    "auditoría",
]
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "ova_engine"


def record(idx: int, spec, out: Path, force: bool, concept: str | None) -> dict:
    path = out / f"{spec.phase}_{spec.rt:02d}.json"
    if path.exists() and not force:
        return {"key": spec.key, "status": "skip"}
    concept = concept or CONCEPTS[idx % len(CONCEPTS)]
    params = decide(spec, concept, "")
    t0 = time.monotonic()
    try:
        data = generate_json(spec.prompt(concept, "", params), spec.schema(params))
    except Exception as exc:  # fallo de schema/JSON tras el reintento
        return {"key": spec.key, "status": "fail", "concept": concept, "error": str(exc)[:300],
                "seconds": round(time.monotonic() - t0, 1)}
    path.write_text(json.dumps({"concept": concept, "params": params, "data": data}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"key": spec.key, "status": "ok", "concept": concept, "seconds": round(time.monotonic() - t0, 1)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("filters", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--concept")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    items = [
        (i, s) for i, (k, s) in enumerate(sorted(all_specs().items()))
        if not a.filters or any(k == f or k.startswith(f + ":") or s.phase == f for f in a.filters)
    ]
    jobs = max(1, min(a.jobs, 2))  # GPU compartida
    results = []
    with ThreadPoolExecutor(jobs) as ex:
        for r in ex.map(lambda it: record(it[0], it[1], a.out, a.force, a.concept), items):
            print(json.dumps(r, ensure_ascii=False), flush=True)
            results.append(r)
    log = a.out / "_record_log.json"
    prev = json.loads(log.read_text()) if log.exists() else {}
    for r in results:
        if r["status"] != "skip":
            prev[r["key"]] = r
    log.write_text(json.dumps(prev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
