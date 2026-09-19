"""Traducción de errores de dominio de subidas a JSONResponse."""

from __future__ import annotations

from fastapi import status
from fastapi.responses import JSONResponse

from uploads.domain.errors import TooManyFiles, UploadError, UploadNotFound


def error_response(err: UploadError) -> JSONResponse:
    code = (
        status.HTTP_404_NOT_FOUND
        if isinstance(err, UploadNotFound)
        else status.HTTP_400_BAD_REQUEST
    )
    content: dict = {"error": err.code, "message": str(err)}
    if isinstance(err, TooManyFiles):
        content["max_files"] = err.max_files
    return JSONResponse(status_code=code, content=content)
