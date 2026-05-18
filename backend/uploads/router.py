from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import JSONResponse

from auth.dependencies import get_current_user
from models import User
from ova.uploads_service import (
    ALLOWED_MIME_TYPES,
    count_user_uploads,
    create_temp_upload,
    delete_user_upload,
    list_user_uploads,
    max_file_size_bytes,
    max_file_size_mb,
    max_files_per_request,
)

router = APIRouter()


@router.get("/health")
def uploads_health() -> dict[str, str]:
    return {"module": "uploads", "status": "ok"}


@router.get("/temp")
def list_temp_uploads(
    current_user: User = Depends(get_current_user),
) -> dict[str, list[dict]]:
    uploads = list_user_uploads(str(current_user.id))
    return {"items": uploads}


@router.post("/temp")
async def upload_temp_files(
    files: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
):
    if not files:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "files_required",
                "message": "Debes adjuntar al menos un archivo.",
            },
        )

    upload_limit = max_files_per_request()
    if len(files) > upload_limit:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "files_limit_exceeded",
                "message": f"Solo se permiten hasta {upload_limit} archivos por carga.",
                "max_files": upload_limit,
            },
        )

    current_upload_count = count_user_uploads(str(current_user.id))
    if current_upload_count + len(files) > upload_limit:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "files_limit_exceeded",
                "message": f"Solo se permiten hasta {upload_limit} archivos en total.",
                "max_files": upload_limit,
            },
        )

    max_bytes = max_file_size_bytes()
    max_mb = max_file_size_mb()
    successful = []
    errors = []

    for current_file in files:
        file_name = current_file.filename or "archivo"
        file_type = (current_file.content_type or "").strip().lower()

        if file_type not in ALLOWED_MIME_TYPES:
            errors.append(
                {
                    "filename": file_name,
                    "error": "mime_not_allowed",
                    "message": "Formato de archivo no soportado.",
                }
            )
            continue

        content = await current_file.read()
        if len(content) > max_bytes:
            errors.append(
                {
                    "filename": file_name,
                    "error": "file_too_large",
                    "message": f"El archivo supera el tamaño máximo permitido de {max_mb}MB.",
                }
            )
            continue

        created_item = create_temp_upload(
            user_id=str(current_user.id),
            filename=file_name,
            content_type=file_type,
            content=content,
        )
        successful.append(created_item)

    return {
        "items": successful,
        "errors": errors,
        "max_files": upload_limit,
        "max_size_mb": max_mb,
    }


@router.delete("/temp/{upload_id}")
def delete_temp_upload(upload_id: str, current_user: User = Depends(get_current_user)):
    deleted = delete_user_upload(upload_id=upload_id, user_id=str(current_user.id))
    if not deleted:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "upload_not_found",
                "message": "No se encontró el archivo temporal solicitado.",
            },
        )

    return {"message": "Archivo temporal eliminado."}
