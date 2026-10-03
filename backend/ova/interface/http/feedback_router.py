"""Valoración 👍/👎 del docente por recurso de su OVA."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.use_cases import FeedbackInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.feedback import COMMENT_MAX, ResourceFeedback
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · Valoración de recursos"])


class FeedbackBody(BaseModel):
    rating: str
    reason: str | None = None
    # El tope real lo valida el caso de uso (mensaje en español); aquí solo se acota el payload.
    comment: str | None = Field(default=None, max_length=COMMENT_MAX * 2)


def _actor(user) -> OvaActor:
    return OvaActor(id=str(user.id), is_admin=bool(user.admin_flag_cached))


def _to_dict(fb: ResourceFeedback) -> dict:
    return {
        "phase_id": fb.phase_id,
        "rating": fb.rating,
        "reason": fb.reason,
        "comment": fb.comment,
        "template_key": fb.template_key,
        "updated_at": fb.updated_at.isoformat() if fb.updated_at else None,
    }


@router.get("/{ova_id}/feedback", summary="Valoraciones del docente de los recursos de la OVA")
@limiter.limit("60/minute")
def list_feedback(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        items = use_cases.resource_feedback.list(FeedbackInput(ova_id=ova_id, phase_id="", actor=_actor(current_user)))
    except OvaError as error:
        return ova_error_to_response(error)
    return {"feedback": [_to_dict(i) for i in items]}


@router.put("/{ova_id}/fases/{fase_id}/feedback", summary="Valorar un recurso (idempotente por usuario y recurso)")
@limiter.limit("60/minute")
def put_feedback(
    request: Request,
    ova_id: str,
    fase_id: str,
    payload: FeedbackBody,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        fb = use_cases.resource_feedback.put(
            FeedbackInput(
                ova_id=ova_id,
                phase_id=fase_id,
                actor=_actor(current_user),
                rating=payload.rating,
                reason=payload.reason,
                comment=payload.comment,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _to_dict(fb)


@router.delete("/{ova_id}/fases/{fase_id}/feedback", summary="Quitar la valoración de un recurso")
@limiter.limit("60/minute")
def delete_feedback(
    request: Request,
    ova_id: str,
    fase_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        use_cases.resource_feedback.delete(FeedbackInput(ova_id=ova_id, phase_id=fase_id, actor=_actor(current_user)))
    except OvaError as error:
        return ova_error_to_response(error)
    return {"deleted": True}
