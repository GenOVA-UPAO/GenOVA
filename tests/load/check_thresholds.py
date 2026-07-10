"""Valida el CSV de Locust contra los umbrales RN-001.

Falla (exit 1) si algún endpoint no-LLM supera P90 > 278 ms, o si la tasa de
fallos agregada supera el 1%. Los endpoints LLM (encolado de generación) se
excluyen del gate de latencia: su presupuesto es MTTG <= 180 s (RN-002), no
latencia HTTP.

Uso:  python tests/load/check_thresholds.py <report_stats.csv> [p90_ms]
"""

import csv
import sys

P90_THRESHOLD_MS = 278.0  # RN-001
MAX_FAIL_RATIO = 0.01
LLM_MARKER = "LLM"  # los names de tasks LLM en locustfile.py incluyen "(encolado LLM)"


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    path = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else P90_THRESHOLD_MS

    failures = []
    total_requests = total_failures = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            name = row.get("Name", "")
            if name == "Aggregated":
                total_requests = int(float(row.get("Request Count", 0) or 0))
                total_failures = int(float(row.get("Failure Count", 0) or 0))
                continue
            if LLM_MARKER in name:
                continue
            p90 = float(row.get("90%", 0) or 0)
            status = "OK " if p90 <= threshold else "FAIL"
            print(f"[{status}] P90 {p90:>8.0f} ms  {row.get('Type', '')} {name}")
            if p90 > threshold:
                failures.append(f"{name}: P90 {p90:.0f} ms > {threshold:.0f} ms")

    if total_requests:
        ratio = total_failures / total_requests
        print(f"\nTotal: {total_requests} requests, {total_failures} fallos ({ratio:.2%})")
        if ratio > MAX_FAIL_RATIO:
            failures.append(f"tasa de fallos {ratio:.2%} > {MAX_FAIL_RATIO:.0%}")

    if failures:
        print("\n❌ Umbrales RN-001 incumplidos:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"\n✅ Todos los endpoints no-LLM dentro de P90 <= {threshold:.0f} ms (RN-001)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
