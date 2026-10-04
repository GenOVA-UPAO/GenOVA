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
from llm.images.sources.logos import LogoSource
from llm.images.sources.search import SearchSource
from llm.images.style_guide import guide_from_settings

logger = structlog.get_logger(__name__)

# Importación condicional de DiagramSource (rama paralela; no crear diagram.py)
try:
    from llm.images.sources.diagram import DiagramSource  # type: ignore
except ImportError:
    DiagramSource = None


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
        settings = self.image_settings
        if settings.get("enabled") is False:
            return None

        provider = settings.get("provider")
        if not provider or provider in ("none", ""):
            # Si no hay proveedor configurado ni servidor local, la generación no está disponible
            if not os.getenv("LOCAL_IMAGE_URL"):
                return None
            provider = "local"

        prompt = (request.consulta or request.descripcion or request.concept).strip()
        if not prompt:
            return None

        guide = guide_from_settings(settings, self.ova_key or request.concept)
        style = f"{guide.prefix}|{guide.suffix}|{self.character}"
        use_cache = image_cache.enabled() and not fake_media_enabled()

        ckey = image_cache.cache_key(prompt, style, f"{provider}:{settings.get('image_model') or ''}", request.width, request.height)
        if use_cache:
            cached = image_cache.get(ckey)
            if cached:
                return ImageResult(
                    data_uri=cached,
                    source="generada",
                    alt=request.descripcion or prompt,
                    credit=None,
                    meta={"cache_hit": True, "style": guide.key},
                )

        full_prompt = guide.apply(prompt, self.character)
        chain = settings.get("chain") or []
        api_key = settings.get("api_key")
        model = settings.get("image_model")

        uri: str | None = None
        if not chain:
            uri = get_image_data_uri(full_prompt, provider, api_key, model=model, seed=guide.seed)
        else:
            for entry in chain:
                if not isinstance(entry, dict):
                    continue
                p, m = entry.get("provider"), entry.get("model_id")
                if not p:
                    continue
                key = entry.get("api_key") or (api_key if p == provider else None)
                uri = get_image_data_uri(full_prompt, p, key, model=m, hf_fallback=False, seed=guide.seed)
                if uri:
                    break
            if not uri:
                uri = hf_last_resort(full_prompt)

        if not uri:
            return None

        compressed = compress_data_uri(uri) or uri
        if use_cache:
            image_cache.put(ckey, compressed)

        return ImageResult(
            data_uri=compressed,
            source="generada",
            alt=request.descripcion or prompt,
            credit=None,  # Imágenes generadas no llevan créditos de terceros
            meta={"provider": provider, "style": guide.key, "seed": guide.seed},
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
    ) -> None:
        self.logos_source = logos_source or LogoSource()
        self.search_source = search_source or SearchSource()
        self.diagram_source = diagram_source or (DiagramSource() if DiagramSource else None)
        self.generation_source = generation_source

    def route(
        self,
        request: ImageRequest,
        *,
        image_settings: dict[str, Any] | None = None,
        character: str = "",
        ova_key: str = "",
    ) -> ImageResult | None:
        """Determina la fuente óptima según la pista `tipo` y gestiona la cadena de respaldo."""
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
            # 1. Probar DiagramSource si está disponible y los datos son válidos
            if self.diagram_source and isinstance(request.diagrama, dict) and request.diagrama.get("nodos"):
                try:
                    result = self.diagram_source.fetch(request)
                    if result:
                        reason = "Diagrama vectorial SVG determinista generado desde datos estructurados"
                except Exception as exc:
                    logger.warning("diagram source error", error=str(exc)[:100])
                    history.append("diagrama:error")
            else:
                history.append("diagrama:unavailable_or_no_schema")

            # 2. Respaldo a búsqueda web libre si no hubo diagrama SVG
            if not result:
                result = self.search_source.fetch(request)
                if result:
                    reason = "Diagrama técnico obtenido mediante búsqueda web libre"
                else:
                    history.append("busqueda:not_found")

            # 3. Respaldo final a generación
            if not result:
                result = gen_source.fetch(request)
                if result:
                    reason = "Diagrama ilustrado mediante generación de IA (último recurso)"
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
