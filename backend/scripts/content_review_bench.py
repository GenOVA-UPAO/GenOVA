"""Benchmark del revisor de contenido (ova_engine.review).

    OVA_TEXT_BACKEND=local python scripts/content_review_bench.py [--limit N] [--jobs 1]
        [--prefilter] [--out report.json]

Para cada fixture real (backend/tests/fixtures/ova_engine/*.json) mide:
  - limpia: falsos positivos (el revisor reporta algo aunque no se inyectó nada),
  - envenenada: se inyecta en 1 campo largo un párrafo de OTRO concepto
    (fuera_de_tema) o una afirmación falsa conocida del concepto (incorrecto);
    cuenta como detectada si el revisor marca EXACTAMENTE ese campo,
  - tiempo del revisor por recurso.
Objetivo: recall >= 0.8 con FP <= 0.15 (FP = recursos limpios con >=1 problema).
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import random
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("OVA_TEXT_BACKEND", "local")
# El Ollama de simulación se comparte: un timeout corto mide la cola de otros, no al revisor.
os.environ.setdefault("OVA_CONTENT_REVIEW_TIMEOUT_S", "240")

from ova_engine.review import iter_text_fields, review_fields, set_path  # noqa: E402

FIX = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "ova_engine"

# Párrafos de otros temas (para mezcla de conceptos) y afirmaciones falsas conocidas por concepto.
OFF_TOPIC = {
    "índices B-tree": "Un tablespace es la unidad lógica de almacenamiento que agrupa uno o más datafiles en disco; "
    "al crear uno se define su tamaño inicial, el autoextend y si es gestionado localmente.",
    "transacciones y aislamiento": "RMAN permite hacer backups incrementales de nivel 0 y 1 y restaurar datafiles "
    "individuales; el catálogo de recuperación guarda el historial de copias para el recovery.",
    "backup y recovery con RMAN": "Un deadlock ocurre cuando dos sesiones se bloquean mutuamente esperando cada una "
    "un recurso que tiene la otra; el motor elige una víctima y revierte su transacción.",
    "roles y privilegios": "Un índice B-tree mantiene las claves ordenadas en un árbol balanceado de páginas, lo que "
    "permite búsquedas, inserciones y borrados en tiempo logarítmico.",
    "tablespaces y datafiles": "Con GRANT y REVOKE se controlan los privilegios sobre objetos; los roles agrupan "
    "privilegios para asignarlos a varios usuarios de una sola vez.",
    "bloqueos y deadlocks": "La auditoría registra quién accedió a qué dato y cuándo, mediante políticas de auditoría "
    "unificada y pistas de auditoría almacenadas para cumplimiento normativo.",
    "optimización de consultas con planes de ejecución": "El nivel de aislamiento SERIALIZABLE evita lecturas sucias, "
    "no repetibles y fantasmas, a costa de más conflictos entre transacciones concurrentes.",
    "auditoría": "El optimizador compara planes de ejecución estimando costos con estadísticas de tablas e índices "
    "y elige el que usa menos lecturas lógicas y CPU.",
}
FALSE_CLAIMS = {
    "índices B-tree": "Un índice B-tree guarda las claves sin orden y por eso siempre es más lento que un full scan; "
    "además, cada búsqueda recorre todas las hojas del árbol de izquierda a derecha.",
    "transacciones y aislamiento": "El nivel READ UNCOMMITTED es el más estricto de todos: garantiza que ninguna "
    "transacción vea datos sin confirmar y evita todos los fenómenos de concurrencia.",
    "backup y recovery con RMAN": "RMAN solo puede hacer backups con la base de datos apagada y no permite "
    "backups incrementales ni restaurar archivos individuales.",
    "roles y privilegios": "Los roles solo pueden contener un único privilegio y al hacer REVOKE de un privilegio "
    "de sistema se eliminan automáticamente todos los objetos creados por el usuario.",
    "tablespaces y datafiles": "Un datafile puede pertenecer a varios tablespaces a la vez y un tablespace se "
    "almacena en la memoria RAM, no en disco.",
    "bloqueos y deadlocks": "Un deadlock se resuelve esperando más tiempo: el motor nunca aborta ninguna "
    "transacción porque los bloqueos exclusivos permiten que ambas sesiones escriban a la vez.",
    "optimización de consultas con planes de ejecución": "El plan de ejecución se calcula después de ejecutar la "
    "consulta y un full table scan siempre es preferible a un índice, sin importar la selectividad.",
    "auditoría": "La auditoría impide por completo que ocurran accesos no autorizados y por eso no necesita "
    "almacenar ningún registro ni política.",
}


# Fixtures reales ya defectuosos (el texto del modelo mezcla temas): se excluyen del cálculo de FP.
KNOWN_DEFECTIVE = {"elaborate_02", "elaborate_08"}


def poison(concept: str, data: dict, rng: random.Random) -> tuple[dict, str, str] | None:
    """Devuelve (data envenenado, ruta, tipo) o None si no hay campo largo apto."""
    cands = [(p, t) for p, t in iter_text_fields(data) if len(t) >= 70 and not p.startswith("titu")]
    if not cands:
        return None
    path, _ = rng.choice(cands)
    kind = rng.choice(["fuera_de_tema", "incorrecto"])
    if kind == "fuera_de_tema":
        other = rng.choice([c for c in OFF_TOPIC if c != concept])
        text = OFF_TOPIC[other]
    else:
        text = FALSE_CLAIMS.get(concept, "Esta técnica no se utiliza nunca en ningún sistema de bases de datos real.")
    d = copy.deepcopy(data)
    set_path(d, path, text)
    return d, path, kind


def run_one(args) -> dict:
    try:
        return _run_one(args)
    except Exception as exc:  # timeout del LLM compartido: el recurso se omite, no tumba el bench
        return {"fixture": args[0].stem, "concept": "", "error": str(exc)[:120]}


def _run_one(args) -> dict:
    f, seed, prefilter = args
    if prefilter:
        os.environ["OVA_CONTENT_REVIEW_PREFILTER"] = "1"
    fx = json.loads(f.read_text(encoding="utf-8"))
    concept, data = fx["concept"], fx["data"]
    rng = random.Random(seed)  # noqa: S311
    out = {"fixture": f.stem, "concept": concept}
    t = time.monotonic()
    clean = review_fields(concept, iter_text_fields(data))
    out["clean_s"] = time.monotonic() - t
    out["clean_problems"] = clean
    p = poison(concept, data, rng)
    if p:
        d, path, kind = p
        t = time.monotonic()
        found = review_fields(concept, iter_text_fields(d))
        out["poison_s"] = time.monotonic() - t
        out["poison"] = {"campo": path, "tipo": kind, "found": found, "hit": any(x["campo"] == path for x in found)}
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--every", type=int, default=1, help="1 de cada N fixtures (muestra más rápida)")
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--prefilter", action="store_true")
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    files = sorted(x for x in FIX.glob("*_0*.json"))
    files = files[:: a.every]
    if a.limit:
        files = files[: a.limit]
    with ThreadPoolExecutor(a.jobs) as ex:
        rows = list(ex.map(run_one, [(f, a.seed + n, a.prefilter) for n, f in enumerate(files)]))
    errors = [r for r in rows if "error" in r]
    rows = [r for r in rows if "error" not in r]
    clean_rows = [r for r in rows if r["fixture"] not in KNOWN_DEFECTIVE]
    fp = sum(1 for r in clean_rows if r["clean_problems"]) / max(1, len(clean_rows))
    pois = [r for r in rows if "poison" in r]
    hits = sum(1 for r in pois if r["poison"]["hit"])
    recall = hits / len(pois) if pois else 0.0
    by_kind = {}
    for k in ("fuera_de_tema", "incorrecto"):
        sub = [r for r in pois if r["poison"]["tipo"] == k]
        by_kind[k] = (sum(1 for r in sub if r["poison"]["hit"]), len(sub))
    times = [r["clean_s"] for r in rows] + [r["poison_s"] for r in pois]
    summary = {
        "recursos": len(rows),
        "omitidos_por_error": len(errors),
        "errores": [e["error"] for e in errors][:5],
        "recall": round(recall, 3),
        "recall_por_tipo": by_kind,
        "fp_rate": round(fp, 3),
        "fp_campos_medio": round(sum(len(r["clean_problems"]) for r in clean_rows) / max(1, len(clean_rows)), 2),
        "tiempo_s_medio": round(statistics.mean(times), 2),
        "tiempo_s_p95": round(sorted(times)[int(len(times) * 0.95) - 1], 2),
        "prefilter": a.prefilter,
        "ok": recall >= 0.8 and fp <= 0.15,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if a.out:
        Path(a.out).write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
