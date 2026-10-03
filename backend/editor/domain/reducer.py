"""Reducer determinista puro para aplicar intenciones de edición sobre bloques."""

from __future__ import annotations

import time
from typing import Any

from editor.domain.model import (
    ApplyIntentResult,
    Intent,
    IntentBlockRef,
    IntentDestinoRef,
    ResourceBlock,
)
from editor.domain.normalization import (
    SEARCH_STOPWORDS,
    normalize_search_string,
    normalize_type,
    parse_ordinal_value,
)

DISPLAY_NAMES: dict[str, str] = {
    "header": "encabezado",
    "paragraph": "párrafo",
    "example": "ejemplo",
    "question": "pregunta",
    "summary": "resumen",
    "panel": "viñeta",
    "steps": "pasos",
    "objective": "objetivo",
    "card": "tarjeta",
    "reveal": "respuesta",
    "video": "video",
    "tabla": "tabla",
    "imagen": "imagen",
}

FEMININE_LABELS: frozenset[str] = frozenset({"pregunta", "viñeta", "tarjeta", "tabla", "imagen", "respuesta"})


def get_block_snippet(block: ResourceBlock) -> str:
    """Extrae un fragmento de texto representativo del bloque."""
    p = block.props
    if p.get("title") and isinstance(p["title"], str):
        return p["title"]
    if p.get("prompt") and isinstance(p["prompt"], str):
        return p["prompt"]
    if p.get("dialogue") and isinstance(p["dialogue"], str):
        return p["dialogue"]
    if p.get("text") and isinstance(p["text"], str):
        return p["text"][:50]
    if p.get("content") and isinstance(p["content"], str):
        return p["content"][:50]
    return block.id


def format_block_description(block: ResourceBlock, index_in_type: int | None = None) -> str:
    """Genera una descripción legible y contextual del bloque (ej: 'la pregunta 2: «¿Cuál es...?»')."""
    type_name = normalize_type(block.tipo)
    snippet = get_block_snippet(block)
    short_snippet = f"{snippet[:40]}…" if len(snippet) > 40 else snippet
    num = block.props.get("number") or index_in_type
    num_str = f" {num}" if num else ""
    label = DISPLAY_NAMES.get(type_name, type_name)
    article = "la" if label in FEMININE_LABELS else "el"
    return f"{article} {label}{num_str}: «{short_snippet}»"


def _score_content_tokens(combined_norm: str, content_tokens: list[str]) -> float:
    if not content_tokens:
        return 0.0
    if len(content_tokens) >= 2 and " ".join(content_tokens) in combined_norm:
        return 0.92

    matched_content = sum(1 for ct in content_tokens if ct in combined_norm)
    c_overlap = matched_content / len(content_tokens)

    for j in range(len(content_tokens) - 1):
        bigram = f"{content_tokens[j]} {content_tokens[j + 1]}"
        if bigram in combined_norm:
            return 0.85

    if matched_content == len(content_tokens) and len(content_tokens) >= 2:
        return 0.88
    if c_overlap >= 0.5:
        return c_overlap * 0.8
    return 0.0


def _compute_block_match_score(
    block: ResourceBlock,
    norm_query: str,
    query_words: list[str],
    content_tokens: list[str],
    preferred_type: str | None,
) -> float:
    props = block.props
    title_norm = normalize_search_string(str(props.get("title") or ""))
    prompt_norm = normalize_search_string(str(props.get("prompt") or ""))
    text_pieces = [
        block.id,
        title_norm,
        prompt_norm,
        normalize_search_string(str(props.get("dialogue") or "")),
        normalize_search_string(str(props.get("text") or "")),
        normalize_search_string(str(props.get("content") or "")),
        normalize_search_string(str(props.get("caption") or "")),
        normalize_search_string(str(props.get("character") or "")),
    ]
    combined_norm = " ".join(text_pieces)

    score = 0.0
    if title_norm and (title_norm in norm_query or norm_query in title_norm):
        score = 0.95
    elif prompt_norm and (prompt_norm in norm_query or norm_query in prompt_norm):
        score = 0.90
    elif norm_query in combined_norm:
        score = 0.80
    else:
        matched_tokens = sum(1 for w in query_words if w in combined_norm)
        overlap = matched_tokens / len(query_words)
        if overlap >= 0.5:
            score = overlap * 0.75

        content_score = _score_content_tokens(combined_norm, content_tokens)
        score = max(score, content_score)

    if preferred_type and normalize_type(block.tipo) == normalize_type(preferred_type) and score > 0:
        score += 0.05
    return score


def find_block_by_content_or_title(
    blocks: list[ResourceBlock],
    query: str,
    preferred_type: str | None = None,
) -> dict[str, Any] | None:
    """Busca un bloque en el recurso comparando frases, bigramas y contenido semántico."""
    norm_query = normalize_search_string(query)
    if len(norm_query) < 3:
        return None
    query_words = [w for w in norm_query.split() if w]
    if not query_words:
        return None

    content_tokens = [w for w in query_words if w not in SEARCH_STOPWORDS]
    best_match: dict[str, Any] | None = None
    matches_count = 0

    for i, b in enumerate(blocks):
        score = _compute_block_match_score(b, norm_query, query_words, content_tokens, preferred_type)
        if score >= 0.55:
            if best_match is None or score > best_match["score"]:
                best_match = {"block": b, "index": i, "score": score}
                matches_count = 1
            elif abs(score - best_match["score"]) < 0.05:
                matches_count += 1

    if matches_count > 1 and best_match and best_match["score"] < 0.90:
        return None
    return best_match


def map_type_to_tag(type_name: str) -> str:
    """Mapea el nombre del componente al tag HTML de UPAO."""
    norm = normalize_type(type_name)
    tags = {
        "paragraph": "p",
        "header": "upao-header",
        "example": "upao-example",
        "question": "upao-question",
        "summary": "upao-summary",
        "panel": "upao-comic-panel",
        "steps": "upao-steps",
        "objective": "upao-objective",
        "reveal": "upao-reveal",
        "card": "upao-card",
    }
    return tags.get(norm, norm if norm.startswith("upao-") else f"upao-{norm}")


def _resolve_numeric_ordinal(
    blocks: list[ResourceBlock],
    matching_indices: list[int],
    num: int,
) -> int:
    for idx in matching_indices:
        b_num = blocks[idx].props.get("number")
        if b_num == num or str(b_num) == str(num):
            return idx

    for idx in matching_indices:
        digits = "".join(c for c in blocks[idx].id if c.isdigit())
        if digits and int(digits) == num:
            return idx

    if 1 <= num <= len(matching_indices):
        return matching_indices[num - 1]
    if num == 0 and matching_indices:
        return matching_indices[0]
    return -1


def _resolve_target_by_ordinal(
    blocks: list[ResourceBlock],
    matching_indices: list[int],
    parsed_ordinal: int | str | None,
) -> int:
    if parsed_ordinal == "ultimo":
        return matching_indices[-1]
    if parsed_ordinal == "penultimo":
        return matching_indices[-2] if len(matching_indices) >= 2 else matching_indices[0]
    if parsed_ordinal == "antepenultimo":
        return matching_indices[-3] if len(matching_indices) >= 3 else matching_indices[0]
    if isinstance(parsed_ordinal, int):
        return _resolve_numeric_ordinal(blocks, matching_indices, parsed_ordinal)
    return matching_indices[0]


def _resolve_direct_or_content_ref(
    blocks: list[ResourceBlock],
    ref: IntentBlockRef | IntentDestinoRef,
) -> int | None:
    if ref.id:
        for idx, b in enumerate(blocks):
            if b.id == ref.id:
                return idx
    if ref.descripcion:
        match = find_block_by_content_or_title(blocks, ref.descripcion)
        if match:
            return match["index"]
    target_type = normalize_type(ref.tipo)
    if not target_type and ref.tipo:
        match = find_block_by_content_or_title(blocks, ref.tipo)
        if match:
            return match["index"]
    return None


def _resolve_typeless_ordinal(blocks: list[ResourceBlock], ref_indice: Any) -> int:
    ord_val = parse_ordinal_value(ref_indice)
    if ord_val == "ultimo":
        return len(blocks) - 1
    if ord_val == "penultimo":
        return max(1, len(blocks) - 2)
    if ord_val == "antepenultimo":
        return max(1, len(blocks) - 3)
    if isinstance(ord_val, int) and 1 <= ord_val < len(blocks):
        return ord_val
    return -1


def find_target_block_index(
    blocks: list[ResourceBlock],
    ref: IntentBlockRef | IntentDestinoRef | None,
) -> int:
    """Encuentra el índice del bloque objetivo según id, contenido, tipo u ordinal."""
    if not ref:
        return -1

    direct_idx = _resolve_direct_or_content_ref(blocks, ref)
    if direct_idx is not None:
        return direct_idx

    target_type = normalize_type(ref.tipo)
    if not target_type:
        return _resolve_typeless_ordinal(blocks, ref.indice)

    matching_indices = [idx for idx, b in enumerate(blocks) if normalize_type(b.tipo) == target_type]
    if not matching_indices:
        title_match = find_block_by_content_or_title(blocks, ref.tipo or "")
        return title_match["index"] if title_match else -1

    parsed_ordinal = parse_ordinal_value(ref.indice)
    return _resolve_target_by_ordinal(blocks, matching_indices, parsed_ordinal)


def _apply_quitar(blocks: list[ResourceBlock], intent: Intent) -> ApplyIntentResult:
    if len(blocks) <= 1:
        return ApplyIntentResult(
            success=False,
            blocks=blocks,
            error="No se permite vaciar el recurso por completo (debe quedar al menos 1 bloque).",
        )
    if not intent.bloque:
        return ApplyIntentResult(success=False, blocks=blocks, error="No se especificó qué bloque quitar.")

    target_idx = find_target_block_index(blocks, intent.bloque)
    if target_idx == -1:
        desc = intent.bloque.id or f"{intent.bloque.tipo or 'bloque'} (índice: {intent.bloque.indice or 'no esp.'})"
        return ApplyIntentResult(success=False, blocks=blocks, error=f"No se encontró el bloque '{desc}' para quitar.")

    target_block = blocks[target_idx]
    if normalize_type(target_block.tipo) == "header" and normalize_type(intent.bloque.tipo) != "header":
        return ApplyIntentResult(
            success=False,
            blocks=blocks,
            error="El encabezado siempre queda primero y nunca se borra salvo petición explícita por su nombre.",
        )

    new_blocks = [b for i, b in enumerate(blocks) if i != target_idx]
    return ApplyIntentResult(
        success=True,
        blocks=new_blocks,
        affected_block_id=target_block.id,
        message=f"Bloque '{target_block.id}' ({target_block.tipo}) eliminado.",
    )


def _apply_mover(blocks: list[ResourceBlock], intent: Intent) -> ApplyIntentResult:
    if not intent.bloque:
        return ApplyIntentResult(success=False, blocks=blocks, error="No se especificó qué bloque mover.")

    target_idx = find_target_block_index(blocks, intent.bloque)
    if target_idx == -1:
        desc = intent.bloque.id or f"{intent.bloque.tipo or 'bloque'} (índice: {intent.bloque.indice or 'no esp.'})"
        return ApplyIntentResult(success=False, blocks=blocks, error=f"No se encontró el bloque '{desc}' para mover.")

    target_block = blocks[target_idx]
    if normalize_type(target_block.tipo) == "header" and normalize_type(intent.bloque.tipo) != "header":
        return ApplyIntentResult(
            success=False,
            blocks=blocks,
            error="El encabezado siempre queda primero y nunca se mueve salvo petición explícita por su nombre.",
        )

    remaining = [b for i, b in enumerate(blocks) if i != target_idx]
    pos = intent.destino.posicion if intent.destino else None

    if pos == "inicio":
        insert_idx = 1 if (remaining and normalize_type(remaining[0].tipo) == "header") else 0
    elif pos == "final":
        insert_idx = len(remaining)
    elif pos in ("antes", "despues"):
        ref = intent.destino.referencia if intent.destino else None
        if not ref:
            return ApplyIntentResult(success=False, blocks=blocks, error=f"Se indicó mover '{pos}' pero falta referencia.")
        ref_idx = find_target_block_index(remaining, ref)
        if ref_idx == -1:
            return ApplyIntentResult(success=False, blocks=blocks, error=f"No se encontró el bloque de referencia para mover '{pos}'.")
        insert_idx = ref_idx if pos == "antes" else ref_idx + 1
    else:
        insert_idx = 1 if (remaining and normalize_type(remaining[0].tipo) == "header") else 0

    new_blocks = remaining[:insert_idx] + [target_block] + remaining[insert_idx:]
    return ApplyIntentResult(
        success=True,
        blocks=new_blocks,
        affected_block_id=target_block.id,
        message=f"Bloque '{target_block.id}' movido a posición {insert_idx}.",
    )


def _apply_anadir(blocks: list[ResourceBlock], intent: Intent) -> ApplyIntentResult:
    raw_type = intent.bloque.tipo if intent.bloque and intent.bloque.tipo else "summary"
    norm_type = normalize_type(raw_type)
    tag = map_type_to_tag(norm_type)
    unique_suffix = hex(int(time.time() * 1000))[2:]
    new_id = f"{norm_type}_add_{unique_suffix}"

    if norm_type == "summary":
        props = {"title": "Resumen y Conclusiones", "text": intent.contenido or "Escribe aquí la síntesis del recurso..."}
    elif norm_type == "objective":
        props = {"label": "Objetivo de aprendizaje", "text": intent.contenido or "Escribe aquí el objetivo de aprendizaje..."}
    elif norm_type == "example":
        props = {"title": "Ejemplo Ilustrativo", "content": intent.contenido or "Descripción y desarrollo del ejemplo..."}
    elif norm_type == "question":
        q_count = sum(1 for b in blocks if normalize_type(b.tipo) == "question")
        props = {"number": q_count + 1, "prompt": intent.contenido or "¿Cuál es la respuesta correcta?", "choices": []}
    else:
        props = {"text": intent.contenido or f"Contenido de {norm_type}..."}

    new_block = ResourceBlock(id=new_id, tipo=tag, props=props)
    pos = intent.destino.posicion if intent.destino else None

    if pos == "inicio" or (norm_type == "objective" and not pos):
        insert_idx = 1 if (blocks and normalize_type(blocks[0].tipo) == "header") else 0
    elif pos == "final" or (norm_type == "summary" and not pos):
        insert_idx = len(blocks)
    elif pos in ("antes", "despues") and intent.destino and intent.destino.referencia:
        ref_idx = find_target_block_index(blocks, intent.destino.referencia)
        insert_idx = (ref_idx if pos == "antes" else ref_idx + 1) if ref_idx != -1 else len(blocks)
    else:
        insert_idx = len(blocks)

    new_blocks = blocks[:insert_idx] + [new_block] + blocks[insert_idx:]
    return ApplyIntentResult(
        success=True,
        blocks=new_blocks,
        affected_block_id=new_id,
        message=f"Bloque '{new_id}' ({tag}) añadido en posición {insert_idx}.",
    )


def _apply_reemplazar(blocks: list[ResourceBlock], intent: Intent) -> ApplyIntentResult:
    if not intent.bloque:
        return ApplyIntentResult(success=False, blocks=blocks, error="No se especificó qué bloque reemplazar.")
    target_idx = find_target_block_index(blocks, intent.bloque)
    if target_idx == -1:
        return ApplyIntentResult(success=False, blocks=blocks, error="No se encontró el bloque para reemplazar.")

    target = blocks[target_idx]
    props = dict(target.props)
    if intent.contenido:
        props["text"] = intent.contenido
        props["content"] = intent.contenido

    updated = ResourceBlock(id=target.id, tipo=target.tipo, props=props)
    new_blocks = list(blocks)
    new_blocks[target_idx] = updated
    return ApplyIntentResult(success=True, blocks=new_blocks, affected_block_id=target.id, message=f"Bloque '{target.id}' reemplazado.")


def apply_intent(blocks: list[ResourceBlock], intent: Intent) -> ApplyIntentResult:
    """Aplica una intención sobre la lista de bloques de manera determinista y pura."""
    current_blocks = list(blocks)

    if intent.accion == "ninguna":
        return ApplyIntentResult(
            success=True,
            blocks=current_blocks,
            affected_block_id=None,
            message=intent.razon or "Instrucción no aplicable o sin acción requerida.",
        )
    if intent.accion == "quitar":
        return _apply_quitar(current_blocks, intent)
    if intent.accion == "mover":
        return _apply_mover(current_blocks, intent)
    if intent.accion == "anadir":
        return _apply_anadir(current_blocks, intent)
    if intent.accion == "reemplazar":
        return _apply_reemplazar(current_blocks, intent)
    return ApplyIntentResult(success=False, blocks=current_blocks, error=f"Acción desconocida: '{intent.accion}'")
