"""Entidades y value objects puros del dominio del editor visual."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class ResourceBlock:
    id: str
    tipo: str
    props: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tipo": self.tipo,
            "props": dict(self.props),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ResourceBlock:
        return cls(
            id=str(data.get("id", "")),
            tipo=str(data.get("tipo", "")),
            props=dict(data.get("props") or {}),
        )


@dataclass(frozen=True, slots=True)
class IntentBlockRef:
    tipo: str | None = None
    indice: int | str | None = None
    id: str | None = None
    descripcion: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        if self.tipo is not None:
            d["tipo"] = self.tipo
        if self.indice is not None:
            d["indice"] = self.indice
        if self.id is not None:
            d["id"] = self.id
        if self.descripcion is not None:
            d["descripcion"] = self.descripcion
        return d


@dataclass(frozen=True, slots=True)
class IntentDestinoRef:
    tipo: str | None = None
    indice: int | str | None = None
    id: str | None = None
    descripcion: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        if self.tipo is not None:
            d["tipo"] = self.tipo
        if self.indice is not None:
            d["indice"] = self.indice
        if self.id is not None:
            d["id"] = self.id
        if self.descripcion is not None:
            d["descripcion"] = self.descripcion
        return d


@dataclass(frozen=True, slots=True)
class IntentDestino:
    posicion: str | None = None  # "inicio", "final", "antes", "despues"
    referencia: IntentDestinoRef | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        if self.posicion is not None:
            d["posicion"] = self.posicion
        if self.referencia is not None:
            d["referencia"] = self.referencia.to_dict()
        return d


@dataclass(frozen=True, slots=True)
class Intent:
    accion: str  # "quitar", "mover", "anadir", "reemplazar", "ninguna"
    bloque: IntentBlockRef | None = None
    destino: IntentDestino | None = None
    contenido: str | None = None
    confianza: float = 1.0
    razon: str = ""
    requiere_confirmacion: bool = False
    motivo: str = ""
    es_fuera_de_alcance: bool = False
    bloque_descripcion: str | None = None
    referencia_resuelta_por_contenido: bool = False
    post_verificacion_score: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "accion": self.accion,
            "bloque": self.bloque.to_dict() if self.bloque else None,
            "destino": self.destino.to_dict() if self.destino else None,
            "contenido": self.contenido,
            "confianza": self.confianza,
            "razon": self.razon,
            "requiere_confirmacion": self.requiere_confirmacion,
            "motivo": self.motivo,
            "es_fuera_de_alcance": self.es_fuera_de_alcance,
            "bloque_descripcion": self.bloque_descripcion,
            "referencia_resuelta_por_contenido": self.referencia_resuelta_por_contenido,
            "post_verificacion_score": self.post_verificacion_score,
        }


@dataclass(frozen=True, slots=True)
class IntentTrace:
    backend: str
    elapsed_ms: float
    steps_count: int = 1
    raw_response: Any = None
    fallback_used: bool = False
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "backend": self.backend,
            "elapsedMs": self.elapsed_ms,
            "stepsCount": self.steps_count,
            "fallbackUsed": self.fallback_used,
            "message": self.message,
        }


@dataclass(frozen=True, slots=True)
class EditResult:
    intent: Intent
    blocks: list[ResourceBlock]
    trace: IntentTrace


@dataclass(frozen=True, slots=True)
class ApplyIntentResult:
    success: bool
    blocks: list[ResourceBlock]
    affected_block_id: str | None = None
    error: str | None = None
    message: str | None = None


@dataclass(frozen=True, slots=True)
class GuardCheckResult:
    allowed: bool
    reason: str | None = None
    motivo: str | None = None
    cleaned_text: str = ""
