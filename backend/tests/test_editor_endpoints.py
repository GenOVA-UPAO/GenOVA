"""Tests para los endpoints HTTP del editor visual (401, 403, 404, 200)."""

from __future__ import annotations

import os
import uuid
from typing import Any

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

from fastapi.testclient import TestClient

from auth.dependencies import get_current_user
from editor.application.use_cases import (
    ConfirmAndApplyUseCase,
    InterpretAndApplyUseCase,
    RecordFeedbackUseCase,
)
from editor.container import EditorUseCases, build_editor
from editor.infrastructure.interpreters.rules import RulesIntentInterpreter
from main import app

client = TestClient(app)


class FakeUser:
    def __init__(self, user_id: str, is_admin: bool = False):
        self.id = uuid.UUID(user_id)
        self.admin_flag_cached = is_admin
        self.is_admin = is_admin


class FakePhaseRepo:
    def __init__(self, owner_id: str | None = None, phases: list[str] | None = None):
        self.owner_id = owner_id
        self.phases = phases or []
        self.version_created = False

    def get_ova_owner(self, ova_id: str) -> str | None:
        return self.owner_id

    def phase_exists(self, ova_id: str, phase_id: str) -> bool:
        return phase_id in self.phases

    def can_edit(self, ova_id: str, actor_id: str, is_admin: bool) -> bool:
        if is_admin:
            return True
        return self.owner_id == actor_id

    def get_phase_content(self, ova_id: str, phase_id: str) -> str | None:
        return "<p>Contenido</p>"

    def update_phase_and_create_version(
        self,
        ova_id: str,
        phase_id: str,
        html_content: str,
        instruction: str,
    ) -> dict[str, Any]:
        self.version_created = True
        return {
            "minor_number": 2,
            "phase_id": phase_id,
            "version_id": "v-active-123",
        }


class FakeFeedbackRepo:
    def __init__(self):
        self.saved: list[dict[str, Any]] = []

    def save_feedback(self, data: dict[str, Any]) -> str:
        self.saved.append(data)
        return "feedback-uuid-999"


def _build_test_editor(owner_id: str | None, phases: list[str] | None) -> EditorUseCases:
    phase_repo = FakePhaseRepo(owner_id=owner_id, phases=phases)
    feedback_repo = FakeFeedbackRepo()
    rules = RulesIntentInterpreter()

    return EditorUseCases(
        interpret_and_apply=InterpretAndApplyUseCase(
            interpreters={"rules": rules, "hybrid": rules},
            default_backend="rules",
        ),
        confirm_and_apply=ConfirmAndApplyUseCase(phase_repo=phase_repo),
        record_feedback=RecordFeedbackUseCase(feedback_repo=feedback_repo),
    )


def test_interpret_and_apply_401_unauthenticated():
    app.dependency_overrides.clear()
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={"instruction": "quita el ejemplo", "blocks": []},
    )
    assert res.status_code == 401


def test_interpret_and_apply_404_ova_not_found():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    # Repo with owner_id=None simulates non-existent OVA
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=None, phases=[phase_id])

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={"instruction": "quita el ejemplo", "blocks": []},
    )
    assert res.status_code == 404
    assert "OVA no encontrado" in res.json()["detail"]


def test_interpret_and_apply_403_non_owner():
    owner_id = str(uuid.uuid4())
    other_user_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(other_user_id, is_admin=False)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[phase_id])

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={"instruction": "quita el ejemplo", "blocks": []},
    )
    assert res.status_code == 403
    assert "No tienes permisos" in res.json()["detail"]


def test_interpret_and_apply_404_phase_not_found():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())
    existing_phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[existing_phase_id])

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={"instruction": "quita el ejemplo", "blocks": []},
    )
    assert res.status_code == 404
    assert "Fase no encontrada" in res.json()["detail"]


def test_interpret_and_apply_200_owner_success():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[phase_id])

    blocks = [
        {"id": "b1", "tipo": "header", "props": {"title": "Título"}},
        {"id": "b2", "tipo": "example", "props": {"title": "Ejemplo 1"}},
    ]

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={"instruction": "elimina el ejemplo", "blocks": blocks},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"]["accion"] == "quitar"
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["id"] == "b1"
    assert data["requiere_confirmacion"] is False


def test_confirm_and_apply_200_owner_success():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[phase_id])

    blocks = [
        {"id": "b1", "tipo": "header", "props": {"title": "Título", "level": 1}},
        {"id": "b2", "tipo": "paragraph", "props": {"text": "Texto explicativo"}},
    ]

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/confirm",
        json={"instruction": "quita el ejemplo", "blocks": blocks},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["minor_number"] == 2
    assert "<upao-header" in data["html"]


def test_record_feedback_200_success():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[])

    res = client.post(
        f"/api/ovas/{ova_id}/editor/feedback",
        json={
            "instruccion": "quita el ejemplo",
            "bloques_antes": [{"id": "b1", "tipo": "header"}],
            "resultado": "applied",
            "backend": "hybrid",
            "confianza": 0.95,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["feedback_id"] == "feedback-uuid-999"


def test_interpret_rechaza_laya_url_del_cliente():
    """SSRF: el cliente no elige a qué URL llama el servidor."""
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id)
    app.dependency_overrides[build_editor] = lambda: _build_test_editor(owner_id=owner_id, phases=[phase_id])

    res = client.post(
        f"/api/ovas/{ova_id}/phases/{phase_id}/editor/interpret-and-apply",
        json={
            "instruction": "elimina el ejemplo",
            "blocks": [{"id": "b1", "tipo": "example", "props": {}}],
            "options": {"laya_url": "http://169.254.169.254/latest/meta-data"},
        },
    )
    assert res.status_code == 422
