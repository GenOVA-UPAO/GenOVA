"""Decisor y enrutador de fuentes de imagen para el OVA (router.py).

Valida la pista `tipo` del LLM y prueba fuentes en orden con respaldo:
- personaje: generación actual con mascota (Max)
- logo: logos (estáticos) -> búsqueda web libre
- diagrama: DiagramSource (si existe y diagrama es válido) -> búsqueda web libre -> generación
- foto: búsqueda web libre -> generación
- escena: generación

Registra la fuente elegida y el motivo en logs estructurados y metadatos.
"""

from __future__ import annotations

import os
from typing import Any

import structlog

from llm.images import image_cache
from llm.images.image_compress import compress_data_uri
from llm.images.image_providers import get_image_data_uri, hf_last_resort
from llm.images.media_fake import fake_media_enabled
from llm.images.sources.contract import ImageKind, ImageRequest, ImageResult, ImageSource
from llm.images.sources.diagram import DiagramSource, valid_diagram
from llm.images.sources.diagram_generation import generate_diagram_for_request
from llm.images.sources.logos import LogoSource
from llm.images.sources.search import SearchSource
from llm.images.style_guide import guide_from_settings

logger = structlog.get_logger(__name__)


def _resolve_provider_and_key(settings: dict[str, Any]) -> tuple[str, str]:
    provider = settings.get("provider")
    api_key = settings.get("api_key")
    if provider and provider not in ("none", ""):
        return str(provider), str(api_key or "")

    if os.getenv("LOCAL_IMAGE_URL"):
        return "local", ""
    if os.getenv("OPENROUTER_API_KEY"):
        return "openrouter", os.getenv("OPENROUTER_API_KEY") or ""
    try:
        from llm.clients.clients import _get_provider_key

        k = _get_provider_key("openrouter")
        if k:
            return "openrouter", k
    except Exception:
        pass
    return "", ""


def _generate_image_uri(
    full_prompt: str,
    provider: str,
    api_key: str,
    model: str | None,
    seed: int,
    chain: list[dict],
) -> str | None:
    if not chain:
        return get_image_data_uri(full_prompt, provider, api_key, model=model, seed=seed)
    for entry in chain:
        if not isinstance(entry, dict):
            continue
        p, m = entry.get("provider"), entry.get("model_id")
        if not p:
            continue
        key = entry.get("api_key") or (api_key if p == provider else None)
        uri = get_image_data_uri(full_prompt, p, key, model=m, hf_fallback=False, seed=seed)
        if uri:
            return uri
    return hf_last_resort(full_prompt)


def _validate_and_retry_generation(
    full_prompt: str,
    base_seed: int,
    concept: str,
    subject: str,
    generate_fn: Any,
) -> tuple[str | None, int, float, dict[str, Any]]:
    """Genera imagen y valida con CLIP; reintenta una vez con otra semilla si falla."""
    from llm.images.clip_rerank import ClipReranker

    reranker = ClipReranker.get_instance()
    uri = generate_fn(base_seed)
    if not uri:
        return None, base_seed, 0.0, {}

    compressed = compress_data_uri(uri) or uri
    passed, reason, clip_score, diag = reranker.validate_generated_image(
        compressed, concept, subject
    )
    if passed:
        return compressed, base_seed, clip_score, diag

    # Reintento con otra semilla
    alt_seed = (base_seed + 99991) % (2**31)
    uri_retry = generate_fn(alt_seed)
    if not uri_retry:
        return None, base_seed, 0.0, diag

    compressed_retry = compress_data_uri(uri_retry) or uri_retry
    passed2, reason2, clip_score2, diag2 = reranker.validate_generated_image(
        compressed_retry, concept, subject
    )
    if passed2:
        return compressed_retry, alt_seed, clip_score2, diag2

    logger.info("generated image rejected twice by CLIP", concept=concept, reason=reason2)
    return None, base_seed, 0.0, diag2


class GenerationSource:
    """Fuente de generación de imágenes con IA (último recurso o escenas/personajes)."""

    name: str = "generada"

    def __init__(
        self,
        image_settings: dict[str, Any] | None = None,
        *,
        character: str = "",
        ova_key: str = "",
    ) -> None:
        self.image_settings = image_settings or {}
        self.character = character
        self.ova_key = ova_key

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        if self.image_settings.get("enabled") is False:
            return None

        provider, api_key = _resolve_provider_and_key(self.image_settings)
        if not provider:
            return None

        from llm.images.query_builder import build_concrete_scene_subject

        subject = build_concrete_scene_subject(request.concept, request.descripcion)
        guide = guide_from_settings(self.image_settings, self.ova_key or request.concept)
        style = f"{guide.prefix}|{guide.suffix}|{self.character}"
        use_cache = image_cache.enabled() and not fake_media_enabled()

        model = str(self.image_settings.get("image_model") or "")
        ckey = image_cache.cache_key(
            subject, style, f"{provider}:{model}", request.width, request.height
        )
        if use_cache:
            cached = image_cache.get(ckey)
            if cached:
                return ImageResult(
                    data_uri=cached,
                    source="generada",
                    alt=request.descripcion or subject,
                    credit=None,
                    meta={"cache_hit": True, "style": guide.key, "subject": subject},
                )

        full_prompt = guide.apply(subject, self.character)
        chain = self.image_settings.get("chain") or []

        def _gen(seed: int) -> str | None:
            return _generate_image_uri(full_prompt, provider, api_key, model, seed, chain)

        data_uri, seed_used, clip_score, diag = _validate_and_retry_generation(
            full_prompt, guide.seed, request.concept, subject, _gen
        )
        if not data_uri:
            return None

        if use_cache:
            image_cache.put(ckey, data_uri)

        return ImageResult(
            data_uri=data_uri,
            source="generada",
            alt=request.descripcion or subject,
            credit=None,
            meta={
                "provider": provider,
                "style": guide.key,
                "seed": seed_used,
                "clip_score": clip_score,
                "clip_diag": diag,
                "subject": subject,
            },
        )


# Tipos de imagen permitidos como figura principal según el objetivo pedagógico de la plantilla.
# Las plantillas de arquitectura y análisis técnico prohíben logotipos aislados como figura central.
TEMPLATE_ALLOWED_KINDS: dict[str, tuple[ImageKind, ...]] = {
    "explain:08": ("diagrama", "foto"),  # Diagrama de Framework: exige esquema de arquitectura, no logo
    "elaborate:01": ("foto", "diagrama"),  # Estudio de Caso: fotografía real de infraestructura o entorno
    "elaborate:03": ("diagrama", "foto"),  # Mini-Proyecto: arquitectura técnica o esquema del entregable
    "engage:05": ("foto", "escena"),  # Dilema Ético: imagen situacional/evocadora
    "engage:06": ("foto", "escena"),  # Noticia de Impacto: fotografía documental/noticiosa
    "explain:02": ("foto", "diagrama"),  # Lectura Guiada: figura técnica o diagrama
    "explore:05": ("foto", "diagrama"),  # Lectura Interactiva: imagen de contexto
    "explain:10": ("foto", "diagrama"),  # Infografía Interactiva: infografía o esquema amplio
    # Plantillas que admiten logotipos oficiales como identificador técnico:
    "explain:06": ("logo", "foto", "diagrama"),  # Glosario Visual
    "explain:09": ("logo", "diagrama", "foto"),  # Tabla Comparativa
}


class ImageRouter:
    """Enrutador inteligente de imágenes del OVA con fallbacks automáticos."""

    def __init__(
        self,
        *,
        logos_source: ImageSource | None = None,
        search_source: ImageSource | None = None,
        diagram_source: ImageSource | None = None,
        generation_source: ImageSource | None = None,
        diagram_generation_func: Any = None,
    ) -> None:
        self.logos_source = logos_source or LogoSource()
        self.search_source = search_source or SearchSource()
        self.diagram_source = diagram_source or DiagramSource()
        self.generation_source = generation_source
        self.diagram_generation_func = diagram_generation_func or generate_diagram_for_request

    def route(
        self,
        request: ImageRequest,
        *,
        image_settings: dict[str, Any] | None = None,
        character: str = "",
        ova_key: str = "",
    ) -> ImageResult | None:
        """Determina la fuente óptima según la pista `tipo` y gestiona la cadena de respaldo."""
        from llm.images.query_builder import sanitize_image_request

        request = sanitize_image_request(request)
        gen_source = self.generation_source or GenerationSource(
            image_settings, character=character, ova_key=ova_key or request.concept
        )

        kind: ImageKind = request.tipo
        if kind not in ("personaje", "logo", "diagrama", "foto", "escena"):
            kind = "foto" if (request.consulta or request.descripcion) else "escena"

        # Validación por plantilla/hueco: evitar logos como figura principal en plantillas explicativas
        template_key = request.template_key
        norm_key = template_key
        if template_key and ":" in template_key:
            phase, sep, num = template_key.partition(":")
            if num.isdigit():
                norm_key = f"{phase}:{int(num):02d}"
        allowed_kinds = TEMPLATE_ALLOWED_KINDS.get(template_key) or TEMPLATE_ALLOWED_KINDS.get(norm_key)
        if allowed_kinds and kind not in allowed_kinds:
            logger.info(
                "image kind redirected by template pedagogy policy",
                requested=kind,
                template=template_key,
                fallback=allowed_kinds[0],
            )
            kind = allowed_kinds[0]

        history: list[str] = []
        result: ImageResult | None = None
        reason: str = ""

        # --- CASO 1: PERSONAJE (cómic con Max) ---
        if kind == "personaje":
            result = gen_source.fetch(request)
            if result:
                reason = "Generación de imagen con personaje/estilo fijado (Max)"
            else:
                history.append("generada:failed")

        # --- CASO 2: LOGO ---
        elif kind == "logo":
            # 1. Probar biblioteca de logos estáticos
            result = self.logos_source.fetch(request)
            if result:
                reason = f"Logotipo oficial resuelto desde biblioteca estática ({result.meta.get('slug')})"
            else:
                history.append("logos:not_found")
                # 2. Respaldo a búsqueda web
                result = self.search_source.fetch(request)
                if result:
                    reason = "Logotipo no encontrado en biblioteca; resuelto mediante búsqueda web libre"
                else:
                    history.append("busqueda:not_found")

        # --- CASO 3: DIAGRAMA ---
        elif kind == "diagrama":
            # 1. Probar DiagramSource si el objeto diagrama existe y supera validación estructural y léxica
            if self.diagram_source and isinstance(request.diagrama, dict) and valid_diagram(request.diagrama):
                from llm.images.sources.diagram_selection import validate_diagram_quality

                ok_qual, qual_reason = validate_diagram_quality(
                    request.diagrama,
                    request.concept,
                    request.descripcion,
                    request.template_key,
                )
                if ok_qual:
                    try:
                        result = self.diagram_source.fetch(request)
                        if result:
                            reason = "Diagrama vectorial SVG determinista generado desde datos estructurados"
                    except Exception as exc:
                        logger.warning("diagram source error", error=str(exc)[:100])
                        history.append("diagrama:error")
                else:
                    logger.info("diagram rejected by quality check", reason=qual_reason)
                    history.append(f"diagrama:rejected_{qual_reason}")
            else:
                history.append("diagrama:missing_or_invalid_schema")

            # 2. Si falta o es inválido, usar diagram_generation (segunda llamada LLM con su prompt por tipo)
            if not result and self.diagram_source:
                try:
                    result = self.diagram_generation_func(request, self.diagram_source)
                    if result:
                        reason = "Diagrama vectorial SVG generado mediante fallback de diagram_generation"
                except Exception as exc:
                    logger.warning("diagram generation fallback error", error=str(exc)[:100])
                    history.append("diagram_generation:error")
                if not result:
                    history.append("diagram_generation:failed")

            # 3. Respaldo final a generación de IA (SD / OpenRouter) — nunca diagramas de internet
            if not result:
                result = gen_source.fetch(request)
                if result:
                    reason = "Diagrama ilustrado mediante generación de IA (respaldo)"
                else:
                    history.append("generada:failed")

        # --- CASO 4: FOTO ---
        elif kind == "foto":
            # 1. Búsqueda web libre (Wikimedia / Openverse)
            result = self.search_source.fetch(request)
            if result:
                reason = f"Fotografía real con licencia libre ({result.credit.provider if result.credit else 'web'})"
            else:
                history.append("busqueda:not_found")
                # 2. Respaldo a generación
                result = gen_source.fetch(request)
                if result:
                    reason = "Fotografía no encontrada en bancos libres; generada con IA"
                else:
                    history.append("generada:failed")

        # --- CASO 5: ESCENA ---
        elif kind == "escena":
            # Generación directa
            result = gen_source.fetch(request)
            if result:
                reason = "Ilustración conceptual/escena generada por IA"
            else:
                history.append("generada:failed")

        # Adjuntar trazabilidad en metadatos del resultado
        if result:
            combined_meta = dict(result.meta)
            combined_meta.update({
                "requested_kind": kind,
                "chosen_source": result.source,
                "reason": reason,
                "fallback_history": history,
                "original_consulta": getattr(request, "original_consulta", "") or request.consulta,
                "final_consulta": request.consulta,
                "consulta_replaced": getattr(request, "consulta_replaced", False),
                "replacement_reason": getattr(request, "replacement_reason", ""),
            })
            result = ImageResult(
                data_uri=result.data_uri,
                source=result.source,
                alt=result.alt,
                credit=result.credit,
                meta=combined_meta,
            )

        logger.info(
            "image router resolved",
            kind=kind,
            chosen=result.source if result else "none",
            reason=reason or "Sin fuentes disponibles",
            fallbacks=history,
        )

        return result
