"""Contrato común de metadatos educativos y licencias para OVA y paquetes.

Dataclass pura (sin pydantic): la usan `scorm.domain` y `ova.application`, que no
pueden depender de frameworks. El request HTTP valida delegando aquí.
"""

import re
from dataclasses import asdict, dataclass, field, fields
from typing import Literal

License = Literal[
    "CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0", "CC BY-NC-SA 4.0",
    "CC BY-ND 4.0", "CC BY-NC-ND 4.0", "CC0 1.0", "Todos los derechos reservados",
]
LICENSES = {
    "CC BY 4.0": ("by", "creative commons: attribution 4.0"),
    "CC BY-SA 4.0": ("by-sa", "creative commons: attribution - share alike 4.0"),
    "CC BY-NC 4.0": ("by-nc", "creative commons: attribution - non commercial 4.0"),
    "CC BY-NC-SA 4.0": ("by-nc-sa", "creative commons: attribution - non commercial - share alike 4.0"),
    "CC BY-ND 4.0": ("by-nd", "creative commons: attribution - non derived work 4.0"),
    "CC BY-NC-ND 4.0": ("by-nc-nd", "creative commons: attribution - non derived work - non commercial 4.0"),
    "CC0 1.0": ("", "creative commons: cc0 1.0"),
    "Todos los derechos reservados": ("", "propietary license"),
}

_LANGUAGE = re.compile(r"^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$")
_DURATION = re.compile(r"^(|PT(\d+H(\d+M)?(\d+S)?|\d+M(\d+S)?|\d+S))$")
_MAX_LENGTH = {"language": 35, "educational_level": 120, "audience": 255,
               "typical_learning_time": 40, "author": 255}


class InvalidEducationalMetadata(ValueError):
    """Licencia o metadatos educativos fuera del contrato."""


@dataclass(frozen=True, slots=True)
class EducationalMetadata:
    license: License = "CC BY-SA 4.0"
    language: str = "es"
    keywords: list[str] = field(default_factory=list)
    educational_level: str = ""
    audience: str = ""
    typical_learning_time: str = ""
    author: str = ""
    description: str | None = None

    def __post_init__(self) -> None:
        for name in ("language", "educational_level", "audience", "typical_learning_time", "author"):
            value = getattr(self, name)
            if not isinstance(value, str):
                raise InvalidEducationalMetadata(f"{name} debe ser texto.")
            object.__setattr__(self, name, value.strip())
            if len(getattr(self, name)) > _MAX_LENGTH[name]:
                raise InvalidEducationalMetadata(f"{name} supera {_MAX_LENGTH[name]} caracteres.")
        if isinstance(self.description, str):
            object.__setattr__(self, "description", self.description.strip())
        if self.license not in LICENSES:
            raise InvalidEducationalMetadata("Licencia no soportada.")
        if not _LANGUAGE.match(self.language):
            raise InvalidEducationalMetadata("Idioma no válido (BCP 47).")
        if not _DURATION.match(self.typical_learning_time):
            raise InvalidEducationalMetadata("Tiempo típico no válido (p. ej. PT30M).")
        keywords = self.keywords
        if not isinstance(keywords, (list, tuple)) or len(keywords) > 30:
            raise InvalidEducationalMetadata("Hasta 30 palabras clave.")
        if any(
            not isinstance(value, str) or not value.strip() or len(value.strip()) > 100 or "," in value
            for value in keywords
        ):
            raise InvalidEducationalMetadata("Cada palabra clave debe tener entre 1 y 100 caracteres, sin comas.")
        object.__setattr__(self, "keywords", list(dict.fromkeys(value.strip() for value in keywords)))

    @classmethod
    def from_values(cls, **values) -> "EducationalMetadata":
        """Como el constructor, pero los campos desconocidos también son un error de contrato."""
        unknown = set(values) - set(FIELDS)
        if unknown:
            raise InvalidEducationalMetadata(f"Campos no soportados: {', '.join(sorted(unknown))}.")
        return cls(**values)

    def as_dict(self, exclude: set[str] | frozenset[str] = frozenset()) -> dict:
        return {name: value for name, value in asdict(self).items() if name not in exclude}

    @property
    def license_url(self) -> str:
        if self.license == "CC0 1.0":
            return "https://creativecommons.org/publicdomain/zero/1.0/"
        code = LICENSES[self.license][0]
        return f"https://creativecommons.org/licenses/{code}/4.0/" if code else ""

    @property
    def exe_license(self) -> str:
        return LICENSES[self.license][1]


FIELDS = tuple(f.name for f in fields(EducationalMetadata))


def metadata_from_ova(ova) -> EducationalMetadata:
    """Acepta entidades de dominio u ORM; el autor vacío hereda el dueño."""
    values = {name: getattr(ova, name, None) for name in FIELDS}
    values = {name: value for name, value in values.items() if value is not None}
    if not values.get("author"):
        owner = getattr(ova, "owner", None)
        values["author"] = (
            getattr(owner, "display_name", None) or getattr(owner, "full_name", None)
            or getattr(owner, "email", None) or ""
        )
    return EducationalMetadata(**values)
