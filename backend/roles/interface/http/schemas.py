"""Schemas Pydantic del borde HTTP de roles (DTOs de request)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RoleCreateRequest(BaseModel):
    name: str = Field(..., max_length=64, min_length=1)
    description: str = Field(default="")
    permissions: list[str] = Field(default_factory=list)


class RoleUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=64)
    description: str | None = Field(None)
    permissions: list[str] | None = Field(None)
