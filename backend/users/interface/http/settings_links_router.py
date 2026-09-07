"""User linking endpoints controlled by granular role permissions."""

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, EmailStr

from auth.dependencies import get_current_user, require_permission
from core.rate_limit import limiter
from models import User
from users.application.dto import AcceptLinkInput, CreateLinkInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.domain.links import LinkParticipant, serialize_link
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Vinculaciones"])


class InviteRequest(BaseModel):
    email: EmailStr


class AcceptRequest(BaseModel):
    code: str


@router.get("/me/links", summary="Listar los vínculos propios")
def list_my_links(
    current_user: User = Depends(require_permission("users:link")),
    users: UsersUseCases = Depends(build_users),
):
    result = users.list_my_links.execute(current_user.id)
    owner = LinkParticipant(email=current_user.email, full_name=current_user.full_name)
    return {
        "links": [
            serialize_link(link, owner=owner, linked=result.linked_map.get(link.linked_user_id))
            for link in result.links
        ]
    }


@router.post(
    "/me/links/code",
    status_code=status.HTTP_201_CREATED,
    summary="Generar un código de vinculación",
)
@limiter.limit("5/minute")
def create_link_code(
    request: Request,
    current_user: User = Depends(require_permission("users:link")),
    users: UsersUseCases = Depends(build_users),
):
    result = users.create_link_code.execute(
        CreateLinkInput(owner_id=current_user.id, invite_email=None)
    )
    owner = LinkParticipant(email=current_user.email, full_name=current_user.full_name)
    return {"link": serialize_link(result.link, owner=owner), "code": result.code}


@router.post(
    "/me/links/invite",
    status_code=status.HTTP_201_CREATED,
    summary="Invitar por correo a vincularse",
)
@limiter.limit("5/minute")
def invite_link(
    request: Request,
    payload: InviteRequest,
    current_user: User = Depends(require_permission("users:link")),
    users: UsersUseCases = Depends(build_users),
):
    result = users.create_link_code.execute(
        CreateLinkInput(owner_id=current_user.id, invite_email=payload.email)
    )
    owner = LinkParticipant(email=current_user.email, full_name=current_user.full_name)
    return {"link": serialize_link(result.link, owner=owner), "code": result.code}


@router.post("/me/links/accept", summary="Aceptar una vinculación con un código")
@limiter.limit("10/minute")
def accept_link(
    request: Request,
    payload: AcceptRequest,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        result = users.accept_link.execute(
            AcceptLinkInput(user_id=current_user.id, email=current_user.email, code=payload.code)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    linked = LinkParticipant(email=current_user.email, full_name=current_user.full_name)
    return {"link": serialize_link(result.link, owner=result.owner, linked=linked)}


@router.delete("/me/links/{link_id}", summary="Eliminar un vínculo propio")
def delete_my_link(
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        users.delete_my_link.execute(current_user.id, link_id)
    except UserError as err:
        raise to_http_exception(err) from None

    return {"status": "ok"}


@router.post("/me/links/{link_id}/resend", summary="Reenviar la invitación de un vínculo")
@limiter.limit("3/minute")
def resend_link(
    request: Request,
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        result = users.resend_link.execute(current_user.id, link_id)
    except UserError as err:
        raise to_http_exception(err) from None

    owner = LinkParticipant(email=current_user.email, full_name=current_user.full_name)
    return {"link": serialize_link(result.link, owner=owner), "code": result.code}
