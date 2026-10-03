"""Script de benchmark para el editor visual en Python.

Compara la precisión, daño colateral y latencia (p50, p95, avg) de los diferentes backends
(rules, laya, laya-ft, llm, hybrid, hybrid-ft) contra la suite de casos del spike.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from editor.application.dto import InterpretAndApplyInput
from editor.application.use_cases import InterpretAndApplyUseCase
from editor.container import _create_interpreters
from editor.domain.model import ResourceBlock


def _calculate_percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = math.ceil((percentile / 100.0) * len(sorted_vals)) - 1
    clamped = max(0, min(idx, len(sorted_vals) - 1))
    return sorted_vals[clamped]


def load_suite(cases_path: str) -> dict[str, Any]:
    with open(cases_path, encoding="utf-8") as f:
        return json.load(f)


def build_use_case(backend_name: str) -> InterpretAndApplyUseCase:
    interpreters = _create_interpreters()
    return InterpretAndApplyUseCase(
        interpreters=interpreters,
        default_backend=backend_name,
    )


def run_benchmark(cases_path: str, backend_name: str) -> dict[str, Any]:
    suite = load_suite(cases_path)
    resources = suite.get("resources", {})
    cases = suite.get("cases", [])
    use_case = build_use_case(backend_name)

    print("=" * 65)
    print(f">>> BENCHMARK EDITOR VISUAL [PYTHON] — BACKEND: [{backend_name.upper()}] ({len(cases)} CASOS)")
    print("=" * 65)

    results = []
    latencies: list[float] = []
    category_stats: dict[str, dict[str, int]] = {}

    for tc in cases:
        case_id = tc["id"]
        resource_key = tc["recurso"]
        category = tc["category"]
        prompt = tc["prompt"]
        expected_intent = tc["expectedIntent"]
        expected_ids = tc.get("expectedBlockIds")
        expected_types = tc.get("expectedBlockTypes")

        raw_blocks = resources.get(resource_key, [])
        blocks = [ResourceBlock(id=b["id"], tipo=b["tipo"], props=b.get("props", {})) for b in raw_blocks]

        t0 = time.time()
        output = use_case.execute(
            InterpretAndApplyInput(
                instruction=prompt,
                blocks=blocks,
                backend=backend_name,
            )
        )
        elapsed_ms = (time.time() - t0) * 1000.0
        latencies.append(elapsed_ms)

        final_ids = [b.id for b in output.blocks]
        final_types = [b.tipo for b in output.blocks]

        # 1. Verificación de bloques
        blocks_match = False
        if expected_ids is not None:
            blocks_match = final_ids == expected_ids
        elif expected_types is not None:
            blocks_match = final_types == expected_types

        # 2. Verificación de acción
        action_match = output.intent.accion == expected_intent["accion"]
        success = blocks_match and action_match

        # 3. Daño colateral
        has_collateral = (category == "ninguna" and len(final_ids) != len(blocks)) or (
            category == "quitar" and len(final_ids) < len(blocks) - 1
        )

        status_str = "✓ PASS" if success else "✗ FAIL"
        mark = "OK" if success else f"Esperada '{expected_intent['accion']}', obtenida '{output.intent.accion}'"
        print(f"[{case_id:02d}] {status_str} | {elapsed_ms:6.1f}ms | Cat: {category:<8} | {prompt[:38]:<38} | {mark}")

        if category not in category_stats:
            category_stats[category] = {"total": 0, "passed": 0, "failed": 0}
        category_stats[category]["total"] += 1
        if success:
            category_stats[category]["passed"] += 1
        else:
            category_stats[category]["failed"] += 1

        results.append({
            "id": case_id,
            "success": success,
            "has_collateral": has_collateral,
            "elapsed_ms": elapsed_ms,
            "intent": output.intent.to_dict(),
            "final_ids": final_ids,
        })

    total = len(cases)
    passed = sum(1 for r in results if r["success"])
    failed = total - passed
    collateral = sum(1 for r in results if r["has_collateral"])
    p50 = _calculate_percentile(latencies, 50)
    p95 = _calculate_percentile(latencies, 95)
    avg_lat = sum(latencies) / len(latencies) if latencies else 0.0

    print("\n" + "=" * 65)
    print(f"RESUMEN FINAL ({backend_name.upper()}):")
    print(f"  Total casos:       {total}")
    print(f"  Aprobados:         {passed}/{total} ({passed / total * 100:.1f}%)")
    print(f"  Fallidos:          {failed}")
    print(f"  Daño colateral:    {collateral}")
    print(f"  Latencia media:    {avg_lat:.1f} ms")
    print(f"  Latencia P50:      {p50:.1f} ms")
    print(f"  Latencia P95:      {p95:.1f} ms")
    print("=" * 65)
    print("Desglose por categoría:")
    for cat, st in category_stats.items():
        pct = (st["passed"] / st["total"]) * 100.0 if st["total"] > 0 else 0.0
        print(f"  - {cat:<10}: {st['passed']}/{st['total']} ({pct:5.1f}%)")
    print("=" * 65 + "\n")

    return {
        "backend": backend_name,
        "total": total,
        "passed": passed,
        "failed": failed,
        "success_rate_pct": round((passed / total) * 100.0, 1),
        "collateral_damages": collateral,
        "latency_p50_ms": round(p50, 1),
        "latency_p95_ms": round(p95, 1),
        "avg_latency_ms": round(avg_lat, 1),
        "category_stats": category_stats,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark del editor visual en Python")
    parser.add_argument(
        "--cases",
        type=str,
        default="backend/tests/fixtures/editor/cases.json",
        help="Ruta al archivo JSON con la suite de casos",
    )
    parser.add_argument(
        "--backend",
        type=str,
        default="hybrid",
        choices=["rules", "laya", "laya-ft", "llm", "hybrid", "hybrid-ft"],
        help="Backend a evaluar",
    )
    args = parser.parse_args()

    cases_file = args.cases
    if not os.path.isabs(cases_file):
        cases_file = str(Path(__file__).resolve().parent.parent / cases_file)

    if not os.path.exists(cases_file):
        # Try relative to repo root
        cases_file = str(Path.cwd() / args.cases)

    run_benchmark(cases_file, args.backend)


if __name__ == "__main__":
    main()
