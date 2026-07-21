"""Mide la precisión de contenido frente al RAG (OE2).

    accuracy = afirmaciones soportadas por las fuentes / afirmaciones verificables

Unidad de análisis: la afirmación, no el recurso. Solo entran OVAs generadas CON
material subido — sin fuentes no hay contra qué validar, y contarlas hundiría la
métrica midiendo algo que el objetivo no reclama.

Uso (desde backend/):

    .venv/Scripts/python.exe -m scripts.eval_accuracy --limit 10
    .venv/Scripts/python.exe -m scripts.eval_accuracy --limit 10 --out ../docs/pruebas/oe2

Salida: `<out>-afirmaciones.csv` (una fila por afirmación, auditable a mano) y
`<out>-resumen.json` (agregado + IC 95% + desglose por fase y tipo de recurso).
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import select  # noqa: E402

from core.database import SessionLocal  # noqa: E402
from models import OvaJob, OvaJobResource  # noqa: E402
from scripts.eval_accuracy.extract import extract_claims  # noqa: E402
from scripts.eval_accuracy.judge import judge_batch  # noqa: E402
from scripts.eval_accuracy.stats import breakdown, summarize  # noqa: E402

# Juez por defecto: familia distinta a la del generador (DeepSeek vía OpenRouter),
# para que la métrica no sea autoevaluación del mismo modelo.
DEFAULT_JUDGE_PROVIDER = "groq"
DEFAULT_JUDGE_MODEL = "llama-3.3-70b-versatile"


def _load_units(db, limit: int) -> list[dict]:
    """Recursos `done` con contenido, de jobs que sí tuvieron contexto RAG."""
    jobs = (
        db.execute(
            select(OvaJob)
            .where(OvaJob.rag_context.isnot(None), OvaJob.rag_context != "")
            .order_by(OvaJob.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    units = []
    for job in jobs:
        resources = (
            db.execute(
                select(OvaJobResource).where(
                    OvaJobResource.job_id == job.id,
                    OvaJobResource.status == "done",
                    OvaJobResource.content.isnot(None),
                )
            )
            .scalars()
            .all()
        )
        for res in resources:
            units.append(
                {
                    "job_id": str(job.id),
                    "ova_id": str(job.ova_id) if job.ova_id else "",
                    "contexto": str(job.rag_context),
                    "concepto": str(job.prompt or "el tema del recurso"),
                    "phase": res.phase_type,
                    "resource_type": str(res.resource_type or ""),
                    "html": res.content,
                }
            )
    return units


def _write_csv(path: str, rows: list[dict]) -> None:
    fields = [
        "job_id",
        "ova_id",
        "phase",
        "resource_type",
        "claim",
        "veredicto",
        "evidencia",
        "error",
    ]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=10, help="jobs a evaluar (default 10)")
    parser.add_argument("--out", default="eval_oe2", help="prefijo de los archivos de salida")
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--judge-provider", default=DEFAULT_JUDGE_PROVIDER)
    parser.add_argument("--concurrency", type=int, default=8)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        units = _load_units(db, args.limit)
    finally:
        db.close()

    if not units:
        print(
            "No hay recursos evaluables: ningún job tiene rag_context.\n"
            "Genera al menos un OVA subiendo material (la generación debe correr con\n"
            "el cableado RAG del concierge y la migración 037 aplicada).",
            file=sys.stderr,
        )
        return 1

    print(f"Evaluando {len(units)} recursos con juez {args.judge_provider}/{args.judge_model}…")
    rows: list[dict] = []
    for i, unit in enumerate(units, 1):
        claims = extract_claims(
            unit["html"], args.judge_model, args.judge_provider, concepto=unit["concepto"]
        )
        if not claims:
            print(f"  [{i}/{len(units)}] {unit['phase']}/{unit['resource_type']}: sin afirmaciones")
            continue
        verdicts = judge_batch(
            claims,
            unit["contexto"],
            args.judge_model,
            args.judge_provider,
            concurrency=args.concurrency,
        )
        for verdict in verdicts:
            rows.append(
                {**verdict, **{k: unit[k] for k in ("job_id", "ova_id", "phase", "resource_type")}}
            )
        ok = sum(1 for v in verdicts if v.get("veredicto") == "soportada")
        print(f"  [{i}/{len(units)}] {unit['phase']}/{unit['resource_type']}: {ok}/{len(claims)}")

    resumen = {
        "global": summarize(rows),
        "por_fase": breakdown(rows, "phase"),
        "por_tipo_recurso": breakdown(rows, "resource_type"),
        "juez": {"provider": args.judge_provider, "model_id": args.judge_model},
        "recursos_evaluados": len(units),
    }

    _write_csv(f"{args.out}-afirmaciones.csv", rows)
    with open(f"{args.out}-resumen.json", "w", encoding="utf-8") as fh:
        json.dump(resumen, fh, ensure_ascii=False, indent=2)

    g = resumen["global"]
    print(
        f"\nOE2: {g['accuracy_pct']}% "
        f"(IC95 {g['ic95_pct'][0]}–{g['ic95_pct'][1]}%, "
        f"n={g['afirmaciones_juzgadas']} afirmaciones)\n"
        f"Umbral {g['umbral_pct']}%: {'CUMPLE' if g['cumple_umbral'] else 'NO CUMPLE'} "
        f"(criterio: extremo inferior del IC > umbral)\n"
        f"Salida: {args.out}-afirmaciones.csv · {args.out}-resumen.json\n"
        "Falta la validación humana de una submuestra (15–20%) y el kappa de acuerdo."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
