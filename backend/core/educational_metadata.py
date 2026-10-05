"""Contrato común de metadatos educativos y licencias para OVA y paquetes."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class EducationalMetadata(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    license: License = "CC BY-SA 4.0"
    language: str = Field(default="es", pattern=r"^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$", max_length=35)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    educational_level: str = Field(default="", max_length=120)
    audience: str = Field(default="", max_length=255)
    typical_learning_time: str = Field(default="", pattern=r"^(|PT(\d+H(\d+M)?(\d+S)?|\d+M(\d+S)?|\d+S))$", max_length=40)
    author: str = Field(default="", max_length=255)
    description: str | None = None

    @field_validator("keywords")
    @classmethod
    def clean_keywords(cls, values: list[str]) -> list[str]:
        if any(not value.strip() or len(value.strip()) > 100 or "," in value for value in values):
            raise ValueError("Cada palabra clave debe tener entre 1 y 100 caracteres, sin comas.")
        return list(dict.fromkeys(value.strip() for value in values))

    @property
    def license_url(self) -> str:
        if self.license == "CC0 1.0":
            return "https://creativecommons.org/publicdomain/zero/1.0/"
        code = LICENSES[self.license][0]
        return f"https://creativecommons.org/licenses/{code}/4.0/" if code else ""

    @property
    def exe_license(self) -> str:
        return LICENSES[self.license][1]


def metadata_from_ova(ova) -> EducationalMetadata:
    """Acepta entidades de dominio u ORM; el autor vacío hereda el dueño."""
    values = {name: getattr(ova, name, None) for name in EducationalMetadata.model_fields}
    values = {name: value for name, value in values.items() if value is not None}
    if not values.get("author"):
        owner = getattr(ova, "owner", None)
        values["author"] = (
            getattr(owner, "display_name", None) or getattr(owner, "full_name", None)
            or getattr(owner, "email", None) or ""
        )
    return EducationalMetadata(**values)
