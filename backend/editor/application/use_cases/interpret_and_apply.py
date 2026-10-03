"""Caso de uso: Interpretar instrucción y aplicar sobre bloques."""

from __future__ import annotations

import time
from dataclasses import dataclass

from editor.application.dto import InterpretAndApplyInput, InterpretAndApplyOutput
from editor.application.ports import IntentInterpreterPort, PostVerifierPort
from editor.domain import (
    OUT_OF_SCOPE_MESSAGE,
    Intent,
    IntentTrace,
    ResourceBlock,
    apply_intent,
    check_deterministic_guard,
    has_multiple_actions,
    is_generative_content_request,
)


def _check_initial_guards(
    instruction: str,
    start_time: float,
    blocks: list[ResourceBlock],
) -> InterpretAndApplyOutput | None:
    det_guard = check_deterministic_guard(instruction)
    if not det_guard.allowed:
        elapsed_ms = (time.time() - start_time) * 1000
        intent = Intent(
            accion="ninguna",
            confianza=0.99,
            motivo=det_guard.motivo or "Instrucción no permitida.",
            razon=f"Guard determinista: {det_guard.reason or 'rechazo'}",
            es_fuera_de_alcance=det_guard.reason in ("manipulation", "borra_todo", "lenguaje_inapropiado"),
        )
        return InterpretAndApplyOutput(
            intent=intent,
            blocks=blocks,
            trace=IntentTrace(backend="guard", elapsed_ms=elapsed_ms, message=intent.motivo),
            requiere_confirmacion=False,
            motivo=intent.motivo,
        )

    if has_multiple_actions(instruction):
        elapsed_ms = (time.time() - start_time) * 1000
        motivo = "Solo puedo realizar una acción a la vez. Por favor, solicita una instrucción por turno."
        intent = Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)
        return InterpretAndApplyOutput(
            intent=intent,
            blocks=blocks,
            trace=IntentTrace(backend="guard", elapsed_ms=elapsed_ms, message=motivo),
            requiere_confirmacion=False,
            motivo=motivo,
        )

    if is_generative_content_request(instruction):
        elapsed_ms = (time.time() - start_time) * 1000
        intent = Intent(
            accion="ninguna",
            confianza=0.99,
            motivo=OUT_OF_SCOPE_MESSAGE,
            razon="Generación de contenido fuera de alcance: solo se edita la estructura",
            es_fuera_de_alcance=True,
        )
        return InterpretAndApplyOutput(
            intent=intent,
            blocks=blocks,
            trace=IntentTrace(backend="guard", elapsed_ms=elapsed_ms, message=OUT_OF_SCOPE_MESSAGE),
            requiere_confirmacion=False,
            motivo=OUT_OF_SCOPE_MESSAGE,
        )
    return None


@dataclass(frozen=True, slots=True)
class InterpretAndApplyUseCase:
    interpreters: dict[str, IntentInterpreterPort]
    default_backend: str = "hybrid"
    post_verifier: PostVerifierPort | None = None
    enable_post_verification_default: bool = False

    def execute(self, params: InterpretAndApplyInput) -> InterpretAndApplyOutput:
        start_time = time.time()
        instruction = params.instruction
        blocks = params.blocks

        guard_out = _check_initial_guards(instruction, start_time, blocks)
        if guard_out is not None:
            return guard_out

        backend_name = params.backend or self.default_backend
        interpreter = self.interpreters.get(backend_name) or self.interpreters.get(self.default_backend)
        if not interpreter:
            interpreter = next(iter(self.interpreters.values()))

        intent, trace = interpreter.interpret(instruction, blocks, params.options)
        reduction = apply_intent(blocks, intent)

        enable_pv = params.options.get("enable_post_verification", self.enable_post_verification_default)
        final_intent = intent
        final_blocks = reduction.blocks if reduction.success else blocks

        if enable_pv and self.post_verifier and reduction.success and intent.accion != "ninguna" and not intent.requiere_confirmacion:
            verified, pv_score, pv_reason = self.post_verifier.verify(
                instruction, blocks, reduction.blocks, intent, params.options
            )
            if not verified:
                final_intent = Intent(
                    accion=intent.accion,
                    bloque=intent.bloque,
                    destino=intent.destino,
                    contenido=intent.contenido,
                    confianza=intent.confianza,
                    razon=f"Post-verificación Laya: {pv_reason or 'score no superó umbral'}",
                    requiere_confirmacion=True,
                    motivo="No estoy seguro de haber entendido",
                    es_fuera_de_alcance=intent.es_fuera_de_alcance,
                    bloque_descripcion=intent.bloque_descripcion,
                    referencia_resuelta_por_contenido=intent.referencia_resuelta_por_contenido,
                    post_verificacion_score=pv_score,
                )
                final_blocks = blocks

        return InterpretAndApplyOutput(
            intent=final_intent,
            blocks=final_blocks,
            trace=trace,
            requiere_confirmacion=final_intent.requiere_confirmacion,
            motivo=final_intent.motivo or final_intent.razon,
        )
