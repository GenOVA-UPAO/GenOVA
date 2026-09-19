"""Adaptadores sobre los helpers criptográficos existentes del proyecto."""

from __future__ import annotations

import secrets

from core.security import hash_password, password_complexity_ok


class BcryptPasswordHasher:
    def hash(self, raw: str) -> str:
        return hash_password(raw)


class ProjectPasswordPolicy:
    def accepts(self, raw: str) -> bool:
        return password_complexity_ok(raw)


class SecureTokenGenerator:
    def generate(self) -> str:
        return secrets.token_urlsafe(32)
