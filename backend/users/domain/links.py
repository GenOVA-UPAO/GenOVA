"""Reglas puras de los vínculos entre usuarios (invitación por código).

El código de vinculación se genera aquí (formato `XXX-XXX`), caduca en 24 h y
se guarda SOLO su hash bcrypt. La serialización reproduce byte a byte el
formulario que consumía el frontend.
"""

from __future__ import annotations

import secrets
import string
from dataclasses import dataclass

CODE_TTL_HOURS = 24
_CODE_ALPHABET = string.ascii_uppercase + string.digits


@dataclass(frozen=True, slots=True)
class LinkParticipant:
    """Email/nombre de un usuario implicado en un vínculo (para el sobre)."""

    email: str
    full_name: str | None


@dataclass(frozen=True, slots=True)
class LinkSnapshot:
    """Vínculo serializable — sin material sensible (ni código ni hash)."""

    id: str
    owner_user_id: str
    linked_user_id: str | None
    invite_email: str | None
    status: str
    expires_at: str | None
    created_at: str | None


@dataclass(frozen=True, slots=True)
class LinkRecord(LinkSnapshot):
    """Registro interno con el hash del código (solo para verificación)."""

    code_hash: str


def new_link_code() -> str:
    raw = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
    return f"{raw[:3]}-{raw[3:]}"


def serialize_link(
    link: LinkSnapshot,
    owner: LinkParticipant | None = None,
    linked: LinkParticipant | None = None,
) -> dict:
    return {
        "id": link.id,
        "owner_user_id": link.owner_user_id,
        "linked_user_id": link.linked_user_id,
        "invite_email": link.invite_email,
        "status": link.status,
        "expires_at": link.expires_at,
        "created_at": link.created_at,
        "owner": {"email": owner.email, "full_name": owner.full_name} if owner else None,
        "linked": {"email": linked.email, "full_name": linked.full_name} if linked else None,
    }
