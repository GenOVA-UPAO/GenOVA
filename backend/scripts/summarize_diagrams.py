"""Aggregate recorded benchmark/reviewer evidence without calling any LLM."""

import argparse
import json
import statistics
from pathlib import Path


def summarize(out: Path):
    reviews = json.loads((out / "revision.json").read_text())["casos"]
    summary = {}
    for name, directory in (("inicial", out), ("mejorado", out / "mejorado")):
        records = json.loads((directory / "resultados.json").read_text())
        groups = {"total": records}
        for record in records:
            groups.setdefault(record["tipo"], []).append(record)
        summary[name] = {}
        for kind, rows in groups.items():
            times = [r["seconds"] for r in rows]
            summary[name][kind] = {
                "n": len(rows),
                "schema_valid": sum(r["schema_valid"] for r in rows),
                "graph_valid": sum(r["graph_valid"] for r in rows),
                "tipo_correcto": sum(r["tipo_correcto"] for r in rows),
                "correctos": sum(
                    next(review[name] for review in reviews if review["id"] == r["id"])
                    for r in rows
                ),
                "llm_mean_s": round(statistics.mean(times), 3),
                "llm_median_s": round(statistics.median(times), 3),
                "llm_min_s": min(times),
                "llm_max_s": max(times),
                "llm_total_s": round(sum(times), 3),
                "render_mean_ms": round(statistics.mean(r["render_ms"] for r in rows), 3),
                "render_max_ms": max(r["render_ms"] for r in rows),
            }
    (out / "metricas.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    summarize(parser.parse_args().out)
