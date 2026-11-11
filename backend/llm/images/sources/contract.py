"""Contrato compartido de las fuentes de imagen del OVA.

Cada hueco de imagen de una plantilla lleva en su JSON un objeto ``imagen`` que
rellena el LLM de texto (salida restringida por ``IMAGE_REQUEST_SCHEMA``). Un
decisor (``sources.router``) elige de dónde sale la imagen final:

- ``personaje``: cómic con mascota (Max) → biblioteca fija + fondo generado.
- ``logo``: producto o marca conocida (PostgreSQL, Oracle…) → logo libre (SVG).
- ``diagrama``: concepto técnico con estructura → SVG determinista desde ``diagrama``.
- ``foto``: cosa del mundo real → búsqueda en bancos con licencia libre.
- ``escena``: ilustración sin equivalente real → generación (último recurso).

``tipo`` es solo una pista del LLM: el decisor la valida y cae a la siguiente
fuente si la elegida no da resultado. Toda imagen de terceros lleva ``Credit``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

ImageKind = Literal["personaje", "logo", "diagrama", "foto", "escena"]
DiagramKind = Literal["er", "arbol", "flujo", "capas", "secuencia", "comparacion"]

# Estructura genérica de diagrama: nodos + aristas; cada `tipo` la dibuja a su manera
# (er: entidades con atributos y cardinalidades; arbol: jerarquía; capas: grupos apilados…).
DIAGRAM_SCHEMA: dict = {
    "type": "object",
    "required": ["tipo", "nodos"],
    "additionalProperties": False,
    "properties": {
        "tipo": {"enum": ["er", "arbol", "flujo", "capas", "secuencia", "comparacion"]},
        "titulo": {"type": "string", "maxLength": 80},
        "nodos": {
            "type": "array",
            "minItems": 1,
            "maxItems": 12,
            "items": {
                "type": "object",
                "required": ["id", "etiqueta"],
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string", "maxLength": 24},
                    "etiqueta": {"type": "string", "maxLength": 40},
                    "grupo": {"type": "string", "maxLength": 30},
                    "atributos": {
                        "type": "array",
                        "maxItems": 8,
                        "items": {"type": "string", "maxLength": 40},
                    },
                },
            },
        },
        "aristas": {
            "type": "array",
            "maxItems": 16,
            "items": {
                "type": "object",
                "required": ["origen", "destino"],
                "additionalProperties": False,
                "properties": {
                    "origen": {"type": "string", "maxLength": 24},
                    "destino": {"type": "string", "maxLength": 24},
                    "etiqueta": {"type": "string", "maxLength": 30},
                    "cardinalidad": {"type": "string", "maxLength": 10},
                },
            },
        },
    },
}

IMAGE_REQUEST_SCHEMA: dict = {
    "type": "object",
    "required": ["tipo", "descripcion"],
    "additionalProperties": False,
    "properties": {
        "tipo": {"enum": ["personaje", "logo", "diagrama", "foto", "escena"]},
        # Texto alternativo en español (accesibilidad) y criterio para elegir candidatas.
        "descripcion": {"type": "string", "maxLength": 200},
        # Palabras clave en inglés para bancos de imágenes (foto) o prompt (escena).
        "consulta": {"type": "string", "maxLength": 100},
        "marca": {"type": "string", "maxLength": 40},
        "diagrama": DIAGRAM_SCHEMA,
    },
}


@dataclass(frozen=True, slots=True)
class ImageRequest:
    tipo: ImageKind
    descripcion: str
    consulta: str = ""
    marca: str = ""
    diagrama: dict | None = None
    concept: str = ""  # tema del OVA (contexto para buscar/elegir)
    template_key: str = ""  # plantilla pedagógica ("explain:08", etc.) para delimitar tipos admitidos
    width: int = 768
    height: int = 512
    used_hashes: tuple[str, ...] = ()
    original_consulta: str = ""
    consulta_replaced: bool = False
    replacement_reason: str = ""

    @classmethod
    def from_json(
        cls,
        data: dict,
        *,
        concept: str = "",
        template_key: str = "",
        used_hashes: tuple[str, ...] | set[str] | list[str] = (),
    ) -> ImageRequest:
        raw_consulta = str(data.get("consulta") or data.get("query") or "").strip()
        req = cls(
            tipo=data.get("tipo") or "escena",
            descripcion=str(data.get("descripcion") or "").strip(),
            consulta=raw_consulta,
            marca=str(data.get("marca") or data.get("brand") or "").strip(),
            diagrama=data.get("diagrama") or None,
            concept=concept,
            template_key=template_key or str(data.get("template_key") or "").strip(),
            used_hashes=tuple(used_hashes or data.get("used_hashes") or ()),
            original_consulta=raw_consulta,
        )
        # La consulta se valida/reconstruye en el decisor (router.resolve_image →
        # query_builder.sanitize_image_request); el contrato no depende de él.
        return req


@dataclass(frozen=True, slots=True)
class Credit:
    """Atribución obligatoria (CC BY / CC BY-SA) de una imagen de terceros."""

    title: str
    author: str
    license: str  # nombre corto: "CC BY-SA 4.0", "CC0", "Public domain", "MIT"…
    license_url: str
    source_url: str
    provider: str  # "wikimedia" | "openverse" | "pexels" | "unsplash" | "simple-icons"…


# Textos de relleno: nunca son un autor, una licencia ni una URL de origen reales. Única
# lista para la búsqueda (descarta candidatas) y el render del OVA (no muestra la foto).
GENERIC_CREDIT_VALUES: frozenset[str] = frozenset({
    "autor", "author", "licencia libre", "free license", "licencia", "license", "web", "cache",
    "fuente libre", "licencia libre verificada", "comunidad libre", "desconocido", "desconocida",
    "unknown", "anonimo", "anónimo", "anonymous", "colaborador de wikimedia", "autor openverse",
    "internet", "google", "cc", "creative commons", "n/a", "none", "null", "undefined", "#",
    "imagen", "image",
})
# Plataformas de donde sale la imagen: son un proveedor legítimo, pero nunca su autor.
CREDIT_PROVIDER_NAMES: frozenset[str] = frozenset({
    "wikimedia", "wikimedia commons", "wikipedia", "openverse", "flickr", "pexels", "unsplash",
})


def is_generic_credit_value(val: Any) -> bool:
    """Verifica si un campo de crédito es nulo, vacío o un texto de relleno inventado."""
    if not val or not isinstance(val, str):
        return True
    clean = val.strip().lower()
    return not clean or clean in GENERIC_CREDIT_VALUES


def is_generic_attribution(val: Any) -> bool:
    """Como ``is_generic_credit_value`` y además rechaza el nombre de la plataforma:
    «Wikimedia» u «Openverse» no son ni el autor ni la licencia de la obra."""
    return is_generic_credit_value(val) or val.strip().lower() in CREDIT_PROVIDER_NAMES


def credit_field(credit: Any, *names: str) -> str:
    """Primer campo no vacío del crédito (``Credit`` o dict), sin espacios."""
    for name in names:
        val = credit.get(name) if isinstance(credit, dict) else getattr(credit, name, None)
        if val:
            return str(val).strip()
    return ""


def is_http_url(url: str) -> bool:
    return url.startswith(("http://", "https://"))


def is_valid_third_party_credit(credit: Any) -> bool:
    """Valida si un crédito de terceros tiene autor, licencia y URL de origen legítimos (no genéricos)."""
    if not credit:
        return False
    src_url = credit_field(credit, "source_url", "url")
    return (
        not is_generic_attribution(credit_field(credit, "author"))
        and not is_generic_attribution(credit_field(credit, "license"))
        and not is_generic_credit_value(src_url)
        and is_http_url(src_url)
    )


@dataclass(frozen=True, slots=True)
class ImageResult:
    data_uri: str  # siempre embebida (el SCORM funciona sin internet)
    source: Literal["personaje", "logo", "diagrama", "busqueda", "generada"]
    alt: str
    credit: Credit | None = None
    meta: dict = field(default_factory=dict)  # candidatas evaluadas, puntuación, caché…


class ImageSource(Protocol):
    """Una fuente devuelve None si no puede servir la petición (el decisor prueba la siguiente)."""

    name: str

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        """Devuelve la imagen para `request`, o None si esta fuente no puede servirla."""
