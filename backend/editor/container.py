"""Composition root del dominio del editor visual.

Cablea los casos de uso con repositorios concretos e intérpretes mediante la DI de FastAPI.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from editor.application.ports import IntentInterpreterPort
from editor.application.use_cases import (
    ConfirmAndApplyUseCase,
    InterpretAndApplyUseCase,
    RecordFeedbackUseCase,
)
from editor.infrastructure.interpreters.hybrid import HybridIntentInterpreter
from editor.infrastructure.interpreters.laya import LayaIntentInterpreter
from editor.infrastructure.interpreters.llm import LlmIntentInterpreter
from editor.infrastructure.interpreters.rules import RulesIntentInterpreter
from editor.infrastructure.phase_repository import SqlAlchemyEditorPhaseRepository
from editor.infrastructure.repository import SqlAlchemyEditorFeedbackRepository
from editor.infrastructure.verifier import LayaPostVerifier


@dataclass(frozen=True, slots=True)
class EditorUseCases:
    interpret_and_apply: InterpretAndApplyUseCase
    confirm_and_apply: ConfirmAndApplyUseCase
    record_feedback: RecordFeedbackUseCase


def _create_interpreters() -> dict[str, IntentInterpreterPort]:
    rules = RulesIntentInterpreter()
    laya = LayaIntentInterpreter(
        base_url=os.getenv("LAYA_URL", "http://localhost:8090/v1/systemone"),
        backend_tag="laya",
    )
    laya_ft = LayaIntentInterpreter(
        base_url=os.getenv("LAYA_FT_URL", "http://localhost:8091/v1/systemone"),
        backend_tag="laya-ft",
    )
    llm = LlmIntentInterpreter()

    hybrid = HybridIntentInterpreter(
        rules_interpreter=rules,
        laya_interpreter=laya,
        llm_interpreter=llm,
        scope_guard=laya,
        backend_tag="hybrid",
    )
    hybrid_ft = HybridIntentInterpreter(
        rules_interpreter=rules,
        laya_interpreter=laya_ft,
        llm_interpreter=llm,
        scope_guard=laya_ft,
        backend_tag="hybrid-ft",
    )

    return {
        "rules": rules,
        "laya": laya,
        "laya-ft": laya_ft,
        "llm": llm,
        "hybrid": hybrid,
        "hybrid-ft": hybrid_ft,
    }


def build_editor(db: Session = Depends(get_db)) -> EditorUseCases:
    feedback_repo = SqlAlchemyEditorFeedbackRepository(db)
    phase_repo = SqlAlchemyEditorPhaseRepository(db)
    interpreters = _create_interpreters()

    default_backend = os.getenv("EDITOR_INTENT_BACKEND", "hybrid")
    enable_pv_default = os.getenv("ENABLE_POST_VERIFICATION", "0").lower() in ("1", "true")
    post_verifier = LayaPostVerifier(
        base_url=os.getenv("LAYA_URL", "http://localhost:8090/v1/systemone")
    )

    return EditorUseCases(
        interpret_and_apply=InterpretAndApplyUseCase(
            interpreters=interpreters,
            default_backend=default_backend,
            post_verifier=post_verifier,
            enable_post_verification_default=enable_pv_default,
        ),
        confirm_and_apply=ConfirmAndApplyUseCase(phase_repo=phase_repo),
        record_feedback=RecordFeedbackUseCase(feedback_repo=feedback_repo),
    )
