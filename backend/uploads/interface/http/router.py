"""Adaptador HTTP (driving) del dominio de subidas temporales."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, File, UploadFile

from auth.dependencies import get_current_user
from models import User
from uploads.application.dto import IncomingFile
from uploads.container import UploadsUseCases, build_uploads
from uploads.domain.errors import UploadError
from uploads.interface.http.responses import error_response

router = APIRouter()


@router.get("/health", tags=["Health"], summary="Estado del módulo de subidas")
def uploads_health() -> dict[str, str]:
    return {"module": "uploads", "status": "ok"}


@router.get(
    "/temp", tags=["Documentos y RAG"], summary="Listar los documentos temporales subidos"
)
def list_temp_uploads(
    current_user: User = Depends(get_current_user),
    uc: UploadsUseCases = Depends(build_uploads),
) -> dict[str, list[dict]]:
    items = uc.list_uploads.execute(str(current_user.id))
    return {"items": [asdict(v) for v in items]}


@router.post("/temp", tags=["Documentos y RAG"], summary="Subir documentos temporales")
async def upload_temp_files(
    files: list[UploadFile] = File(default=[]),
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
        outcome = uc.upload_files.execute(str(current_user.id), incoming)
    except UploadError as err:
        return error_response(err)
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
