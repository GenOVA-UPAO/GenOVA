"""Adaptador HTTP (driving) del dominio de subidas temporales."""

from __future__ import annotations

import uuid
from dataclasses import asdict

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile

from auth.dependencies import get_current_user
from models import User
from uploads.application.dto import IncomingFile
from uploads.container import UploadsUseCases, build_uploads, run_background_ingestion
from uploads.domain.errors import UploadError
from uploads.interface.http.responses import error_response

router = APIRouter()

# Cada lista de archivos es de su contexto: sin `ova_id`, la del formulario de
# crear OVA; con él, la del chat del editor de ese OVA.
_OVA_SCOPE = Query(
    default=None,
    description="OVA a cuya lista pertenecen los archivos (vacío = formulario de crear OVA).",
)


def _scope(ova_id: uuid.UUID | None) -> str | None:
    return str(ova_id) if ova_id else None


@router.get("/health", tags=["Health"], summary="Estado del módulo de subidas")
def uploads_health() -> dict[str, str]:
    return {"module": "uploads", "status": "ok"}


@router.get(
    "/temp", tags=["Documentos y RAG"], summary="Listar los documentos temporales subidos"
)
def list_temp_uploads(
    ova_id: uuid.UUID | None = _OVA_SCOPE,
    current_user: User = Depends(get_current_user),
    uc: UploadsUseCases = Depends(build_uploads),
) -> dict[str, list[dict]]:
    items = uc.list_uploads.execute(str(current_user.id), _scope(ova_id))
    return {"items": [asdict(v) for v in items]}


@router.post("/temp", tags=["Documentos y RAG"], summary="Subir documentos temporales")
async def upload_temp_files(
    background: BackgroundTasks,
    files: list[UploadFile] = File(default=[]),
    ova_id: uuid.UUID | None = _OVA_SCOPE,
    current_user: User = Depends(get_current_user),
    uc: UploadsUseCases = Depends(build_uploads),
):
    incoming = [
        IncomingFile(
            filename=f.filename or "archivo",
            content_type=f.content_type or "",
            content=await f.read(),
        )
        for f in files
    ]
    try:
        outcome = uc.upload_files.execute(str(current_user.id), incoming, _scope(ova_id))
    except UploadError as err:
        return error_response(err)
    if outcome.pending_ingestion:
        # Los archivos vuelven en `processing`; el cliente consulta la lista hasta
        # que pasan a indexed / failed / skipped.
        background.add_task(
            run_background_ingestion, str(current_user.id), list(outcome.pending_ingestion)
        )
    return {
        "items": [asdict(v) for v in outcome.items],
        "errors": [asdict(e) for e in outcome.errors],
        "max_files": outcome.max_files,
        "max_size_mb": outcome.max_size_mb,
    }


@router.delete(
    "/temp/{upload_id}", tags=["Documentos y RAG"], summary="Eliminar un documento temporal"
)
def delete_temp_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    uc: UploadsUseCases = Depends(build_uploads),
):
    try:
        uc.delete_upload.execute(upload_id, str(current_user.id))
    except UploadError as err:
        return error_response(err)
    return {"message": "Archivo temporal eliminado."}
