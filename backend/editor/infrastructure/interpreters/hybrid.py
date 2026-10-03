"""Intérprete híbrido para el editor visual.

Combina reglas deterministas de alto rendimiento, Laya System One (:8090 o :8091 FT),
guard de alcance en dos capas, respaldo inteligente por LLM y confirmación amplia.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any

from editor.application.ports import IntentInterpreterPort, ScopeGuardPort
from editor.domain import (
    OUT_OF_SCOPE_MESSAGE,
    Intent,
    IntentBlockRef,
    IntentTrace,
    ResourceBlock,
    check_add_type_supported,
    check_ambiguous_deictics,
    check_destination_reference_feasibility,
    check_deterministic_guard,
    check_non_existent_raw_types,
    check_target_feasibility,
    extract_core_request,
    extract_deterministic_action,
    extract_deterministic_destination,
    extract_deterministic_ordinal,
    extract_deterministic_type,
    find_block_by_content_or_title,
    find_target_block_index,
    format_block_description,
    has_multiple_actions,
    is_generative_content_request,
    normalize_type,
    split_object_and_destination,
)

EDIT_VERBS_WORDS = (
    "quita", "quitar", "borra", "borrar", "elimina", "eliminar", "saca", "sacar",
    "mueve", "mover", "pon", "poner", "coloca", "colocar", "sube", "subir",
    "baja", "bajar", "pasa", "pasar", "anade", "anadir", "agrega", "agregar",
)


@dataclass(slots=True)
class _ParsedRequest:
    effective: str
    obj_text: str
    dest_text: str | None
    det_action: str | None
    raw_det_type: str | None
    det_type: str | None
    det_ordinal: int | str | None
    destino: Any
    ref_by_content: bool
    content_match: dict[str, Any] | None
    num_ambig: bool


def _check_initial_guardrails(instruction: str) -> Intent | None:
    det_guard = check_deterministic_guard(instruction)
    if not det_guard.allowed:
        return Intent(
            accion="ninguna",
            confianza=0.99,
            motivo=det_guard.motivo or "Instrucción no permitida.",
            razon=f"Guard determinista: {det_guard.reason or 'rechazo'}",
            es_fuera_de_alcance=det_guard.reason in ("manipulation", "borra_todo", "lenguaje_inapropiado"),
        )
    if has_multiple_actions(instruction):
        motivo = "Solo puedo realizar una acción a la vez. Por favor, solicita una instrucción por turno."
        return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)
    if is_generative_content_request(instruction):
        return Intent(
            accion="ninguna",
            confianza=0.99,
            motivo=OUT_OF_SCOPE_MESSAGE,
            razon="Generación de contenido fuera de alcance: solo se edita la estructura",
            es_fuera_de_alcance=True,
        )
    return None


def _parse_deterministic_request(instruction: str, blocks: list[ResourceBlock]) -> _ParsedRequest:
    core_req = extract_core_request(instruction)
    effective = core_req if len(core_req) >= 4 else instruction
    obj_text, dest_text = split_object_and_destination(effective)

    det_action = (
        extract_deterministic_action(obj_text)
        or extract_deterministic_action(effective)
        or extract_deterministic_action(instruction)
    )
    raw_det_type = (
        extract_deterministic_type(obj_text)
        or extract_deterministic_type(effective)
        or extract_deterministic_type(instruction)
    )
    det_type = normalize_type(raw_det_type) if raw_det_type else None
    det_ordinal = extract_deterministic_ordinal(obj_text)
    destino, ref_by_content = extract_deterministic_destination(dest_text, blocks, det_type)

    if not det_action and det_type and destino and destino.posicion:
        det_action = "mover"

    content_match, det_ordinal, det_type, num_ambig = _resolve_content_and_ordinal(
        obj_text, blocks, det_type, det_ordinal
    )

    return _ParsedRequest(
        effective=effective,
        obj_text=obj_text,
        dest_text=dest_text,
        det_action=det_action,
        raw_det_type=raw_det_type,
        det_type=det_type,
        det_ordinal=det_ordinal,
        destino=destino,
        ref_by_content=ref_by_content,
        content_match=content_match,
        num_ambig=num_ambig,
    )


def _resolve_content_and_ordinal(
    object_text: str,
    blocks: list[ResourceBlock],
    det_type: str | None,
    det_ordinal: int | str | None,
) -> tuple[dict[str, Any] | None, int | str | None, str | None, bool]:
    content_match = find_block_by_content_or_title(blocks, object_text, det_type)
    num_ambig = False
    resolved_type = det_type

    if content_match:
        if isinstance(det_ordinal, int):
            target_type_for_blocks = det_type or normalize_type(content_match["block"].tipo)
            matching_blocks = [b for b in blocks if normalize_type(b.tipo) == target_type_for_blocks]
            has_block = 1 <= det_ordinal <= len(matching_blocks)
            block_at_ord = matching_blocks[det_ordinal - 1] if has_block else None
            if block_at_ord and block_at_ord.id != content_match["block"].id:
                num_ambig = True
            else:
                det_ordinal = None
        if not resolved_type:
            resolved_type = normalize_type(content_match["block"].tipo)

    if not resolved_type and det_ordinal is not None:
        idx = find_target_block_index(blocks, IntentBlockRef(indice=det_ordinal))
        if idx != -1 and idx < len(blocks):
            resolved_type = normalize_type(blocks[idx].tipo)

    return content_match, det_ordinal, resolved_type, num_ambig


def _has_edit_indications(
    instruction: str,
    req: _ParsedRequest,
    blocks: list[ResourceBlock],
) -> bool:
    has_edit_verb = (
        req.det_action is not None
        or any(w in req.effective for w in EDIT_VERBS_WORDS)
        or any(w in instruction for w in EDIT_VERBS_WORDS)
    )
    has_type = (
        (req.det_type is not None and any(normalize_type(b.tipo) == req.det_type for b in blocks))
        or (req.raw_det_type is not None and any(normalize_type(b.tipo) == normalize_type(req.raw_det_type) for b in blocks))
    )
    has_ref = (
        bool(req.content_match)
        or bool(find_block_by_content_or_title(blocks, req.effective))
        or bool(find_block_by_content_or_title(blocks, instruction))
    )
    return has_edit_verb and (has_type or has_ref)


def _check_preliminary_feasibility(
    instruction: str,
    req: _ParsedRequest,
    blocks: list[ResourceBlock],
) -> Intent | None:
    deictic = check_ambiguous_deictics(instruction)
    if deictic:
        return deictic
    non_existent = check_non_existent_raw_types(req.raw_det_type, blocks)
    if non_existent:
        return non_existent
    unsupported_add = check_add_type_supported(req.det_action, req.det_type)
    if unsupported_add:
        return unsupported_add
    target_feas = check_target_feasibility(
        req.det_action, req.det_type, req.det_ordinal, blocks, req.content_match is not None
    )
    if target_feas:
        return target_feas
    return check_destination_reference_feasibility(req.destino, blocks, req.ref_by_content)


def _evaluate_confirmation(
    final_action: str,
    det_action: str | None,
    laya_action: str | None,
    det_type: str | None,
    laya_type: str | None,
    base_confidence: float,
    conf_threshold: float,
    by_content: bool,
    num_ambig: bool,
    target_by_content: bool,
) -> bool:
    if final_action == "ninguna":
        return False
    if base_confidence < conf_threshold:
        return True
    if det_action and laya_action and laya_action != "ninguna" and laya_action != det_action:
        return True
    if (
        det_type
        and laya_type
        and laya_type != "ninguno"
        and normalize_type(laya_type) != normalize_type(det_type)
    ):
        return True
    if by_content or num_ambig or target_by_content:
        return True
    return bool(final_action == "quitar" and base_confidence < 0.90)


def _build_concrete_target_ref(
    blocks: list[ResourceBlock],
    req: _ParsedRequest,
    final_type: str | None,
    final_ordinal: int | str | None,
) -> tuple[IntentBlockRef | None, str | None]:
    if req.content_match:
        target_ref = IntentBlockRef(
            id=req.content_match["block"].id,
            tipo=normalize_type(req.content_match["block"].tipo),
        )
        return target_ref, format_block_description(req.content_match["block"])
    if final_type:
        target_ref = IntentBlockRef(tipo=final_type, indice=final_ordinal)
        idx = find_target_block_index(blocks, target_ref)
        desc = format_block_description(blocks[idx]) if idx != -1 else None
        return target_ref, desc
    return None, None


class HybridIntentInterpreter(IntentInterpreterPort):
    def __init__(
        self,
        rules_interpreter: IntentInterpreterPort,
        laya_interpreter: IntentInterpreterPort,
        llm_interpreter: IntentInterpreterPort,
        scope_guard: ScopeGuardPort | None = None,
        confidence_threshold: float = 0.65,
        confirmation_threshold: float = 0.85,
        backend_tag: str = "hybrid",
    ):
        self._rules = rules_interpreter
        self._laya = laya_interpreter
        self._llm = llm_interpreter
        self._scope_guard = scope_guard
        self._confidence_threshold = confidence_threshold
        self._confirmation_threshold = float(
            os.getenv("CONFIRMATION_THRESHOLD", str(confirmation_threshold))
        )
        self._backend_tag = backend_tag

    def _apply_llm_fallback(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        options: dict[str, Any] | None,
        start_time: float,
    ) -> tuple[Intent, IntentTrace]:
        llm_intent, _ = self._llm.interpret(instruction, blocks, options)
        elapsed_ms = (time.time() - start_time) * 1000

        if llm_intent.accion in ("quitar", "mover") and llm_intent.bloque and llm_intent.bloque.tipo:
            t = normalize_type(llm_intent.bloque.tipo)
            if not any(normalize_type(b.tipo) == t for b in blocks):
                motivo = f"No hay ningún {t} en este recurso."
                return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo), IntentTrace(
                    backend=self._backend_tag, elapsed_ms=elapsed_ms, fallback_used=True
                )

        target_idx = find_target_block_index(blocks, llm_intent.bloque)
        desc = format_block_description(blocks[target_idx]) if target_idx != -1 else None
        res_intent = Intent(
            accion=llm_intent.accion,
            bloque=llm_intent.bloque,
            destino=llm_intent.destino,
            contenido=llm_intent.contenido,
            confianza=llm_intent.confianza,
            razon=f"Respaldo LLM: {llm_intent.razon}",
            requiere_confirmacion=True,
            bloque_descripcion=desc,
            referencia_resuelta_por_contenido=True,
        )
        return res_intent, IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms, fallback_used=True)

    def _combine_with_laya(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        req: _ParsedRequest,
        options: dict[str, Any] | None,
        start_time: float,
    ) -> tuple[Intent, IntentTrace]:
        laya_intent, _ = self._laya.interpret(instruction, blocks, options)
        laya_conf = laya_intent.confianza

        needs_llm = (
            laya_intent.accion == "ninguna" and req.det_action is not None and not req.det_type
        ) or (laya_conf < self._confidence_threshold and not req.det_action)

        if needs_llm:
            return self._apply_llm_fallback(instruction, blocks, options, start_time)

        final_action = req.det_action or laya_intent.accion
        raw_target_type = req.det_type or (laya_intent.bloque.tipo if laya_intent.bloque else None)
        final_type = normalize_type(raw_target_type) if raw_target_type else None
        final_ordinal = req.det_ordinal

        final_destino = None if final_action == "quitar" else (
            req.destino if (req.destino and req.destino.posicion) else laya_intent.destino
        )

        elapsed_ms = (time.time() - start_time) * 1000
        if final_action not in ("ninguna", "anadir") and not final_type:
            motivo = "No se identificó ningún tipo de bloque aplicable para la acción."
            return (
                Intent(accion="ninguna", confianza=0.9, motivo=motivo, razon=motivo),
                IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms, message=motivo),
            )

        if final_action in ("quitar", "mover") and final_type and not any(normalize_type(b.tipo) == final_type for b in blocks):
            motivo = f"No hay ningún {final_type} en este recurso."
            return (
                Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo),
                IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms, message=motivo),
            )

        base_conf = 0.95 if (req.det_action and req.det_type) else round(laya_conf, 2)
        laya_block_type = laya_intent.bloque.tipo if laya_intent.bloque else None
        req_confirm = _evaluate_confirmation(
            final_action, req.det_action, laya_intent.accion, req.det_type,
            laya_block_type, base_conf, self._confirmation_threshold,
            req.ref_by_content, req.num_ambig, req.content_match is not None,
        )

        target_ref, concrete_desc = _build_concrete_target_ref(blocks, req, final_type, final_ordinal)

        combined = Intent(
            accion=final_action,
            bloque=target_ref,
            destino=final_destino,
            contenido=None,
            confianza=base_conf,
            razon=f"Híbrido: Laya + Reglas (acción: {final_action}, tipo: {final_type or 'n/a'}, ordinal: {final_ordinal or 'n/a'})",
            requiere_confirmacion=req_confirm,
            bloque_descripcion=concrete_desc,
            referencia_resuelta_por_contenido=req.ref_by_content,
        )
        return combined, IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms)

    def interpret(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        options: dict[str, Any] | None = None,
    ) -> tuple[Intent, IntentTrace]:
        start_time = time.time()
        options = options or {}

        initial_guard = _check_initial_guardrails(instruction)
        if initial_guard:
            elapsed_ms = (time.time() - start_time) * 1000
            return initial_guard, IntentTrace(
                backend=self._backend_tag, elapsed_ms=elapsed_ms, message=initial_guard.motivo
            )

        req = _parse_deterministic_request(instruction, blocks)

        prelim_feas = _check_preliminary_feasibility(instruction, req, blocks)
        if prelim_feas:
            elapsed_ms = (time.time() - start_time) * 1000
            return prelim_feas, IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms, message=prelim_feas.motivo)

        if (not req.det_action or not req.det_type) and self._scope_guard:
            scope_res = self._scope_guard.check_scope(instruction, options)
            if not scope_res.allowed:
                if _has_edit_indications(instruction, req, blocks):
                    return self._apply_llm_fallback(instruction, blocks, options, start_time)
                elapsed_ms = (time.time() - start_time) * 1000
                intent = Intent(
                    accion="ninguna",
                    confianza=0.99,
                    motivo=OUT_OF_SCOPE_MESSAGE,
                    razon="Guard de alcance: la instrucción no es una edición de bloques.",
                    es_fuera_de_alcance=True,
                )
                return intent, IntentTrace(
                    backend=self._backend_tag, elapsed_ms=elapsed_ms, message=OUT_OF_SCOPE_MESSAGE
                )

        return self._combine_with_laya(instruction, blocks, req, options, start_time)
