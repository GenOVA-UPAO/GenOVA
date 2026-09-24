"""Material de referencia (RAG) de una regeneración desde el chat del editor.

Qué documentos se consultan al aplicar un cambio:

* los que el docente adjunta con el clip en ESE mensaje (prioritarios: son la
  razón del cambio, así que se les reserva el grueso del presupuesto), y
* los que el OVA ya tenía — los de su creación y los adjuntados en mensajes
  anteriores —, con un cupo menor para que no desplacen al adjunto nuevo.

Antes la regeneración no usaba RAG en absoluto: el chat subía el archivo pero
no lo enviaba, y el backend tampoco lo habría usado.

El informe (`report`) viaja en el progreso del job para que el chat diga con
verdad qué archivos se consultaron y por qué alguno no se usó.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import structlog
from sqlalchemy.orm import Session

logger = structlog.get_logger(__name__)

# Cupo de fragmentos de los documentos que el OVA ya tenía cuando además hay un
# adjunto nuevo (sin adjunto nuevo se usa el top-k normal).
_EXISTING_K_WITH_NEW = 3


@dataclass(frozen=True, slots=True)
class RegenMaterial:
    contexto: str = ""
    report: dict = field(default_factory=dict)


def attach_to_ova(db: Session, user_id: str, ova_id: str, upload_ids: list[str]) -> list[dict]:
    """Valida y liga al OVA los adjuntos del mensaje. Devuelve su descripción
    (`upload_id`, `filename`, `rag_status`) para el informe final."""
    from generation.infrastructure.reference_material import (
        bind_references_to_ova,
        owned_reference_ids,
    )

    owned = owned_reference_ids(db, user_id, list(dict.fromkeys(upload_ids)))
    claimed = {v.upload_id: v for v in bind_references_to_ova(db, user_id, owned, ova_id)}
    attachments = []
    for upload_id in owned:
        view = claimed.get(upload_id)
        attachments.append(
            {
                "upload_id": upload_id,
                "filename": view.filename if view else None,
                "rag_status": (view.rag_status if view else None) or {},
            }
        )
    return attachments


def _query(topic: str, instruction: str | None) -> str:
    # El cambio pedido manda; el tema ancla la búsqueda cuando el mensaje es
    # genérico («usa este documento», «añade ejemplos»).
    return "\n".join(p for p in (instruction or "", topic or "") if p.strip())


def build_regen_material(
    db: Session,
    ova_id: str,
    attachments: list[dict],
    topic: str,
    instruction: str | None,
) -> RegenMaterial:
    """Recupera el contexto de la regeneración y el informe de qué se usó.
    Nunca lanza: sin material la regeneración sigue como antes."""
    from rag import context_from_chunks, is_enabled, top_k, upload_ids_for_ova

    new_ids = [a["upload_id"] for a in attachments]
    if not is_enabled():
        return RegenMaterial(report=_report("disabled", [], attachments))
    try:
        existing = [u for u in upload_ids_for_ova(db, ova_id) if u not in new_ids]
        if not new_ids and not existing:
            return RegenMaterial(report=_report("none", [], attachments))
        query = _query(topic, instruction)
        chunks = top_k(db, query, new_ids) if new_ids else []
        if existing:
            k_existing = _EXISTING_K_WITH_NEW if new_ids else None
            chunks += top_k(db, query, existing, k_existing)
        retrieved = context_from_chunks(chunks)
    except Exception:  # noqa: BLE001 — el RAG nunca tumba la regeneración
        logger.exception("regen: fallo al recuperar contexto RAG", ova_id=ova_id)
        return RegenMaterial(report=_report("error", [], attachments))
    sources = [
        {**s, "origin": "adjunto" if s.get("upload_id") in new_ids else "ova"}
        for s in retrieved.sources
    ]
    status = "used" if retrieved.contexto else "no_matches"
    logger.info(
        "regen RAG retrieved",
        ova_id=ova_id,
        status=status,
        chunk_count=retrieved.chunks,
        context_chars=len(retrieved.contexto),
        sources=[f"{s['filename']}:{s['chunks']}" for s in sources],
    )
    return RegenMaterial(retrieved.contexto, _report(status, sources, attachments))


def _attachment_reason(att: dict, used: bool, status: str) -> str | None:
    if used:
        return None
    if status == "disabled":
        return "La búsqueda en archivos (RAG) está desactivada en este servidor."
    rag = att.get("rag_status") or {}
    rag_state = rag.get("status")
    if rag_state == "processing":
        return "Aún se estaba indexando cuando empezó el cambio."
    if rag_state and rag_state != "indexed":
        return rag.get("message") or "No se pudo indexar."
    return "No tenía fragmentos relevantes para este cambio."


def _report(status: str, sources: list[dict], attachments: list[dict]) -> dict:
    used_ids = {s.get("upload_id") for s in sources}
    return {
        "status": status,
        "sources": [
            {"filename": s["filename"], "chunks": s["chunks"], "origin": s["origin"]}
            for s in sources
        ],
        "attachments": [
            {
                "filename": a.get("filename") or "archivo",
                "used": a["upload_id"] in used_ids,
                "reason": _attachment_reason(a, a["upload_id"] in used_ids, status),
            }
            for a in attachments
        ],
    }
