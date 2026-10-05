from pydantic import BaseModel, ConfigDict, Field, model_validator

from core.educational_metadata import EducationalMetadata, InvalidEducationalMetadata, License
from ova.application.access import _is_admin as _is_admin


class BatchIdsRequest(BaseModel):
    ova_ids: list[str] = Field(min_length=1)


class UpdateOvaMetadataRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str
    description: str | None = Field(default=None, max_length=2000)
    license: License = "CC BY-SA 4.0"
    language: str = "es"
    keywords: list[str] = Field(default_factory=list)
    educational_level: str = ""
    audience: str = ""
    typical_learning_time: str = ""
    author: str = ""

    @model_validator(mode="after")
    def _metadata_contract(self) -> "UpdateOvaMetadataRequest":
        # La validación vive en core (dataclass pura); aquí solo se traduce a 422.
        try:
            EducationalMetadata(**self.model_dump(exclude={"title", "description"}))
        except InvalidEducationalMetadata as error:
            raise ValueError(str(error)) from error
        return self
