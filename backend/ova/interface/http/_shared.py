from pydantic import BaseModel, Field

from core.educational_metadata import EducationalMetadata
from ova.application.access import _is_admin as _is_admin


class BatchIdsRequest(BaseModel):
    ova_ids: list[str] = Field(min_length=1)


class UpdateOvaMetadataRequest(EducationalMetadata):
    title: str
    description: str | None = Field(default=None, max_length=2000)
