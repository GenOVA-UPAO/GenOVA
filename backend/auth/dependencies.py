"""Compat: superficie pública de los guards de auth.

El módulo real vive en `auth.interface.http.dependencies`. Este re-export se
mantiene mientras los ~30 consumidores (routers de todos los dominios) no migren
a la nueva ruta; se elimina cuando cada dominio pase por el refactor hexagonal.
"""

from auth.interface.http.dependencies import (  # noqa: F401
    get_current_user,
    require_admin,
    require_permission,
)

__all__ = ["get_current_user", "require_admin", "require_permission"]
