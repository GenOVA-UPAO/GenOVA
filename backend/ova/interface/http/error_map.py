"""Traduce errores del dominio OVA a sus sobres HTTP históricos."""

from __future__ import annotations

from fastapi import status
from fastapi.responses import JSONResponse

from core.http_errors import forbidden_response
from ova.domain.errors import (
    MetadataTitleTooLong,
    OvaEditError,
    OvaError,
    OvaForbidden,
    OvaGenerating,
    OvaNotFound,
)


def ova_error_to_response(error: OvaError) -> JSONResponse:
    if isinstance(error, OvaEditError):
        return JSONResponse(
            status_code=error.status_code,
            content={"error": error.error, "message": error.message},
        )
    if isinstance(error, OvaForbidden):
        return forbidden_response(error.message)
    if isinstance(error, OvaNotFound):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": error.message},
        )
    if isinstance(error, OvaGenerating):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_generating", "message": error.message},
        )
    if isinstance(error, MetadataTitleTooLong):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "title_too_long",
                "message": "El título no puede superar 100 caracteres.",
            },
        )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "title_required", "message": "El título es obligatorio."},
    )
