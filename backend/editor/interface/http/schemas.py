"""Esquemas Pydantic para los adaptadores HTTP del editor visual."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ResourceBlockSchema(BaseModel):
    id: str
    tipo: str
    props: dict[str, Any] = Field(default_factory=dict)


class InterpretOptions(BaseModel):
    """Opciones que el cliente puede fijar. Sin URLs: el servidor solo llama a
    los endpoints de su propia configuración (evita SSRF vía `laya_url`)."""

    model_config = ConfigDict(extra="forbid")

    enable_post_verification: bool | None = None
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    use_router: bool | None = None


class InterpretRequest(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=500)
    blocks: list[ResourceBlockSchema] = Field(default_factory=list)
    backend: str | None = None
    options: InterpretOptions = Field(default_factory=InterpretOptions)


class ConfirmRequest(BaseModel):
    instruction: str = Field(default="Edición en editor visual")
    blocks: list[ResourceBlockSchema] = Field(..., min_length=1)


class FeedbackRequest(BaseModel):
    fase_id: str | None = None
    instruccion: str | None = None
    bloques_antes: list[dict[str, Any]] = Field(default_factory=list)
    intencion_propuesta: dict[str, Any] | None = None
    intencion_final: dict[str, Any] | None = None
    resultado: str
    confianza: float | None = None
    backend: str | None = None
    motivo_rechazo: str | None = None
