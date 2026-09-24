"""Composition root del dominio de subidas temporales."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import SessionLocal, get_db
from uploads.application.dto import UploadItemView
from uploads.application.use_cases import (
    ClaimUploads,
    DeleteUpload,
    IngestUpload,
    ListUploads,
    UploadFiles,
)
from uploads.infrastructure.rag_ingestion import RagIngestionAdapter
from uploads.infrastructure.settings import EnvUploadLimits
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository


@dataclass(frozen=True, slots=True)
class UploadsUseCases:
    list_uploads: ListUploads
    upload_files: UploadFiles
    delete_upload: DeleteUpload


def build_uploads(db: Session = Depends(get_db)) -> UploadsUseCases:
    repo = InMemoryTempUploadRepository()
    return UploadsUseCases(
        list_uploads=ListUploads(repo),
        upload_files=UploadFiles(repo, RagIngestionAdapter(db), EnvUploadLimits()),
        delete_upload=DeleteUpload(repo),
    )


def run_background_ingestion(user_id: str, upload_ids: list[str]) -> None:
    """Indexa las subidas en segundo plano con su propia sesión: la de la
    petición ya está cerrada cuando corren las BackgroundTasks."""
    db = SessionLocal()
    try:
        use_case = IngestUpload(InMemoryTempUploadRepository(), RagIngestionAdapter(db))
        for upload_id in upload_ids:
            use_case.execute(user_id, upload_id)
    finally:
        db.close()


def claim_uploads(user_id: str, upload_ids: list[str], ova_id: str) -> list[UploadItemView]:
    return ClaimUploads(InMemoryTempUploadRepository()).execute(user_id, upload_ids, ova_id)


def uploads_owned_by(user_id: str, upload_ids: list[str]) -> list[str]:
    """Los ids que están en la lista de subidas del usuario (cualquier contexto)."""
    repo = InMemoryTempUploadRepository()
    return [u for u in upload_ids if repo.get(u, user_id) is not None]
