"""Persistencia SQLAlchemy de los vínculos entre usuarios (UserLink)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import User, UserLink
from users.domain.errors import LinkNotFound
from users.domain.links import LinkParticipant, LinkRecord, LinkSnapshot


def _to_snapshot(link: UserLink) -> LinkSnapshot:
    return LinkSnapshot(
        id=str(link.id),
        owner_user_id=str(link.owner_user_id),
        linked_user_id=str(link.linked_user_id) if link.linked_user_id else None,
        invite_email=link.invite_email,
        status=link.status,
        expires_at=link.expires_at.isoformat() if link.expires_at else None,
        created_at=link.created_at.isoformat() if link.created_at else None,
    )


def _to_record(link: UserLink) -> LinkRecord:
    return LinkRecord(
        id=str(link.id),
        owner_user_id=str(link.owner_user_id),
        linked_user_id=str(link.linked_user_id) if link.linked_user_id else None,
        invite_email=link.invite_email,
        status=link.status,
        expires_at=link.expires_at.isoformat() if link.expires_at else None,
        created_at=link.created_at.isoformat() if link.created_at else None,
        code_hash=link.code_hash,
    )


def _participants_map(db: Session, user_ids: set) -> dict[str, LinkParticipant]:
    users = (
        {u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()}
        if user_ids
        else {}
    )
    return {
        str(uid): LinkParticipant(email=u.email, full_name=u.full_name)
        for uid, u in users.items()
    }


class SqlAlchemyUserLinkRepository:
    """Implementa `UserLinkRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_for_owner(self, owner_id) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]:
        links = (
            self._db.execute(
                select(UserLink)
                .where(UserLink.owner_user_id == owner_id)
                .order_by(UserLink.created_at.desc())
            )
            .scalars()
            .all()
        )
        linked_ids = {lnk.linked_user_id for lnk in links if lnk.linked_user_id}
        return [_to_snapshot(lnk) for lnk in links], _participants_map(self._db, linked_ids)

    def list_all(self) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]:
        links = (
            self._db.execute(select(UserLink).order_by(UserLink.created_at.desc()))
            .scalars()
            .all()
        )
        user_ids = {lnk.owner_user_id for lnk in links} | {
            lnk.linked_user_id for lnk in links if lnk.linked_user_id
        }
        return [_to_snapshot(lnk) for lnk in links], _participants_map(self._db, user_ids)

    def list_redeemable(self, now: datetime, invite_email: str) -> list[LinkRecord]:
        # Only redeemable links: open invite or email-matched (mismo filtro y
        # mismo orden natural que la consulta original del router).
        pending = (
            self._db.execute(
                select(UserLink).where(
                    UserLink.status == "pending",
                    UserLink.expires_at > now,
                    (UserLink.invite_email.is_(None))
                    | (UserLink.invite_email == invite_email),
                )
            )
            .scalars()
            .all()
        )
        return [_to_record(lnk) for lnk in pending]

    def get_participant(self, user_id: str) -> LinkParticipant | None:
        user = self._db.get(User, UUID(user_id))
        if user is None:
            return None
        return LinkParticipant(email=user.email, full_name=user.full_name)

    def create(
        self,
        owner_id,
        *,
        invite_email: str | None,
        code_hash: str,
        expires_at,
        op: str,
    ) -> LinkSnapshot:
        link = UserLink(
            owner_user_id=owner_id,
            invite_email=invite_email,
            code_hash=code_hash,
            expires_at=expires_at,
        )
        self._db.add(link)
        commit_or_500(self._db, op)
        self._db.refresh(link)
        return _to_snapshot(link)

    def redeem(self, link_id: str, *, linked_user_id, consumed_at, op: str) -> LinkSnapshot:
        link = self._db.get(UserLink, UUID(link_id))
        link.linked_user_id = linked_user_id
        link.status = "active"
        link.consumed_at = consumed_at
        commit_or_500(self._db, op)
        self._db.refresh(link)
        return _to_snapshot(link)

    def get_owned(self, link_id: UUID, owner_id) -> LinkRecord:
        link = self._db.get(UserLink, link_id)
        if not link or link.owner_user_id != owner_id:
            raise LinkNotFound()
        return _to_record(link)

    def rotate_code(self, link_id: UUID, *, code_hash: str, expires_at, op: str) -> LinkSnapshot:
        link = self._db.get(UserLink, link_id)
        link.code_hash = code_hash
        link.expires_at = expires_at
        commit_or_500(self._db, op)
        self._db.refresh(link)
        return _to_snapshot(link)

    def delete_owned(self, link_id: UUID, owner_id) -> None:
        link = self._db.get(UserLink, link_id)
        if not link or link.owner_user_id != owner_id:
            raise LinkNotFound()
        self._db.delete(link)
        commit_or_500(self._db, "la desvinculacion")

    def delete_any(self, link_id: UUID) -> None:
        link = self._db.get(UserLink, link_id)
        if not link:
            raise LinkNotFound()
        self._db.delete(link)
        commit_or_500(self._db, "la desvinculacion")
