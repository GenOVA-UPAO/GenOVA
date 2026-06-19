"""User linking endpoints controlled by granular role permissions."""

import secrets
import string
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_permission
from database import commit_or_500, get_db
from models import User, UserLink
from rate_limit import limiter
from security import hash_password, verify_password

router = APIRouter()


class InviteRequest(BaseModel):
    email: EmailStr


class AcceptRequest(BaseModel):
    code: str


def _new_code() -> str:
    raw = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{raw[:3]}-{raw[3:]}"


def _serialize(link: UserLink, owner: User | None = None, linked: User | None = None) -> dict:
    return {
        "id": str(link.id), "owner_user_id": str(link.owner_user_id),
        "linked_user_id": str(link.linked_user_id) if link.linked_user_id else None,
        "invite_email": link.invite_email, "status": link.status,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "created_at": link.created_at.isoformat() if link.created_at else None,
        "owner": {"email": owner.email, "full_name": owner.full_name} if owner else None,
        "linked": {"email": linked.email, "full_name": linked.full_name} if linked else None,
    }


@router.get("/me/links")
def list_my_links(
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db)):
    links = db.execute(
        select(UserLink)
        .where(UserLink.owner_user_id == current_user.id)
        .order_by(UserLink.created_at.desc())
    ).scalars().all()
    linked_ids = [lnk.linked_user_id for lnk in links if lnk.linked_user_id]
    linked_map = (
        {u.id: u for u in db.execute(select(User).where(User.id.in_(linked_ids))).scalars().all()}
        if linked_ids else {}
    )
    return {"links": [_serialize(link, owner=current_user, linked=linked_map.get(link.linked_user_id)) for link in links]}


@router.post("/me/links/code", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def create_link_code(
    request: Request,
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    code = _new_code()
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    link = UserLink(owner_user_id=current_user.id, code_hash=hash_password(code), expires_at=expires_at)
    db.add(link)
    commit_or_500(db, "la creacion del codigo")
    db.refresh(link)
    return {"link": _serialize(link, owner=current_user), "code": code}


@router.post("/me/links/invite", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def invite_link(
    request: Request,
    payload: InviteRequest,
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    code = _new_code()
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    link = UserLink(
        owner_user_id=current_user.id,
        invite_email=payload.email.lower(),
        code_hash=hash_password(code),
        expires_at=expires_at,
    )
    db.add(link)
    commit_or_500(db, "la invitacion")
    db.refresh(link)
    return {"link": _serialize(link, owner=current_user), "code": code}


@router.post("/me/links/accept")
@limiter.limit("10/minute")
def accept_link(
    request: Request,
    payload: AcceptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = payload.code.strip().upper()
    now = datetime.now(UTC)
    # Only redeemable links: open invite or email-matched
    pending = db.execute(
        select(UserLink).where(
            UserLink.status == "pending", UserLink.expires_at > now,
            (UserLink.invite_email.is_(None))
            | (UserLink.invite_email == current_user.email.lower()),
        )
    ).scalars().all()
    for link in pending:
        if not verify_password(code, link.code_hash):
            continue
        if link.owner_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="No puedes vincularte contigo mismo.")
        link.linked_user_id = current_user.id
        link.status = "active"
        link.consumed_at = now
        commit_or_500(db, "la vinculacion")
        db.refresh(link)
        return {"link": _serialize(link, owner=db.get(User, link.owner_user_id), linked=current_user)}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Codigo invalido o expirado.")


@router.delete("/me/links/{link_id}")
def delete_my_link(
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    link = db.get(UserLink, link_id)
    if not link or link.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vinculo no encontrado.")
    db.delete(link)
    commit_or_500(db, "la desvinculacion")
    return {"status": "ok"}


@router.post("/me/links/{link_id}/resend")
@limiter.limit("3/minute")
def resend_link(
    request: Request,
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    link = db.get(UserLink, link_id)
    if not link or link.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vinculo no encontrado.")
    if link.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden reenviar invitaciones pendientes.")
    code = _new_code()
    link.code_hash = hash_password(code)
    link.expires_at = datetime.now(UTC) + timedelta(hours=24)
    commit_or_500(db, "el reenvio")
    db.refresh(link)
    return {"link": _serialize(link, owner=current_user), "code": code}


@router.get("/links/admin")
def list_all_links(
    current_user: User = Depends(require_permission("users:link:admin")),
    db: Session = Depends(get_db),
):
    del current_user
    links = db.execute(select(UserLink).order_by(UserLink.created_at.desc())).scalars().all()
    user_ids = {lnk.owner_user_id for lnk in links} | {lnk.linked_user_id for lnk in links if lnk.linked_user_id}
    users_map = (
        {u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()}
        if user_ids else {}
    )
    return {"links": [_serialize(link, owner=users_map.get(link.owner_user_id), linked=users_map.get(link.linked_user_id) if link.linked_user_id else None) for link in links]}


@router.delete("/links/admin/{link_id}")
def delete_any_link(
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link:admin")),
    db: Session = Depends(get_db),
):
    del current_user
    link = db.get(UserLink, link_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vinculo no encontrado.")
    db.delete(link)
    commit_or_500(db, "la desvinculacion")
    return {"status": "ok"}
