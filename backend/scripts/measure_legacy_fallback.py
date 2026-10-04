"""Medición de la tasa de uso del respaldo legacy.

Ejecuta 2 rondas de los 49 recursos con plantillas en ova_engine usando
OVA_TEXT_BACKEND=local (Ollama qwen3:8b) y conceptos variados.
Registra TextGenerationError / fallos de schema y mide la tasa de degradación.
"""

from __future__ import annotations

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

CONCEPTS_ROUND_1 = [
    "índices B-tree y búsqueda binaria",
    "transacciones ACID y niveles de aislamiento",
    "backup físico con RMAN y recuperación point-in-time",
    "roles, privilegios y principio de menor privilegio",
    "tablespaces, datafiles y gestión de almacenamiento",
    "bloqueos concurrentes y detección de deadlocks",
    "planes de ejecución EXPLAIN y optimizador basado en costos",
    "auditoría de accesos y cumplimiento normativo",
    "particionamiento de tablas por rango y lista",
    "vistas materializadas y refresco incremental",
    "concurrencia multiversión MVCC",
    "triggers y restricciones de integridad referencial",
]

CONCEPTS_ROUND_2 = [
    "normalización de bases de datos hasta 3FN",
    "consultas analíticas con funciones de ventana Window Functions",
    "réplica maestro-esclavo y alta disponibilidad",
    "sharding horizontal y distribución de datos",
    "inyección SQL y técnicas de parametrización segura",
    "almacenamiento columnar vs almacenamiento por filas",
    "optimización de buffers y cache de páginas (Buffer Pool)",
    "índices invertidos y búsqueda de texto completo",
    "gestión de memoria SGA y PGA en SGBD empresariales",
    "gestión de registros de redo log y write-ahead logging (WAL)",
    "protocolos de consenso distribuido (Raft y 2PC)",
    "modelado dimensional de estrella para Data Warehouse",
]


def test_resource(round_num: int, idx: int, spec, concept: str) -> dict:
    params = decide(spec, concept, "")
    t0 = time.monotonic()
    status = "ok"
    error_msg = ""
    try:
        data = generate_json(spec.prompt(concept, "", params), spec.schema(params))
        keys = list(data.keys()) if isinstance(data, dict) else []
    except Exception as exc:
        status = "fail"
        error_msg = str(exc)[:300]
        keys = []

    elapsed = round(time.monotonic() - t0, 1)
    return {
        "round": round_num,
        "key": spec.key,
        "phase": spec.phase,
        "rt": spec.rt,
        "title": spec.title,
        "concept": concept,
        "status": status,
        "error": error_msg,
        "keys": keys,
        "seconds": elapsed,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs", type=int, default=2)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "ova_engine" / "_measure_legacy_fallback.json")
    args = parser.parse_args()

    specs = sorted(all_specs().values(), key=lambda s: (s.phase, s.rt))
    print(f"Iniciando medición con {len(specs)} plantillas en 2 rondas (total {len(specs) * 2} ejecuciones)...")

    work_items = []
    # Ronda 1
    for i, spec in enumerate(specs):
        concept = CONCEPTS_ROUND_1[i % len(CONCEPTS_ROUND_1)]
        work_items.append((1, i, spec, concept))
    # Ronda 2
    for i, spec in enumerate(specs):
        concept = CONCEPTS_ROUND_2[i % len(CONCEPTS_ROUND_2)]
        work_items.append((2, i, spec, concept))

    results = []
    jobs = max(1, min(args.jobs, 2))
    t_start = time.monotonic()

    with ThreadPoolExecutor(max_workers=jobs) as ex:
        futures = [ex.submit(test_resource, r, idx, spec, c) for (r, idx, spec, c) in work_items]
        for fut in futures:
            res = fut.result()
            results.append(res)
            print(f"[{len(results)}/{len(work_items)}] R{res['round']} {res['key']:12} {res['status']} ({res['seconds']}s) - {res['concept'][:40]}", flush=True)

    total = len(results)
    ok_count = sum(1 for r in results if r["status"] == "ok")
    fail_count = sum(1 for r in results if r["status"] == "fail")
    fallback_rate = (fail_count / total) * 100 if total else 0.0
    total_seconds = round(time.monotonic() - t_start, 1)
    avg_seconds = round(sum(r["seconds"] for r in results) / total, 1) if total else 0.0

    summary = {
        "total_executions": total,
        "ok_count": ok_count,
        "fail_count": fail_count,
        "fallback_rate_pct": fallback_rate,
        "total_seconds": total_seconds,
        "avg_seconds_per_resource": avg_seconds,
        "results": results,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("\n" + "=" * 60)
    print("RESUMEN DE MEDICIÓN DE RESPALDO LEGACY:")
    print(f"  Total ejecuciones: {total}")
    print(f"  Exitosas (OK):     {ok_count} ({round(ok_count/total*100, 1)}%)")
    print(f"  Fallos (schema):   {fail_count} ({round(fallback_rate, 1)}%)")
    print(f"  Tasa de respaldo:  {round(fallback_rate, 1)}%")
    print(f"  Tiempo promedio:   {avg_seconds}s por recurso")
    print(f"  Tiempo total:      {total_seconds}s")
    print(f"  Informe guardado en: {args.out}")
    print("=" * 60)


if __name__ == "__main__":
    main()
