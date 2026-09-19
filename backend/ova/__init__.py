"""Dominio OVA (pase estructural: capas domain/application/infrastructure/interface).

Es el agregado central de la app. Router: `ova.interface.http.router` + los
routers montados de edición/fases/papelera/chat. ORM:
`ova.infrastructure.orm` (Ova, OvaPhase, OvaPhaseVersion, OvaVersion) +
`orm_chat` (OvaEditorChatMessage). La extracción de cada router a casos de uso
es un 2º pase (como en `auth`/`users`).

Superficie pública para dominios externos (p. ej. `generation`): solo capas
application, NUNCA ova.interface (crearía un ciclo, porque
ova.interface.http.edit_router importa generation.regen.regen_router).
"""

from typing import Any

__all__ = [
    "ensure_version_exists",
    "get_active_version",
    "is_ova_owner",
    "ova_output_dir",
    "persist_scorm_zip",
]


def __getattr__(name: str) -> Any:
    # Re-export perezoso (PEP 562). Un import ansioso de application aquí
    # ciclaría con `models`: su registro ORM importa `ova.infrastructure.*`,
    # lo que ejecuta este __init__ a mitad de la carga de `models`, antes de
    # que los `from models import ...` de application puedan resolverse.
    if name == "ensure_version_exists":
        from ova.application.edit_helpers import _ensure_version_exists as value
    elif name == "get_active_version":
        from ova.application.edit_helpers import _get_active_version as value
    elif name == "is_ova_owner":
        from ova.application.edit_helpers import _is_ova_owner as value
    elif name == "ova_output_dir":
        from ova.application.edit_helpers import _ova_output_dir as value
    elif name == "persist_scorm_zip":
        from ova.application.scorm_persist import persist_scorm_zip as value
    else:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    return value
