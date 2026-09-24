"""Adaptador de los archivos de referencia de un OVA (subidas temporales + RAG).

Un archivo adjunto es del usuario si está en su lista de subidas temporales
(este proceso) o si ya tiene chunks suyos en pgvector (sobrevive a un reinicio y
a otros procesos). Ligarlo a un OVA hace dos cosas: sale de la lista temporal en
la que se subió (para que no reaparezca en «Archivos» del siguiente OVA ni en el
chat) y sus chunks quedan atados al OVA (no caducan y la regeneración los usa).
"""

from __future__ import annotations

from uuid import UUID

import structlog
from sqlalchemy.orm import Session

logger = structlog.get_logger(__name__)


def owned_reference_ids(db: Session, user_id: str, upload_ids: list[str]) -> list[str]:
    if not upload_ids:
        return []
    from rag import owned_upload_ids
    from uploads import uploads_owned_by

    in_registry = set(uploads_owned_by(user_id, upload_ids))
    with_chunks = set(owned_upload_ids(db, user_id, upload_ids))
    return [u for u in dict.fromkeys(upload_ids) if u in in_registry or u in with_chunks]


def bind_references_to_ova(db: Session, user_id: str, upload_ids: list[str], ova_id: str) -> list:
    """Devuelve las subidas reclamadas (`UploadItemView`: nombre y estado RAG)."""
    if not upload_ids:
        return []
    from rag import tie_uploads_to_ova
    from uploads import claim_uploads

    claimed = claim_uploads(user_id, upload_ids, ova_id)
    try:
        tie_uploads_to_ova(db, upload_ids, ova_id)
    except Exception:  # noqa: BLE001 — el RAG es best-effort
        logger.exception("No se pudieron ligar los chunks al OVA", ova_id=ova_id)
        db.rollback()
    return claimed


class ReferenceMaterialAdapter:
    def __init__(self, db: Session) -> None:
        self._db = db

    def owned(self, user_id: UUID, upload_ids: list[str]) -> list[str]:
        return owned_reference_ids(self._db, str(user_id), upload_ids)

    def bind_to_ova(self, user_id: UUID, upload_ids: list[str], ova_id: str) -> None:
        bind_references_to_ova(self._db, str(user_id), upload_ids, ova_id)
