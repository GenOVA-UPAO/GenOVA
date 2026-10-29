"""Optional OpenRouter diagram JSON generation, with an Ollama fallback."""

from __future__ import annotations

import json
import math
import os
import re
import time
from typing import Any

import httpx
import structlog

from llm.images.sources.contract import DIAGRAM_SCHEMA
from llm.images.sources.diagram import _matches

logger = structlog.get_logger(__name__)


def _diagram_timeout() -> float:
    try:
        value = float(os.getenv("OVA_DIAGRAM_TIMEOUT", "60"))
        if math.isfinite(value) and value > 0:
            return value
    except ValueError:
        pass  # valor no numérico en la variable: se usa el tiempo por defecto
    return 60.0


def _diagram_attempts() -> int:
    try:
        return max(1, int(os.getenv("OVA_DIAGRAM_RETRIES", "2")))
    except ValueError:
        return 2


def generate_diagram_json(
    prompt: str, *, model: str | None = None, timeout: float | None = None
) -> tuple[str, str]:
    """Return raw JSON and the actual model; SVG rendering remains offline.

    A model containing '/' is an OpenRouter ID. A bare name is an Ollama ID.
    Invalid credentials, HTTP errors and invalid structured output fall back locally.
    """
    call_timeout = min(_diagram_timeout(), timeout) if timeout is not None else _diagram_timeout()
    deadline = time.monotonic() + call_timeout

    def remaining_timeout() -> float:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise httpx.ReadTimeout("Presupuesto de tiempo del diagrama agotado")
        return min(call_timeout, remaining)

    selected = model or os.getenv("OVA_DIAGRAM_MODEL", "")
    key = os.getenv("OPENROUTER_API_KEY", "")
    if selected and "/" in selected and not key:
        try:
            from llm.clients.clients import _get_provider_key

            key = _get_provider_key("openrouter") or ""
        except Exception:
            key = ""  # Missing database/configuration must not disable the local fallback.
    if selected and "/" in selected and key:
        try:
            response = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": selected,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 3000,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "diagram",
                            "strict": True,
                            "schema": DIAGRAM_SCHEMA,
                        },
                    },
                },
                timeout=remaining_timeout(),
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"]
            if _matches(json.loads(raw), DIAGRAM_SCHEMA):
                return raw, selected
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            pass  # el modelo remoto falló o devolvió JSON inválido: se prueba el local
    local_model = (
        selected
        if selected and "/" not in selected
        else os.getenv("OVA_LOCAL_LLM_MODEL", "qwen3:8b")
    )
    response = httpx.post(
        os.getenv("OVA_LOCAL_LLM_URL", "http://localhost:11435").rstrip("/") + "/api/chat",
        json={
            "model": local_model,
            "messages": [{"role": "user", "content": prompt}],
            "format": DIAGRAM_SCHEMA,
            "stream": False,
            "think": False,
            "options": {"num_predict": 3000, "temperature": 0},
        },
        timeout=remaining_timeout(),  # remoto y fallback comparten el presupuesto de la llamada
    )
    response.raise_for_status()
    return response.json()["message"]["content"], local_model


_EXAMPLE = {
    "tipo": "flujo",
    "titulo": "Procesamiento",
    "nodos": [{"id": "a", "etiqueta": "Entrada"}, {"id": "b", "etiqueta": "Salida"}],
    "aristas": [{"origen": "a", "destino": "b", "etiqueta": "procesar"}],
}


def prompt_for(kind: str, concept: str, criteria: str) -> str:
    """Construye el prompt estructurado para la generación LLM de diagramas por tipo."""
    from copy import deepcopy

    example = deepcopy(_EXAMPLE)
    example["tipo"] = kind
    example["nodos"][0]["etiqueta"] = "Elemento Alfa"
    example["nodos"][1]["etiqueta"] = "Elemento Beta"
    example["aristas"][0]["etiqueta"] = "relación"
    example["nodos"][0]["atributos"] = ["Propiedad breve"]
    rules = {
        "er": (
            "Atributos SOLO nombres con marcas (PK)/(FK), sin explicaciones ni '(completo)'. "
            "PK en cada entidad. Cardinalidad 1:1, 1:N, N:1 o N:M relativa a origen→destino; "
            "la FK va en el lado N. No dupliques FK existentes aunque usen id_x, x_id, xId, idX o sufijos de rol. "
            "Entidad intermedia para N:M. Relaciones de roles distintos conservan sus etiquetas, incluso entre "
            "las mismas entidades. No emitas cardinalidades contradictorias ni entidades ajenas al concepto solicitado."
        ),
        "arbol": (
            "Solo nodos necesarios. Un padre por nodo. Hermanos y aristas en orden izquierda→derecha. "
            "En B-Tree etiqueta SOLO [claves,numéricas], sin atributos; respeta rangos y profundidad uniforme. "
            "En BST etiqueta SOLO número."
        ),
        "flujo": (
            "Solo etapas necesarias. Cada arista expresa la condición o acción que permite ir del origen al destino, "
            "no un resultado aún no obtenido. Decisiones con salidas sí/no o condiciones mutuamente excluyentes; "
            "bucles vuelven a evaluar la condición y tienen salida. Incluye todas las transiciones solicitadas, "
            "incluidas las de fallo en ciclos de estado. Recalcula en cada iteración."
        ),
        "capas": "Nodos ordenados arriba→abajo, grupo y atributos describen función de cada capa.",
        "secuencia": (
            "Nodos SOLO actores únicos por etiqueta; reutiliza el mismo ID para cada aparición del actor. "
            "Aristas SOLO mensajes, en orden temporal. No crear nodos de mensajes."
        ),
        "comparacion": (
            "EXACTAMENTE dos nodos. Atributos con formato 'Criterio: valor', mismos criterios neutrales y precisos "
            "en ambos nodos, máximo 5. Si el detalle pide criterios, usa exclusivamente esos criterios y no añadas otros. "
            "Omite cualquier criterio cuyo valor no sepas con certeza para ambas alternativas. "
            "Evita absolutos, dicotomías inventadas o juicios de superioridad."
        ),
    }
    if kind == "er":
        example["nodos"][0]["atributos"] = ["id (PK)"]
        example["nodos"][1]["atributos"] = ["id (PK)", "elemento_alfa_id (FK)"]
        example["aristas"][0]["cardinalidad"] = "1:N"
    elif kind == "flujo":
        example["titulo"] = "Ciclo abstracto"
        example["nodos"] = [
            {"id": "a", "etiqueta": "Inicio"},
            {"id": "b", "etiqueta": "¿Condición pendiente?"},
            {"id": "c", "etiqueta": "Acción abstracta"},
            {"id": "d", "etiqueta": "Fin"},
        ]
        example["aristas"] = [
            {"origen": "a", "destino": "b", "etiqueta": "evaluar"},
            {"origen": "b", "destino": "c", "etiqueta": "sí"},
            {"origen": "b", "destino": "d", "etiqueta": "no"},
            {"origen": "c", "destino": "b", "etiqueta": "reevaluar"},
        ]
    elif kind == "capas":
        example["nodos"][0]["grupo"] = "Capa A"
        example["nodos"][1]["grupo"] = "Capa B"
    elif kind == "comparacion":
        example["nodos"][0]["atributos"] = ["Propiedad: valor alfa"]
        example["nodos"][1]["atributos"] = ["Propiedad: valor beta"]
        example["aristas"] = []

    rule_text = rules.get(kind, rules["flujo"])
    if kind == "flujo" and re.search(
        r"\bestados?\b|ciclo de vida|transacci[oó]n", concept + " " + criteria, re.I
    ):
        rule_text += (
            " En flujos de estados conocidos, incluye todas las transiciones de error desde cada estado no final "
            "donde ese error sea posible, aunque el detalle no las enumere. Todo estado no final tiene salida. "
            "Los estados finales no tienen transiciones salientes, salvo que el detalle pida explícitamente "
            "reintentos; no inventes reintentos."
        )
    return (
        f"Diagrama en español de {concept}. tipo DEBE ser {kind}. {criteria} {rule_text} "
        "IDs únicos; referencias existentes. Etiquetas cortas (máx 24 caracteres); "
        "explicaciones en atributos separados, cortos y completos (máx 35 caracteres). "
        "No trunques frases. Solo JSON, sin HTML. "
        "No incluyas contadores ni derivados (Hijos: 2, grado, nivel, altura): los calcula el renderizador. "
        "Cardinalidad exclusivamente en ER, nunca en mensajes ni otros tipos. Titulo específico del concepto. "
        "El ejemplo siguiente SOLO ilustra estructura abstracta: no copies sus nodos ni propiedades al resultado. "
        + json.dumps(example, ensure_ascii=False)
    )


def infer_diagram_kind(text: str, template_key: str = "") -> str:
    """Infiere el tipo de diagrama más adecuado según la plantilla y el texto semántico."""
    from llm.images.sources.diagram_selection import classify_topic_traits

    kinds = classify_topic_traits(text, template_key=template_key)
    return kinds[0]


def generate_diagram_for_request(
    request: Any,
    diagram_source: Any = None,
    *,
    model: str | None = None,
) -> Any | None:
    """Genera el JSON de diagrama mediante LLM (segunda llamada) y lo renderiza con DiagramSource.

    Se invoca cuando el campo `imagen.diagrama` falta o es inválido en la primera llamada.
    """
    from llm.images.sources.contract import ImageRequest, ImageResult
    from llm.images.sources.diagram import (
        DiagramSource,
        diagram_rejection_reasons,
        prepare_diagram_for_render,
    )
    from llm.images.sources.diagram_selection import (
        classify_topic_traits,
        quality_rejection_reasons,
    )

    source = diagram_source or DiagramSource()
    expected_kinds = classify_topic_traits(
        request.concept,
        request.descripcion,
        getattr(request, "template_key", ""),
    )
    kind = expected_kinds[0]

    concept = request.concept or request.descripcion or "Concepto técnico"
    criteria = request.descripcion or request.consulta or concept

    base_prompt = prompt_for(kind, concept, criteria)
    prompt = base_prompt
    timeout = _diagram_timeout()
    deadline = time.monotonic() + 2 * timeout
    for attempt in range(1, _diagram_attempts() + 1):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        raw_json = ""
        stage = "render"
        reasons = []
        try:
            raw_json, actual_model = generate_diagram_json(
                prompt, model=model, timeout=min(timeout, remaining)
            )
            stage = "schema"
            try:
                parsed = json.loads(raw_json)
            except (ValueError, TypeError):
                reasons = ["JSON inválido; devuelve solo un objeto JSON sin Markdown ni texto adicional"]
            else:
                reasons = diagram_rejection_reasons(parsed)
                if not reasons:
                    stage = "calidad"
                    reasons = quality_rejection_reasons(
                        parsed, request.concept, request.descripcion,
                        getattr(request, "template_key", ""),
                    )
                if not reasons:
                    req_updated = ImageRequest(
                        tipo="diagrama",
                        descripcion=request.descripcion or concept,
                        consulta=request.consulta or "",
                        marca=request.marca or "",
                        diagrama=parsed,
                        concept=request.concept,
                        template_key=getattr(request, "template_key", ""),
                        width=getattr(request, "width", 768),
                        height=getattr(request, "height", 512),
                    )
                    _, stage, reasons = prepare_diagram_for_render(req_updated)
                    if not reasons:
                        stage = "render"
                        res = source.fetch(req_updated)
                        if res:
                            meta = dict(res.meta)
                            meta.update({
                                "generated_diagram": True,
                                "diagram_model": actual_model,
                                "inferred_kind": kind,
                                "diagram_attempts": attempt,
                            })
                            logger.info("diagram_generated", attempt=attempt, attempts=attempt, diagram_type=kind)
                            return ImageResult(
                                data_uri=res.data_uri, source="diagrama", alt=res.alt,
                                credit=res.credit, meta=meta,
                            )
                        reasons = ["No se pudo renderizar el diagrama; simplifica sus nodos y relaciones"]
        except Exception as exc:
            # No incluir mensajes de excepción: pueden contener la respuesta del proveedor.
            reasons = [f"No se pudo generar o renderizar el diagrama ({type(exc).__name__}); vuelve a intentarlo"]
        logger.warning(
            "diagram_rejected", attempt=attempt, diagram_type=kind, stage=stage, reasons=reasons,
        )
        rejected = raw_json[:4000] if isinstance(raw_json, str) else ""
        if isinstance(raw_json, str) and len(raw_json) > 4000:
            rejected += "\n[JSON recortado]"
        prompt = (
            base_prompt + "\nCorrige el intento anterior según estos motivos de rechazo:\n- "
            + "\n- ".join(reasons)
            + "\nJSON rechazado (solo como referencia para corregirlo):\n" + rejected
            + "\nDevuelve el diagrama completo corregido, solo JSON."
        )
    return None
