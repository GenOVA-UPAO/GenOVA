"""HTTP endpoints for OVA editor chat history."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.rate_limit import limiter
from models import User
from ova.chat import service as chat_service
from ova.crud.edit_helpers import _resolve_ova

router = APIRouter(tags=["OVA · Chat"])

_ALLOWED_ROLES = frozenset({"user", "assistant", "system"})
_ALLOWED_STATUS = frozenset({"running", "success", "error"})


class ChatMessageIn(BaseModel):
    id: str | None = None
    role: str
    kind: str = "message"
    text: str = ""
    status: str | None = None
    percentage: int | None = None
    resource_labels: list[str] = Field(default_factory=list)


class ChatMessagePatch(BaseModel):
    text: str | None = None
    status: str | None = None
    percentage: int | None = None
    resource_labels: list[str] | None = None


@router.get("/{ova_id}/chat", summary="Obtener el historial de chat de la OVA")
@limiter.limit("60/minute")
def get_chat(
    request: Request,
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err
    return {"messages": chat_service.list_messages(db, str(ova.id))}


@router.post("/{ova_id}/chat", summary="Enviar un mensaje al chat de la OVA")
@limiter.limit("60/minute")
def post_chat(
    request: Request,
    ova_id: str,
    payload: ChatMessageIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err
    if payload.role not in _ALLOWED_ROLES:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_role", "message": "Rol de mensaje no válido."},
        )
    if payload.status and payload.status not in _ALLOWED_STATUS:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_status", "message": "Estado de mensaje no válido."},
        )
    row = chat_service.create_message(
        db,
        ova_id=str(ova.id),
        user_id=str(current_user.id),
        role=payload.role,
        kind=payload.kind[:40],
        text=payload.text[:8000],
        status=payload.status,
        percentage=payload.percentage,
        resource_labels=payload.resource_labels[:20],
        message_id=payload.id,
    )
    commit_or_500(db, op="save_chat_message")
    db.refresh(row)
    return chat_service.message_to_dict(row)


@router.patch("/{ova_id}/chat/{message_id}", summary="Editar un mensaje del chat")
@limiter.limit("60/minute")
def patch_chat(
    request: Request,
    ova_id: str,
    message_id: str,
    payload: ChatMessagePatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err
    if payload.status and payload.status not in _ALLOWED_STATUS:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_status", "message": "Estado de mensaje no válido."},
        )
    row = chat_service.update_message(
        db,
        ova_id=str(ova.id),
        message_id=message_id,
        text=payload.text[:8000] if payload.text is not None else None,
        status=payload.status,
        percentage=payload.percentage,
        resource_labels=payload.resource_labels,
    )
    if not row:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "Mensaje no encontrado."},
        )
    commit_or_500(db, op="update_chat_message")
    db.refresh(row)
    return chat_service.message_to_dict(row)


@router.delete("/{ova_id}/chat/{message_id}", summary="Eliminar un mensaje del chat")
@limiter.limit("60/minute")
def delete_chat_message(
    request: Request,
    ova_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err
    if not chat_service.delete_message(db, ova_id=str(ova.id), message_id=message_id):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "Mensaje no encontrado."},
        )
    commit_or_500(db, op="delete_chat_message")
    return {"ok": True}


@router.delete("/{ova_id}/chat", summary="Vaciar el chat de la OVA")
@limiter.limit("30/minute")
def clear_chat(
    request: Request,
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err
    deleted = chat_service.clear_messages(db, ova_id=str(ova.id))
    commit_or_500(db, op="clear_chat_messages")
    return {"ok": True, "deleted": deleted}
