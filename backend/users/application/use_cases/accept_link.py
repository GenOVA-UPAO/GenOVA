"""Caso de uso: aceptar una vinculación con un código."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from users.application.dto import AcceptLinkInput, AcceptLinkResult
from users.application.ports import PasswordHasher, UserLinkRepository
from users.domain.errors import InvalidLinkCode, SelfLinkForbidden


@dataclass(frozen=True, slots=True)
class AcceptLink:
    repo: UserLinkRepository
    hasher: PasswordHasher

    def execute(self, data: AcceptLinkInput) -> AcceptLinkResult:
        code = data.code.strip().upper()
        now = datetime.now(UTC)

        # Mismo bucle que el router original: se verifica el código contra
        # cada vínculo canjeable; el chequeo de auto-vínculo corta en cuanto
        # hay match (los siguientes pendientes no se prueban).
        for record in self.repo.list_redeemable(now, data.email.lower()):
            if not self.hasher.verify(code, record.code_hash):
                continue
            if record.owner_user_id == str(data.user_id):
                raise SelfLinkForbidden()
            link = self.repo.redeem(
                record.id, linked_user_id=data.user_id, consumed_at=now, op="la vinculacion"
            )
            owner = self.repo.get_participant(record.owner_user_id)
            return AcceptLinkResult(link=link, owner=owner)

        raise InvalidLinkCode()
