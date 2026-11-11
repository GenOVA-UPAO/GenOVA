"""Vigencia de los enlaces de restablecimiento de contraseña.

Una sola fuente para la expiración del token y para el texto del correo, que
antes decía «24 horas» también en el reset propio (que dura 1 hora).
"""

from __future__ import annotations

from datetime import timedelta

# «Olvidé mi contraseña»: lo pide el propio usuario.
SELF_SERVICE_RESET_TTL = timedelta(hours=1)
# Enviado por un administrador desde la gestión de usuarios.
ADMIN_RESET_TTL = timedelta(hours=24)


def ttl_hours(ttl: timedelta) -> int:
    return int(ttl.total_seconds() // 3600)
