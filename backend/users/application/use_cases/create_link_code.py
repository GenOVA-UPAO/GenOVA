"""Caso de uso: generar un código de vinculación (abierto o por invitación)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from users.application.dto import CreateLinkInput, LinkCreationResult
from users.application.ports import PasswordHasher, UserLinkRepository
from users.domain.links import CODE_TTL_HOURS, LinkSnapshot, new_link_code


@dataclass(frozen=True, slots=True)
class CreateLinkCode:
    repo: UserLinkRepository
    hasher: PasswordHasher

    def execute(self, data: CreateLinkInput) -> LinkCreationResult:
        code = new_link_code()
        expires_at = datetime.now(UTC) + timedelta(hours=CODE_TTL_HOURS)
        link: LinkSnapshot = self.repo.create(
            data.owner_id,
            invite_email=data.invite_email.lower() if data.invite_email else None,
            code_hash=self.hasher.hash(code),
            expires_at=expires_at,
            op="la invitacion" if data.invite_email else "la creacion del codigo",
        )
        return LinkCreationResult(link=link, code=code)
