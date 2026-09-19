"""Errores del dominio de subidas temporales.

Cada error lleva un `code` estable que la capa HTTP usa como identificador en la
respuesta JSON (compatibilidad con el frontend existente).
"""

from __future__ import annotations


class UploadError(Exception):
    code = "upload_error"


class FilesRequired(UploadError):
    code = "files_required"

    def __init__(self) -> None:
        super().__init__("Debes adjuntar al menos un archivo.")


class TooManyFiles(UploadError):
    code = "files_limit_exceeded"

    def __init__(self, max_files: int, *, total: bool = False) -> None:
        scope = "en total" if total else "por carga"
        super().__init__(f"Solo se permiten hasta {max_files} archivos {scope}.")
        self.max_files = max_files


class MimeNotAllowed(UploadError):
    code = "mime_not_allowed"

    def __init__(self) -> None:
        super().__init__("Formato de archivo no soportado.")


class FileTooLarge(UploadError):
    code = "file_too_large"

    def __init__(self, max_mb: int) -> None:
        super().__init__(f"El archivo supera el tamaño máximo permitido de {max_mb}MB.")


class ContentMismatch(UploadError):
    code = "content_mismatch"

    def __init__(self) -> None:
        super().__init__("El contenido del archivo no coincide con su tipo declarado.")


class UploadNotFound(UploadError):
    code = "upload_not_found"

    def __init__(self) -> None:
        super().__init__("No se encontró el archivo temporal solicitado.")
