"""Manejadores de error transversales.

`DataError` es la familia de errores que PostgreSQL devuelve cuando un valor no
encaja con el tipo de la columna (un UUID mal formado, un texto más largo que el
límite declarado…). Son datos inválidos del cliente, no fallos del servidor, y
antes salían como 500. El detalle del driver nunca viaja al cliente (C-SEC).
"""

import structlog
from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError

logger = structlog.get_logger(__name__)


def forbidden_response(message: str = "Sin permisos.") -> JSONResponse:
    """403 envelope compartido — el mismo JSON estaba repetido verbatim en 10+ routers."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"error": "forbidden", "message": message},
    )


async def data_error_handler(request: Request, exc: DataError) -> JSONResponse:
    logger.warning(
        "Valor con formato inválido en la petición",
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "invalid_value",
            "message": "Alguno de los valores enviados tiene un formato inválido.",
        },
    )
