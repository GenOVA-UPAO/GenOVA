"""Limpieza tolerante de los paquetes SCORM al purgar una OVA."""

from __future__ import annotations

import contextlib
import os

from storage import delete_zip, is_configured


def delete_scorm_file(file_path: str | None) -> None:
    if file_path:
        with contextlib.suppress(FileNotFoundError):
            os.remove(file_path)


class ProjectScormPackageCleaner:
    def delete(self, file_path: str | None, storage_key: str | None) -> None:
        delete_scorm_file(file_path)
        if storage_key and is_configured():
            delete_zip(storage_key)
