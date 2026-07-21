"""Genera recursos anclados en un documento fuente y mide OE2 sobre ellos.

Sirve para obtener la cifra sin depender del pipeline de jobs (arq + Redis): hace
la misma secuencia que el motor —ingesta RAG, recuperación, generación con
`contexto`— en proceso, y encadena el arnés de evaluación.

Los chunks se insertan SIN atar a ningún OVA y con el TTL por defecto (1 h), así
que el barrido de `purge_expired` los elimina solo: no deja residuo permanente en
la base.

Uso (desde backend/):

    .venv/Scripts/python.exe -m scripts.eval_accuracy.generate_sample \
        --concepto "Árboles de decisión" --recursos 3 --out eval_oe2
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.database import SessionLocal  # noqa: E402
from rag.chunker import chunk_text  # noqa: E402
from rag.embedder import get_embedder  # noqa: E402
from rag.retriever import build_contexto_usuario, top_k  # noqa: E402
from rag.store import insert_chunks  # noqa: E402
from scripts.eval_accuracy.__main__ import (  # noqa: E402
    DEFAULT_JUDGE_MODEL,
    DEFAULT_JUDGE_PROVIDER,
    _write_csv,
)
from scripts.eval_accuracy.extract import extract_claims  # noqa: E402
from scripts.eval_accuracy.judge import judge_batch  # noqa: E402
from scripts.eval_accuracy.stats import breakdown, summarize  # noqa: E402

_FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "arboles_decision.txt"
)

# Plan mínimo que cubre fases con perfiles distintos: exposición teórica, aplicación
# y evaluación. Son los tipos donde el anclaje factual importa más.
_PLAN = [("explain", 2), ("elaborate", 1), ("evaluate", 1), ("explore", 5), ("engage", 6)]


def _resolve_user_id(db, email: str) -> str:
    """uuid del usuario dueño de los chunks (FK obligatoria en rag_chunks)."""
    from sqlalchemy import select

    from models import User

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        raise SystemExit(f"No existe el usuario {email}; pasa --user-id con un uuid válido.")
    return str(user.id)


def ingest(db, source_path: str, user_id: str) -> str:
    """Chunkea, embebe e inserta el documento. Devuelve el upload_id."""
    with open(source_path, encoding="utf-8") as fh:
        texto = fh.read()
    chunks = chunk_text(texto)
    if not chunks:
        raise SystemExit(f"El documento {source_path} no produjo chunks.")
    embeddings = get_embedder().embed_batch(chunks)
    upload_id = str(uuid.uuid4())
    insert_chunks(
        db,
        user_id=user_id,
        upload_id=upload_id,
        source_filename=os.path.basename(source_path),
        chunks=chunks,
        embeddings=embeddings,
    )
    db.commit()
    print(f"RAG: {len(chunks)} chunks insertados (upload {upload_id[:8]}…, TTL 1 h)")
    return upload_id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--concepto", default="Árboles de decisión")
    parser.add_argument("--fuente", default=_FIXTURE)
    parser.add_argument("--recursos", type=int, default=3, help="cuántos recursos generar")
    parser.add_argument("--out", default="eval_oe2")
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--judge-provider", default=DEFAULT_JUDGE_PROVIDER)
    # 2 y no 8: con más paralelismo el juez agota el free tier de Groq, y el
    # reintento cae en _FALLBACK_OR_MODEL, que ya no es gratuito (404) → los
    # veredictos se pierden como errores y encogen el denominador.
    parser.add_argument("--concurrency", type=int, default=2)
    parser.add_argument("--user-id", default=None, help="uuid dueño de los chunks")
    parser.add_argument(
        "--user-email", default="user@genova.ai", help="cuenta si no se da --user-id"
    )
    args = parser.parse_args()

    from prometheus.plans.generate import generate_resource

    db = SessionLocal()
    try:
        # rag_chunks.user_id tiene FK a users: hace falta una cuenta real.
        user_id = args.user_id or _resolve_user_id(db, args.user_email)
        upload_id = ingest(db, args.fuente, user_id)
        chunks = top_k(db, args.concepto, [upload_id])
        contexto = build_contexto_usuario(chunks)
    finally:
        db.close()

    if not contexto:
        print("Recuperación vacía: sin contexto no hay nada que medir.", file=sys.stderr)
        return 1
    print(f"Contexto recuperado: {len(chunks)} chunks, {len(contexto)} caracteres\n")

    rows: list[dict] = []
    plan = _PLAN[: max(1, args.recursos)]
    for i, (phase, rt) in enumerate(plan, 1):
        print(f"[{i}/{len(plan)}] generando {phase}/{rt}…")
        try:
            result = generate_resource(phase, rt, args.concepto, contexto=contexto, refine=False)
        except Exception as exc:  # noqa: BLE001
            print(f"    generación falló: {exc}", file=sys.stderr)
            continue
        claims = extract_claims(
            result.html, args.judge_model, args.judge_provider, concepto=args.concepto
        )
        if not claims:
            print("    sin afirmaciones verificables")
            continue
        verdicts = judge_batch(
            claims, contexto, args.judge_model, args.judge_provider, concurrency=args.concurrency
        )
        for verdict in verdicts:
            rows.append(
                {**verdict, "phase": phase, "resource_type": str(rt), "job_id": "", "ova_id": ""}
            )
        ok = sum(1 for v in verdicts if v.get("veredicto") == "soportada")
        print(f"    {ok}/{len(claims)} afirmaciones soportadas")

    if not rows:
        print("No se juzgó ninguna afirmación.", file=sys.stderr)
        return 1

    resumen = {
        "global": summarize(rows),
        "por_fase": breakdown(rows, "phase"),
        "juez": {"provider": args.judge_provider, "model_id": args.judge_model},
        "fuente": os.path.basename(args.fuente),
        "concepto": args.concepto,
    }
    _write_csv(f"{args.out}-afirmaciones.csv", rows)
    import json

    with open(f"{args.out}-resumen.json", "w", encoding="utf-8") as fh:
        json.dump(resumen, fh, ensure_ascii=False, indent=2)

    g = resumen["global"]
    print(
        f"\nOE2: {g['accuracy_pct']}% (IC95 {g['ic95_pct'][0]}–{g['ic95_pct'][1]}%, "
        f"n={g['afirmaciones_juzgadas']})\n"
        f"  soportadas={g['soportadas']} contradichas={g['contradichas']} "
        f"no_inferibles={g['no_inferibles']} errores_juez={g['errores_juez']}\n"
        f"Umbral {g['umbral_pct']}%: {'CUMPLE' if g['cumple_umbral'] else 'NO CUMPLE'}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
