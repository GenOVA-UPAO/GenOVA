"""Guía de estilo visual por OVA: todas sus imágenes comparten estilo, paleta y personaje.

Se define UNA vez (al crear el job, a partir del tema del OVA) y se aplica a todos los
`prompt_imagen` del OVA. Es determinista: la misma clave (prompt normalizado del OVA)
da siempre el mismo estilo y la misma semilla, de modo que regenerar un recurso no
cambia el look del resto. Sin I/O ni dependencias del resto de la app.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

# Paleta acorde al tema UPAO (azul #0A3D91, naranja de acento, papel cálido).
_PALETTE = (
    "limited palette of deep UPAO blue (#0A3D91), warm orange (#F58220) accents, "
    "navy ink outlines and a warm off-white background"
)
_NO_TEXT = (
    "no text, no letters, no captions, no watermark, no logo, "
    "no children, no childlike cartoon, no kids, no house, no residential cottage, "
    "no domestic buildings, no outdoor landscape"
)

# Variantes de ilustración: se elige una por OVA (por hash), nunca por imagen.
_STYLES = (
    "flat vector technical illustration, clean geometric shapes, subtle gradients, professional educational look",
    "isometric technical diagram illustration, modern clean geometry, crisp lines, professional educational look",
    "modern editorial technical illustration, bold outlines, balanced colors, subtle paper grain, engineering style",
)

# Personajes recurrentes por nombre (el cómic usa «Max»): descripción fija, idéntica en cada viñeta.
CHARACTERS: dict[str, str] = {
    "max": "Max, a small friendly round navy-blue robot with an orange antenna and big screen eyes",
}


@dataclass(frozen=True, slots=True)
class StyleGuide:
    key: str
    prefix: str
    suffix: str
    seed: int
    variant: int

    def apply(self, prompt: str, character: str = "") -> str:
        """Prompt final: estilo + (personaje) + escena + restricciones comunes."""
        scene = (prompt or "").strip().rstrip(".")
        parts = [self.prefix]
        if character:
            parts.append(character)
        parts.append(scene)
        parts.append(self.suffix)
        return ". ".join(p for p in parts if p)

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "prefix": self.prefix,
            "suffix": self.suffix,
            "seed": self.seed,
            "variant": self.variant,
        }

    @classmethod
    def from_dict(cls, data: dict) -> StyleGuide:
        return cls(
            key=str(data["key"]),
            prefix=str(data["prefix"]),
            suffix=str(data["suffix"]),
            seed=int(data["seed"]),
            variant=int(data.get("variant", 0)),
        )


def normalize_key(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def build_style_guide(ova_key: str) -> StyleGuide:
    """Estilo y semilla deterministas a partir de la clave del OVA (su prompt)."""
    key = normalize_key(ova_key)
    digest = hashlib.sha256(key.encode()).digest()
    variant = digest[0] % len(_STYLES)
    return StyleGuide(
        key=hashlib.sha256(key.encode()).hexdigest()[:12],
        prefix=f"{_STYLES[variant]}, {_PALETTE}",
        suffix=_NO_TEXT,
        seed=int.from_bytes(digest[1:5], "big") % (2**31),
        variant=variant,
    )


def guide_from_settings(image_settings: dict | None, fallback_key: str) -> StyleGuide:
    """La guía fijada al crear el job; si falta (jobs antiguos), se deriva igual del prompt."""
    raw = (image_settings or {}).get("style_guide")
    if isinstance(raw, dict):
        try:
            return StyleGuide.from_dict(raw)
        except (KeyError, TypeError, ValueError):
            pass
    return build_style_guide(fallback_key)
