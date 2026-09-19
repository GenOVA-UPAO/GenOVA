"""HTTP endpoints for OVA editor chat history."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import ChatAccessInput, ChatCreateInput, ChatPatchInput
from ova.container import OvaUseCases, build_ova
from ova.domain.chat import ChatMessage
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · Chat"])


class ChatMessageIn(BaseModel):
    id: str | None = None
    role: str
    kind: str = "message"
    text: str = ""
    status: str | None = None
    percentage: int | None = None
    resource_labels: list[str] = Field(default_factory=list)


class ChatMessagePatchBody(BaseModel):
    text: str | None = None
    status: str | None = None
    percentage: int | None = None
    resource_labels: list[str] | None = None


def _actor(user) -> OvaActor:
    return OvaActor(id=str(user.id), is_admin=bool(user.admin_flag_cached))


def _access(ova_id: str, user) -> ChatAccessInput:
    return ChatAccessInput(ova_id=ova_id, actor=_actor(user))


def _message_to_dict(message: ChatMessage) -> dict:
    return {
        "id": message.id,
        "role": message.role,
        "kind": message.kind,
        "text": message.text or "",
        "status": message.status,
        "percentage": message.percentage,
        "resource_labels": list(message.resource_labels),
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


@router.get("/{ova_id}/chat", summary="Obtener el historial de chat de la OVA")
@limiter.limit("60/minute")
def get_chat(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        messages = use_cases.editor_chat.list(_access(ova_id, current_user))
    except OvaError as error:
        return ova_error_to_response(error)
    return {"messages": [_message_to_dict(message) for message in messages]}


@router.post("/{ova_id}/chat", summary="Enviar un mensaje al chat de la OVA")
@limiter.limit("60/minute")
def post_chat(
    request: Request,
    ova_id: str,
    payload: ChatMessageIn,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        message = use_cases.editor_chat.create(
            ChatCreateInput(
                ova_id=ova_id,
                actor=_actor(current_user),
                role=payload.role,
                kind=payload.kind,
                text=payload.text,
                status=payload.status,
                percentage=payload.percentage,
                resource_labels=tuple(payload.resource_labels),
                message_id=payload.id,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _message_to_dict(message)


@router.patch("/{ova_id}/chat/{message_id}", summary="Editar un mensaje del chat")
@limiter.limit("60/minute")
def patch_chat(
    request: Request,
    ova_id: str,
    message_id: str,
    payload: ChatMessagePatchBody,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        message = use_cases.editor_chat.patch(
            ChatPatchInput(
                ova_id=ova_id,
                actor=_actor(current_user),
                message_id=message_id,
                text=payload.text,
                status=payload.status,
                percentage=payload.percentage,
                resource_labels=(
                    tuple(payload.resource_labels) if payload.resource_labels is not None else None
                ),
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _message_to_dict(message)


@router.delete("/{ova_id}/chat/{message_id}", summary="Eliminar un mensaje del chat")
@limiter.limit("60/minute")
def delete_chat_message(
    request: Request,
    ova_id: str,
    message_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        use_cases.editor_chat.delete(
            ChatPatchInput(
                ova_id=ova_id, actor=_actor(current_user), message_id=message_id
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {"ok": True}


@router.delete("/{ova_id}/chat", summary="Vaciar el chat de la OVA")
@limiter.limit("30/minute")
def clear_chat(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        deleted = use_cases.editor_chat.clear(_access(ova_id, current_user))
    except OvaError as error:
        return ova_error_to_response(error)
    return {"ok": True, "deleted": deleted}
