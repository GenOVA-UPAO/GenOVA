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
from database import get_db
from models import User, UserLink
from rate_limit import limiter
from security import hash_password, verify_password

router = APIRouter()


class InviteRequest(BaseModel):
    email: EmailStr


class AcceptRequest(BaseModel):
    code: str


def _new_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(6))
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


def _commit_or_500(db: Session, op: str) -> None:
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo completar {op}.",
        ) from exc


@router.get("/me/links")
def list_my_links(
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    links = db.execute(
        select(UserLink)
        .where(UserLink.owner_user_id == current_user.id)
        .order_by(UserLink.created_at.desc())
    ).scalars().all()
    return {
        "links": [
            _serialize(
                link,
                owner=current_user,
                linked=db.get(User, link.linked_user_id) if link.linked_user_id else None,
            )
            for link in links
        ]
    }


@router.post("/me/links/code", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def create_link_code(
    request: Request,
    current_user: User = Depends(require_permission("users:link")),
    db: Session = Depends(get_db),
):
    code = _new_code()
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    link = UserLink(
        owner_user_id=current_user.id,
        code_hash=hash_password(code),
        expires_at=expires_at,
    )
    db.add(link)
    _commit_or_500(db, "la creacion del codigo")
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
    _commit_or_500(db, "la invitacion")
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
    pending = db.execute(
        select(UserLink).where(
            UserLink.status == "pending",
            UserLink.expires_at > now,
        )
    ).scalars().all()
    for link in pending:
        if not verify_password(code, link.code_hash):
            continue
        if link.owner_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="No puedes vincularte contigo mismo.")
        if link.invite_email and link.invite_email.lower() != current_user.email.lower():
            raise HTTPException(status_code=403, detail="Este codigo fue generado para otro correo.")
        link.linked_user_id = current_user.id
        link.status = "active"
        link.consumed_at = now
        _commit_or_500(db, "la vinculacion")
        db.refresh(link)
        return {
            "link": _serialize(
                link,
                owner=db.get(User, link.owner_user_id),
                linked=current_user,
            )
        }
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
    _commit_or_500(db, "la desvinculacion")
    return {"status": "ok"}


@router.get("/links/admin")
def list_all_links(
    current_user: User = Depends(require_permission("users:link:admin")),
    db: Session = Depends(get_db),
):
    del current_user
    links = db.execute(select(UserLink).order_by(UserLink.created_at.desc())).scalars().all()
    return {
        "links": [
            _serialize(
                link,
                owner=db.get(User, link.owner_user_id),
                linked=db.get(User, link.linked_user_id) if link.linked_user_id else None,
            )
            for link in links
        ]
    }


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
    _commit_or_500(db, "la desvinculacion")
    return {"status": "ok"}
