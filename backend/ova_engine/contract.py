"""Contrato de una plantilla de recurso del motor `ova_engine`.

Cada uno de los 50 recursos 5E es una `TemplateSpec`: el LLM solo produce el
TEXTO (un JSON validado contra `schema`) y `render` lo convierte en HTML de forma
determinista con los componentes UPAO. El diseño nunca depende del modelo: dos
OVAs del mismo tipo comparten estructura, accesibilidad y JS probado.

Las decisiones de estructura (cuántas viñetas, qué variante de layout, si lleva
imagen…) las toma el motor de decisión (`ova_engine.decision`) ANTES de pedir el
texto, y llegan a `prompt` y `render` como `params`.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Param:
    """Parámetro de estructura que decide el motor de decisión.

    `choices` (enumerado) o `min`/`max` (entero). `default` se usa si el motor
    no decide o su respuesta queda fuera de rango.
    """

    name: str
    default: Any
    choices: tuple | None = None
    min: int | None = None
    max: int | None = None
    help: str = ""

    def coerce(self, value: Any) -> Any:
        if self.choices is not None:
            return value if value in self.choices else self.default
        if self.min is not None or self.max is not None:
            try:
                n = int(value)
            except (TypeError, ValueError):
                return self.default
            lo = self.min if self.min is not None else n
            hi = self.max if self.max is not None else n
            return max(lo, min(hi, n))
        return value if value is not None else self.default


@dataclass(frozen=True)
class RenderContext:
    concept: str
    phase: str
    rt: int
    title: str  # nombre del tipo de recurso (RECURSOS_META.tipo)
    params: dict


@dataclass(frozen=True)
class TemplateSpec:
    phase: str
    rt: int
    title: str
    # Parámetros de estructura que decide el motor de decisión.
    params: tuple[Param, ...]
    # JSON Schema del texto que debe producir el LLM (dado `params`).
    schema: Callable[[dict], dict]
    # Prompt de SOLO texto (concepto, contexto RAG ya formateado, params).
    prompt: Callable[[str, str, dict], str]
    # data (validado) + contexto -> HTML del <body> (sin runtime).
    render: Callable[[dict, RenderContext], str]
    # Ejemplo de datos válido: tests, modo fake y fallback si el LLM falla.
    sample: Callable[[str, dict], dict]
    # Si el recurso admite imágenes generadas: los elementos con clave
    # `prompt_imagen` reciben `image_placeholder` ("__IMG_N__") y `render` lo usa
    # como src; sin imagen, `render` dibuja su alternativa (SVG/emoji).
    uses_images: bool = False
    # Personaje recurrente (clave de `llm.images.style_guide.CHARACTERS`): su descripción fija
    # se antepone a TODOS los `prompt_imagen` del recurso para que no cambie de viñeta a viñeta.
    image_character: str = ""

    @property
    def key(self) -> str:
        return f"{self.phase}:{self.rt}"

    def resolve_params(self, decided: dict | None) -> dict:
        decided = decided or {}
        return {p.name: p.coerce(decided.get(p.name, p.default)) for p in self.params}
