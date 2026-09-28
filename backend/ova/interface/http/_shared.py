from pydantic import BaseModel, Field

from ova.application.access import _is_admin as _is_admin


class BatchIdsRequest(BaseModel):
    ova_ids: list[str] = Field(min_length=1)


class UpdateOvaMetadataRequest(BaseModel):
    title: str
    description: str | None = None
