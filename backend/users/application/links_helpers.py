"""Shared helpers for user-link endpoints (code generation + serialization).

Used by both the user-facing links router and the admin links router.
"""

import secrets
import string

from models import User, UserLink


def _new_code() -> str:
    raw = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{raw[:3]}-{raw[3:]}"


def _serialize(link: UserLink, owner: User | None = None, linked: User | None = None) -> dict:
    return {
        "id": str(link.id),
        "owner_user_id": str(link.owner_user_id),
        "linked_user_id": str(link.linked_user_id) if link.linked_user_id else None,
        "invite_email": link.invite_email,
        "status": link.status,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "created_at": link.created_at.isoformat() if link.created_at else None,
        "owner": {"email": owner.email, "full_name": owner.full_name} if owner else None,
        "linked": {"email": linked.email, "full_name": linked.full_name} if linked else None,
    }
