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
from typing import Literal, Protocol

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

    @classmethod
    def from_json(
        cls,
        data: dict,
        *,
        concept: str = "",
        template_key: str = "",
        used_hashes: tuple[str, ...] | set[str] | list[str] = (),
    ) -> ImageRequest:
        return cls(
            tipo=data.get("tipo") or "escena",
            descripcion=str(data.get("descripcion") or "").strip(),
            consulta=str(data.get("consulta") or data.get("query") or "").strip(),
            marca=str(data.get("marca") or data.get("brand") or "").strip(),
            diagrama=data.get("diagrama") or None,
            concept=concept,
            template_key=template_key or str(data.get("template_key") or "").strip(),
            used_hashes=tuple(used_hashes or data.get("used_hashes") or ()),
        )


@dataclass(frozen=True, slots=True)
class Credit:
    """Atribución obligatoria (CC BY / CC BY-SA) de una imagen de terceros."""

    title: str
    author: str
    license: str  # nombre corto: "CC BY-SA 4.0", "CC0", "Public domain", "MIT"…
    license_url: str
    source_url: str
    provider: str  # "wikimedia" | "openverse" | "pexels" | "unsplash" | "simple-icons"…


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

    def fetch(self, request: ImageRequest) -> ImageResult | None: ...
