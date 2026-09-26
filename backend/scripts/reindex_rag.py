"""Re-embebe los fragmentos del RAG hechos con otro embedder.

Cuándo: tras cambiar de modelo de embeddings (p. ej. gemini-embedding-2-preview →
gemini-embedding-2, o v1 → v2) o su formato de entrada (prefijos de tarea de v2).
Los vectores viejos quedan en otro espacio: la búsqueda vectorial devuelve ruido
sin error (la rama léxica sigue funcionando, así que el fallo pasa inadvertido).

Cada fragmento guarda en `rag_chunks.embedding_model` la `fingerprint` del
embedder que lo generó (NULL = anterior a la migración 043). Este script
re-embebe, por lotes y con el embedder configurado (`RAG_EMBEDDER`,
`RAG_GEMINI_MODEL`, `GEMINI_API_KEY`...), los que no coinciden con el activo.

- Por defecto es un ensayo (--dry-run implícito): cuenta y no llama al
  embedder ni escribe. Hace falta --apply para reindexar.
- Idempotente: solo toca los desfasados; se puede repetir o reanudar.
- Confirma cada lote: si se corta (cuota, red), lo hecho queda hecho.
- --upload-id limita a un documento (útil para probar con datos propios).

Uso (desde backend/):

    .venv/bin/python scripts/reindex_rag.py                  # ensayo: qué haría
    .venv/bin/python scripts/reindex_rag.py --apply          # reindexa todo
    .venv/bin/python scripts/reindex_rag.py --apply --upload-id <uuid> --batch 16
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import SessionLocal  # noqa: E402
from rag.application.use_cases import ReindexChunks, ReindexReport  # noqa: E402
from rag.infrastructure.embedders import get_embedder  # noqa: E402
from rag.infrastructure.reindex_store import PgVectorReindexStore  # noqa: E402


def _parse(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="solo contar (por defecto)")
    mode.add_argument("--apply", action="store_true", help="re-embeber y guardar")
    parser.add_argument("--batch", type=int, default=32, help="fragmentos por lote (32)")
    parser.add_argument("--limit", type=int, default=None, help="máximo de fragmentos")
    parser.add_argument("--upload-id", default=None, help="solo este documento")
    return parser.parse_args(argv)


def format_report(report: ReindexReport) -> str:
    lines = [
        f"Embedder activo: {report.fingerprint}",
        f"Fragmentos: {report.total}",
    ]
    for model, n in sorted(report.by_model.items(), key=lambda kv: -kv[1]):
        mark = "ok" if model == report.fingerprint else "reindexar"
        lines.append(f"  {n:6d}  {model or '(sin registrar)'}  [{mark}]")
    lines.append(f"Desfasados: {report.stale}")
    if report.dry_run:
        lines.append(f"Ensayo: no se escribió nada; harían falta ~{report.batches} lote(s). Usa --apply.")
    else:
        lines.append(f"Reindexados: {report.reindexed} en {report.batches} lote(s)")
        lines.append(f"Pendientes: {report.stale - report.reindexed}")
    if report.error:
        lines.append(f"Detenido por error del embedder: {report.error}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    args = _parse(argv)
    if args.batch < 1 or (args.limit is not None and args.limit < 1):
        print("--batch y --limit deben ser >= 1", file=sys.stderr)
        return 2
    db = SessionLocal()
    try:
        use_case = ReindexChunks(get_embedder(), PgVectorReindexStore(db))
        report = use_case.execute(
            dry_run=not args.apply,
            batch_size=args.batch,
            limit=args.limit,
            upload_id=args.upload_id,
        )
    finally:
        db.close()
    print(format_report(report))
    return 1 if report.error else 0


if __name__ == "__main__":
    sys.exit(main())
