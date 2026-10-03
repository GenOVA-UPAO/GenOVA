"""Exporta las valoraciones del docente (`resource_feedback`) a JSONL.

    .venv/bin/python scripts/export_generation_feedback.py [--out feedback.jsonl]
        [--rating up|down] [--template engage_01] [--with-content] [--since 2026-10-01]

Una línea por valoración con lo necesario para analizar o entrenar el planner y las
plantillas: plantilla (`template_key`), `params` decididos por el motor de decisión,
valoración (+ motivo y comentario), concepto del OVA y métricas del revisor de contenido
(`review`: problemas encontrados/corregidos) leídas del HTML del recurso mientras la fase
exista. `--with-content` añade el HTML completo (pesado). Sin `--out` escribe a stdout.
Los campos de identidad (user_id) se seudonimizan con un hash corto.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from core.database import SessionLocal  # noqa: E402
from models import Ova, OvaPhase, ResourceFeedbackRow  # noqa: E402
from ova_engine.html import engine_info  # noqa: E402


def _pseudo(value: object) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest()[:12]


def rows(rating: str | None, template: str | None, since: datetime | None):
    with SessionLocal() as db:
        q = (
            select(ResourceFeedbackRow, Ova.title, Ova.description, OvaPhase.content, OvaPhase.title)
            .join(Ova, Ova.id == ResourceFeedbackRow.ova_id)
            .outerjoin(OvaPhase, OvaPhase.id == ResourceFeedbackRow.phase_id)
            .order_by(ResourceFeedbackRow.created_at)
        )
        if rating:
            q = q.where(ResourceFeedbackRow.rating == rating)
        if template:
            q = q.where(ResourceFeedbackRow.template_key == template)
        if since:
            q = q.where(ResourceFeedbackRow.updated_at >= since)
        yield from db.execute(q).all()


def record(fb, ova_title, ova_desc, content, phase_title, with_content: bool) -> dict:
    info = engine_info(content or "")
    out = {
        "feedback_id": str(fb.id),
        "user": _pseudo(fb.user_id),
        "ova_id": str(fb.ova_id),
        "ova_title": ova_title,
        "phase": fb.phase,
        "resource_type": fb.resource_type,
        "resource_title": phase_title,
        "template_key": fb.template_key,
        "params": fb.params or {},
        "rating": fb.rating,
        "reason": fb.reason,
        "comment": fb.comment,
        "review": info.get("review"),
        "created_at": fb.created_at.isoformat() if fb.created_at else None,
        "updated_at": fb.updated_at.isoformat() if fb.updated_at else None,
        "content_available": content is not None,
    }
    if with_content:
        out["content"] = content
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default="")
    ap.add_argument("--rating", choices=["up", "down"])
    ap.add_argument("--template")
    ap.add_argument("--since", type=datetime.fromisoformat)
    ap.add_argument("--with-content", action="store_true")
    a = ap.parse_args(argv)
    fh = open(a.out, "w", encoding="utf-8") if a.out else sys.stdout  # noqa: SIM115
    n = 0
    try:
        for fb, title, desc, content, phase_title in rows(a.rating, a.template, a.since):
            fh.write(json.dumps(record(fb, title, desc, content, phase_title, a.with_content), ensure_ascii=False) + "\n")
            n += 1
    finally:
        if a.out:
            fh.close()
    print(f"{n} valoraciones exportadas", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
