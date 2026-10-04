"""Caso de uso: aceptar una vinculación con un código."""

from __future__ import annotations

import re
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

        if not re.fullmatch(r"[A-F0-9]{12}-[A-F0-9]{32}", code):
            raise InvalidLinkCode()
        selector, secret = code.split("-", 1)
        record = self.repo.reserve_attempt(selector, now, data.email.lower())
        if record is None or not self.hasher.verify(secret, record.code_hash):
            raise InvalidLinkCode()
        if record.owner_user_id == str(data.user_id):
            raise SelfLinkForbidden()
        link = self.repo.redeem(
            record.id, linked_user_id=data.user_id, consumed_at=now, op="la vinculacion"
        )
        return AcceptLinkResult(link=link, owner=self.repo.get_participant(record.owner_user_id))
