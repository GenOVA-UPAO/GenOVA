"""Puertos (interfaces abstractas) para la capa de aplicación del editor visual."""

from __future__ import annotations

from typing import Any, Protocol

from editor.domain.model import (
    GuardCheckResult,
    Intent,
    IntentTrace,
    ResourceBlock,
)


class IntentInterpreterPort(Protocol):
    """Puerto para intérpretes de intención (rules, laya, llm, hybrid)."""

    def interpret(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        options: dict[str, Any] | None = None,
    ) -> tuple[Intent, IntentTrace]:
        raise NotImplementedError


class ScopeGuardPort(Protocol):
    """Puerto para verificación de alcance con modelos System One."""

    def check_scope(
        self,
        instruction: str,
        options: dict[str, Any] | None = None,
    ) -> GuardCheckResult:
        raise NotImplementedError


class PostVerifierPort(Protocol):
    """Puerto para verificación post-aplicación con modelos System One."""

    def verify(
        self,
        instruction: str,
        before_blocks: list[ResourceBlock],
        after_blocks: list[ResourceBlock],
        intent: Intent,
        options: dict[str, Any] | None = None,
    ) -> tuple[bool, float, str | None]:
        raise NotImplementedError


class EditorFeedbackRepositoryPort(Protocol):
    """Puerto para persistencia de telemetría de feedback docente."""

    def save_feedback(self, data: dict[str, Any]) -> str:
        raise NotImplementedError


class EditorPhaseRepositoryPort(Protocol):
    """Puerto para acceso y persistencia de contenido y versiones de fases."""

    def can_edit(self, ova_id: str, actor_id: str, is_admin: bool) -> bool:
        raise NotImplementedError

    def get_ova_owner(self, ova_id: str) -> str | None:
        raise NotImplementedError

    def phase_exists(self, ova_id: str, phase_id: str) -> bool:
        raise NotImplementedError

    def get_phase_content(self, ova_id: str, phase_id: str) -> str | None:
        raise NotImplementedError

    def update_phase_and_create_version(
        self,
        ova_id: str,
        phase_id: str,
        html_content: str,
        instruction: str,
    ) -> dict[str, Any]:
        raise NotImplementedError
