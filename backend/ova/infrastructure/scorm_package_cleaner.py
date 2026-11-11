"""Limpieza tolerante de los paquetes SCORM al purgar una OVA."""

from __future__ import annotations

import contextlib
import glob
import os

from storage import delete_prefix, delete_zip, is_configured

# Mismo directorio por defecto que la persistencia en disco (`ova/scorm_output`).
_DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "scorm_output")


def delete_scorm_file(file_path: str | None) -> None:
    if file_path:
        with contextlib.suppress(FileNotFoundError):
            os.remove(file_path)


class ProjectScormPackageCleaner:
    def delete(self, file_path: str | None, storage_key: str | None) -> None:
        delete_scorm_file(file_path)
        if storage_key and is_configured():
            delete_zip(storage_key)

    def delete_versions(self, owner_id: str, ova_id: str) -> None:
        # Cada guardado, borrado o reversión sube `{owner}/{ova}_vN.zip` y solo el último
        # queda en la fila del OVA: sin esto, las versiones anteriores seguían almacenadas.
        name_prefix = f"{ova_id}_v"
        output_dir = os.getenv("OVA_OUTPUT_DIR") or _DEFAULT_OUTPUT_DIR
        for path in glob.glob(os.path.join(glob.escape(output_dir), f"{name_prefix}*.zip")):
            delete_scorm_file(path)
        if is_configured():
            delete_prefix(owner_id, name_prefix)
