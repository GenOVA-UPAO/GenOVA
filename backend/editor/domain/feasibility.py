"""Comprobaciones de factibilidad previa sobre bloques de recursos."""

from __future__ import annotations

import re

from editor.domain.model import Intent, IntentDestino, ResourceBlock
from editor.domain.normalization import normalize_text, normalize_type
from editor.domain.reducer import DISPLAY_NAMES


def display_type_name(tipo: str) -> str:
    norm = normalize_type(tipo)
    return DISPLAY_NAMES.get(norm, norm)


def display_plural_type_name(tipo: str) -> str:
    norm = normalize_type(tipo)
    plurals = {
        "video": "videos",
        "example": "ejemplos",
        "question": "preguntas",
        "summary": "resúmenes",
        "panel": "viñetas",
        "paragraph": "párrafos",
        "header": "encabezados",
        "objective": "objetivos",
        "steps": "pasos",
        "card": "tarjetas",
        "tabla": "tablas",
        "imagen": "imágenes",
        "reveal": "respuestas",
    }
    return plurals.get(norm, f"{norm}s")


def check_ambiguous_deictics(instruction: str) -> Intent | None:
    """Detecta deícticos ambiguos sin objeto ('borra eso', 'muévelo', 'quítalo')."""
    norm = normalize_text(instruction)
    patterns = (
        r"^(?:borra|elimina|quita|saca)\s+(?:eso|esto|lo|la)$",
        r"^(?:mueve|pon|coloca|pasa)\s+(?:eso|esto|lo|la)$",
        r"^(?:muevelo|quitalo|borralo|sacalo|mueve\s+lo|quita\s+lo|borra\s+lo|saca\s+lo|"
        r"mueve\s+la|quita\s+la|borra\s+la|saca\s+la)$",
    )
    for p in patterns:
        if re.search(p, norm, re.IGNORECASE):
            motivo = "¿A qué bloque te refieres? Especifica el elemento que deseas modificar."
            return Intent(
                accion="ninguna",
                confianza=0.99,
                motivo=motivo,
                razon=motivo,
            )
    return None


def check_non_existent_raw_types(raw_type: str | None, blocks: list[ResourceBlock]) -> Intent | None:
    """Verifica si se pide un tipo que no existe en el catálogo (tabla, video, imagen)."""
    if raw_type in ("tabla", "video", "imagen"):
        exists = any(normalize_type(b.tipo) == raw_type for b in blocks)
        if not exists:
            motivo = f"No hay ningún {display_type_name(raw_type)} en este recurso."
            return Intent(
                accion="ninguna",
                confianza=0.99,
                motivo=motivo,
                razon=motivo,
            )
    return None


def check_add_type_supported(action: str | None, target_type: str | None) -> Intent | None:
    """En adición, solo se admite summary u objective."""
    if action == "anadir" and target_type and target_type not in ("summary", "objective"):
        motivo = "Solo se permite añadir bloques de resumen u objetivos en este recurso."
        return Intent(
            accion="ninguna",
            confianza=0.99,
            motivo=motivo,
            razon=motivo,
        )
    return None


def check_target_feasibility(
    action: str | None,
    target_type: str | None,
    ordinal: int | str | None,
    blocks: list[ResourceBlock],
    has_content_match: bool,
) -> Intent | None:
    """Valida existencia, rango ordinal y ausencia de ambigüedad para quitar y mover."""
    if action not in ("quitar", "mover") or not target_type or has_content_match:
        return None

    matching = [b for b in blocks if normalize_type(b.tipo) == target_type]
    if not matching:
        motivo = f"No hay ningún {display_type_name(target_type)} en este recurso."
        return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)

    if isinstance(ordinal, int) and ordinal > len(matching):
        motivo = f"No existe {display_type_name(target_type)} {ordinal} (solo hay {len(matching)})."
        return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)

    if len(matching) > 1 and ordinal is None and target_type != "summary":
        motivo = f"Hay {len(matching)} {display_plural_type_name(target_type)}: ¿cuál?"
        return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)

    return None


def check_destination_reference_feasibility(
    destino: IntentDestino | None,
    blocks: list[ResourceBlock],
    ref_by_content: bool,
) -> Intent | None:
    """Valida que el bloque de referencia en un destino relativo exista."""
    if not destino or not destino.referencia or not destino.referencia.tipo or ref_by_content:
        return None

    ref_type = normalize_type(destino.referencia.tipo)
    matching_refs = [b for b in blocks if normalize_type(b.tipo) == ref_type]
    if not matching_refs:
        motivo = f"No hay ningún {display_type_name(ref_type)} en este recurso para usar como referencia."
        return Intent(accion="ninguna", confianza=0.99, motivo=motivo, razon=motivo)
    return None
