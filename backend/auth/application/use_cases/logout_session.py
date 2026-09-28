"""Caso de uso: revocar el JWT de la sesión que se está cerrando."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.ports import RevokedTokenRepository, SessionTokenDecoder


@dataclass(frozen=True, slots=True)
class LogoutSession:
    tokens: SessionTokenDecoder
    revoked_tokens: RevokedTokenRepository

    def execute(self, token: str | None) -> None:
        if token is None:
            return
        revocation = self.tokens.decode_for_revocation(token)
        if revocation is None or self.revoked_tokens.exists(revocation.jti):
            return
        self.revoked_tokens.add(revocation)
