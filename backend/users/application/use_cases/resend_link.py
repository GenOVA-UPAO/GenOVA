"""Caso de uso: reenviar la invitación de un vínculo propio."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from users.application.dto import LinkCreationResult
from users.application.ports import PasswordHasher, UserLinkRepository
from users.domain.errors import LinkNotPending
from users.domain.links import CODE_TTL_HOURS, new_link_code


@dataclass(frozen=True, slots=True)
class ResendLink:
    repo: UserLinkRepository
    hasher: PasswordHasher

    def execute(self, owner_id, link_id: UUID) -> LinkCreationResult:
        record = self.repo.get_owned(link_id, owner_id)
        if record.status != "pending":
            raise LinkNotPending()

        code = new_link_code()
        link = self.repo.rotate_code(
            link_id,
            code_hash=self.hasher.hash(code),
            expires_at=datetime.now(UTC) + timedelta(hours=CODE_TTL_HOURS),
            op="el reenvio",
        )
        return LinkCreationResult(link=link, code=code)
