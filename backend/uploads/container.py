"""Composition root del dominio de subidas temporales."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from uploads.application.use_cases import DeleteUpload, ListUploads, UploadFiles
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
