"""Intérprete determinista por reglas para el editor visual."""

from __future__ import annotations

import time
from typing import Any

from editor.application.ports import IntentInterpreterPort
from editor.domain import (
    Intent,
    IntentBlockRef,
    IntentTrace,
    ResourceBlock,
    check_add_type_supported,
    check_ambiguous_deictics,
    check_destination_reference_feasibility,
    check_non_existent_raw_types,
    check_target_feasibility,
    extract_deterministic_action,
    extract_deterministic_destination,
    extract_deterministic_ordinal,
    extract_deterministic_type,
    find_block_by_content_or_title,
    find_target_block_index,
    format_block_description,
    normalize_type,
    split_object_and_destination,
)


def _check_rules_preliminary(
    instruction: str,
    raw_type: str | None,
    action: str | None,
    target_type: str | None,
    blocks: list[ResourceBlock],
) -> Intent | None:
    deictic = check_ambiguous_deictics(instruction)
    if deictic:
        return deictic
    non_existent = check_non_existent_raw_types(raw_type, blocks)
    if non_existent:
        return non_existent
    return check_add_type_supported(action, target_type)


def _resolve_content_target(
    blocks: list[ResourceBlock],
    obj_text: str,
    target_type: str | None,
    ordinal: int | str | None,
) -> tuple[dict[str, Any] | None, int | str | None, str | None]:
    content_match = find_block_by_content_or_title(blocks, obj_text, target_type)
    if not content_match:
        return None, ordinal, target_type

    resolved_type = target_type or normalize_type(content_match["block"].tipo)
    resolved_ordinal = ordinal
    if isinstance(ordinal, int):
        target_blocks = [b for b in blocks if normalize_type(b.tipo) == resolved_type]
        has_block = 1 <= ordinal <= len(target_blocks)
        if not (has_block and target_blocks[ordinal - 1].id != content_match["block"].id):
            resolved_ordinal = None

    return content_match, resolved_ordinal, resolved_type


def _build_rules_target_ref(
    blocks: list[ResourceBlock],
    content_match: dict[str, Any] | None,
    target_type: str | None,
    ordinal: int | str | None,
) -> tuple[IntentBlockRef | None, str | None]:
    if content_match:
        ref = IntentBlockRef(
            id=content_match["block"].id,
            tipo=normalize_type(content_match["block"].tipo),
        )
        return ref, format_block_description(content_match["block"])
    if target_type:
        ref = IntentBlockRef(tipo=target_type, indice=ordinal)
        idx = find_target_block_index(blocks, ref)
        desc = format_block_description(blocks[idx]) if idx != -1 else None
        return ref, desc
    return None, None


class RulesIntentInterpreter(IntentInterpreterPort):
    def interpret(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        options: dict[str, Any] | None = None,
    ) -> tuple[Intent, IntentTrace]:
        start_time = time.time()

        obj_text, dest_text = split_object_and_destination(instruction)
        action = extract_deterministic_action(obj_text) or extract_deterministic_action(instruction)
        raw_type = extract_deterministic_type(obj_text) or extract_deterministic_type(instruction)
        target_type = normalize_type(raw_type) if raw_type else None
        ordinal = extract_deterministic_ordinal(obj_text)

        prelim = _check_rules_preliminary(instruction, raw_type, action, target_type, blocks)
        if prelim:
            elapsed_ms = (time.time() - start_time) * 1000
            return prelim, IntentTrace(backend="rules", elapsed_ms=elapsed_ms, message=prelim.motivo)

        destino, ref_by_content = extract_deterministic_destination(dest_text, blocks, target_type)
        if not action and target_type and destino and destino.posicion:
            action = "mover"

        content_match, ordinal, target_type = _resolve_content_target(blocks, obj_text, target_type, ordinal)
        target_by_content = content_match is not None

        target_feas = check_target_feasibility(action, target_type, ordinal, blocks, target_by_content)
        if target_feas:
            elapsed_ms = (time.time() - start_time) * 1000
            return target_feas, IntentTrace(backend="rules", elapsed_ms=elapsed_ms, message=target_feas.motivo)

        dest_feas = check_destination_reference_feasibility(destino, blocks, ref_by_content)
        if dest_feas:
            elapsed_ms = (time.time() - start_time) * 1000
            return dest_feas, IntentTrace(backend="rules", elapsed_ms=elapsed_ms, message=dest_feas.motivo)

        if not action or (action not in ("anadir", "ninguna") and not target_type and not target_by_content):
            elapsed_ms = (time.time() - start_time) * 1000
            motivo = "No se identificó ninguna acción o bloque aplicable."
            intent = Intent(accion="ninguna", confianza=0.5, motivo=motivo, razon="No se identificó por reglas.")
            return intent, IntentTrace(backend="rules", elapsed_ms=elapsed_ms, message=motivo)

        target_ref, concrete_desc = _build_rules_target_ref(blocks, content_match, target_type, ordinal)

        elapsed_ms = (time.time() - start_time) * 1000
        intent = Intent(
            accion=action,
            bloque=target_ref,
            destino=destino,
            contenido=None,
            confianza=0.95,
            razon=f"Reglas deterministas (accion: {action}, tipo: {target_type}, ordinal: {ordinal})",
            bloque_descripcion=concrete_desc,
            referencia_resuelta_por_contenido=ref_by_content,
        )
        return intent, IntentTrace(backend="rules", elapsed_ms=elapsed_ms)
