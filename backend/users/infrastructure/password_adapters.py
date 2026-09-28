"""Adaptador de hashing/verificación de contraseñas sobre `core.security` (bcrypt)."""

from __future__ import annotations

from core.security import hash_password, verify_password


class CorePasswordHasher:
    """Implementa `PasswordHasher` estructuralmente (sin importarlo)."""

    def verify(self, raw: str, hashed: str) -> bool:
        return verify_password(raw, hashed)

    def hash(self, raw: str) -> str:
        return hash_password(raw)
