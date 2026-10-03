"""Router FastAPI para los endpoints del editor visual."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from editor.application.dto import (
    ConfirmAndApplyInput,
    FeedbackInput,
    InterpretAndApplyInput,
)
from editor.container import EditorUseCases, build_editor
from editor.domain.model import ResourceBlock
from editor.interface.http.schemas import (
    ConfirmRequest,
    FeedbackRequest,
    InterpretRequest,
    ResourceBlockSchema,
)

router = APIRouter(tags=["OVA · Editor Visual"])


def _to_domain_blocks(blocks: list[ResourceBlockSchema]) -> list[ResourceBlock]:
    return [
        ResourceBlock(
            id=b.id,
            tipo=b.tipo,
            props=b.props,
        )
        for b in blocks
    ]


def _verify_editor_access(
    editor: EditorUseCases,
    ova_id: str,
    phase_id: str,
    user: Any,
) -> None:
    phase_repo = editor.confirm_and_apply.phase_repo
    owner_id = phase_repo.get_ova_owner(ova_id)
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OVA no encontrado.",
        )

    is_admin = bool(getattr(user, "admin_flag_cached", False) or getattr(user, "is_admin", False))
    if not is_admin and owner_id != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este OVA.",
        )

    if not phase_repo.phase_exists(ova_id, phase_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fase no encontrada en este OVA.",
        )


@router.post(
    "/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
    summary="Interpretar instrucción en lenguaje natural y aplicar sobre los bloques de la fase",
)
@router.post(
    "/{ova_id}/fases/{phase_id}/editor/interpret-and-apply",
    summary="Interpretar instrucción y aplicar (alias)",
    include_in_schema=False,
)
@limiter.limit("60/minute")
def interpret_and_apply(
    request: Request,
    ova_id: str,
    phase_id: str,
    payload: InterpretRequest,
    current_user: Any = Depends(get_current_user),
    editor: EditorUseCases = Depends(build_editor),
) -> dict[str, Any]:
    _verify_editor_access(editor, ova_id, phase_id, current_user)
    domain_blocks = _to_domain_blocks(payload.blocks)

    output = editor.interpret_and_apply.execute(
        InterpretAndApplyInput(
            instruction=payload.instruction,
            blocks=domain_blocks,
            backend=payload.backend or "hybrid",
            options=payload.options,
        )
    )
    return output.to_dict()


@router.post(
    "/{ova_id}/phases/{phase_id}/editor/confirm",
    summary="Confirmar y persistir la nueva versión con bloques editados",
)
@router.post(
    "/{ova_id}/fases/{phase_id}/editor/confirmar",
    summary="Confirmar y persistir versión (alias)",
    include_in_schema=False,
)
@limiter.limit("30/minute")
def confirm_and_apply(
    request: Request,
    ova_id: str,
    phase_id: str,
    payload: ConfirmRequest,
    current_user: Any = Depends(get_current_user),
    editor: EditorUseCases = Depends(build_editor),
) -> dict[str, Any]:
    _verify_editor_access(editor, ova_id, phase_id, current_user)
    domain_blocks = _to_domain_blocks(payload.blocks)
    is_admin = bool(getattr(current_user, "admin_flag_cached", False) or getattr(current_user, "is_admin", False))

    return editor.confirm_and_apply.execute(
        ConfirmAndApplyInput(
            ova_id=ova_id,
            phase_id=phase_id,
            instruction=payload.instruction,
            blocks=domain_blocks,
            actor_id=str(current_user.id),
            is_admin=is_admin,
        )
    )


@router.post(
    "/{ova_id}/editor/feedback",
    summary="Registrar telemetría de interacción y feedback del editor",
)
@router.post(
    "/{ova_id}/phases/{phase_id}/editor/feedback",
    summary="Registrar telemetría de interacción con fase (alias)",
    include_in_schema=False,
)
@router.post(
    "/{ova_id}/fases/{phase_id}/editor/feedback",
    summary="Registrar telemetría de interacción con fase (alias)",
    include_in_schema=False,
)
@limiter.limit("60/minute")
def record_feedback(
    request: Request,
    ova_id: str,
    payload: FeedbackRequest,
    phase_id: str | None = None,
    current_user: Any = Depends(get_current_user),
    editor: EditorUseCases = Depends(build_editor),
) -> dict[str, Any]:
    fase = payload.fase_id or phase_id
    user_id = str(current_user.id) if current_user else None

    return editor.record_feedback.execute(
        FeedbackInput(
            user_id=user_id,
            ova_id=ova_id,
            fase_id=fase,
            instruccion=payload.instruccion,
            bloques_antes=payload.bloques_antes,
            intencion_propuesta=payload.intencion_propuesta,
            intencion_final=payload.intencion_final,
            resultado=payload.resultado,
            confianza=payload.confianza,
            backend=payload.backend,
            motivo_rechazo=payload.motivo_rechazo,
        )
    )
