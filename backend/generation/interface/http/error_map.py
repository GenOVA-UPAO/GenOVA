"""Traduce errores de dominio de generación al sobre JSON
``{"error", "message"}`` con su código HTTP. Mantiene byte a byte los cuerpos
que devolvían los routers de jobs antes de la extracción a casos de uso.
"""

from __future__ import annotations

from fastapi import status
from fastapi.responses import JSONResponse

from generation.domain.errors import (
    GenerationError,
    JobNotFound,
    JobNotRunning,
    ResourceNotFound,
    ResourceNotReady,
)

_STATUS_BY_ERROR: dict[type[GenerationError], int] = {
    JobNotFound: status.HTTP_404_NOT_FOUND,
    ResourceNotFound: status.HTTP_404_NOT_FOUND,
    JobNotRunning: status.HTTP_409_CONFLICT,
    ResourceNotReady: status.HTTP_409_CONFLICT,
}


def generation_error_to_response(err: GenerationError) -> JSONResponse:
    status_code = _STATUS_BY_ERROR.get(type(err), status.HTTP_400_BAD_REQUEST)
    return JSONResponse(
        status_code=status_code,
        content={"error": err.code, "message": str(err)},
    )
