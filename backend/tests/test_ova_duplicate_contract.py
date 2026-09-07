"""Pruebas de contrato para la duplicación de OVA (sobres HTTP 201/404/403/409, estado y título)."""

from collections.abc import Generator
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.dependencies import get_current_user
from ova.application.dto import DuplicateOvaInput, DuplicateOvaResult
from ova.application.use_cases.duplicate_ova import DuplicateOva
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaForbidden, OvaGenerating, OvaNotFound
from ova.domain.model import OvaActor, OvaDuplicateSource, OvaPhase
from ova.interface.http.duplicate_router import router as duplicate_router


class DummyDuplicationRepository:
    def __init__(
        self,
        source: OvaDuplicateSource | None = None,
        existing_titles: set[str] | None = None,
    ) -> None:
        self.source = source
        self.existing_titles = existing_titles or set()
        self.created_ovas: list[dict[str, Any]] = []
        self.created_versions: list[dict[str, Any]] = []
        self.added_phases: list[dict[str, Any]] = []
        self.current_versions: list[tuple[str, str]] = []
        self.committed: list[str] = []

    def get_duplicate_source(self, ova_id: str) -> OvaDuplicateSource | None:
        if self.source is not None and ova_id == "ova-source-1":
            return self.source
        return None

    def next_copy_title(self, base_title: str, owner_id: str) -> str:
        candidate = f"{base_title} (copia)"
        if candidate not in self.existing_titles:
            return candidate
        for number in range(2, 12):
            numbered = f"{base_title} (copia {number})"
            if numbered not in self.existing_titles:
                return numbered
        return f"{base_title} (copia 999)"

    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str:
        self.created_ovas.append(
            {"owner_id": owner_id, "title": title, "description": description, "status": status}
        )
        return "ova-duplicate-id"

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str:
        self.created_versions.append(
            {"ova_id": ova_id, "version_number": version_number, "prompt": prompt}
        )
        return "version-duplicate-id"

    def add_phases(self, version_id: str, phases: tuple[OvaPhase, ...]) -> None:
        self.added_phases.append({"version_id": version_id, "phases": phases})

    def set_current_version(self, ova_id: str, version_id: str) -> None:
        self.current_versions.append((ova_id, version_id))

    def commit(self, operation: str) -> None:
        self.committed.append(operation)


def _build_source(
    owner_id: str = "user-1",
    title: str = "Lección de Historia",
    status: str = "listo",
) -> OvaDuplicateSource:
    return OvaDuplicateSource(
        owner_id=owner_id,
        title=title,
        description="Descripción original",
        status=status,
        prompt="Prompt original",
        phases=(OvaPhase(type="ENGAGE", order=1, content="Intro", title="Paso 1"),),
    )


# --- Pruebas de caso de uso unitario ---


def test_duplicar_ova_nace_estrictamente_en_estado_borrador():
    repo = DummyDuplicationRepository(source=_build_source(owner_id="user-1"))
    use_case = DuplicateOva(repo=repo)

    result = use_case.execute(
        DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="user-1", is_admin=False))
    )

    assert result.id == "ova-duplicate-id"
    assert len(repo.created_ovas) == 1
    assert repo.created_ovas[0]["status"] == "borrador"


def test_duplicar_ova_asigna_sufijo_copia():
    repo = DummyDuplicationRepository(source=_build_source(title="Física Cuántica"))
    use_case = DuplicateOva(repo=repo)

    result = use_case.execute(
        DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="user-1", is_admin=False))
    )

    assert result.title == "Física Cuántica (copia)"
    assert repo.created_ovas[0]["title"] == "Física Cuántica (copia)"


def test_duplicar_ova_con_copias_existentes_incrementa_sufijo_numerico():
    repo = DummyDuplicationRepository(
        source=_build_source(title="Química"),
        existing_titles={"Química (copia)", "Química (copia 2)"},
    )
    use_case = DuplicateOva(repo=repo)

    result = use_case.execute(
        DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="user-1", is_admin=False))
    )

    assert result.title == "Química (copia 3)"


def test_duplicar_ova_no_existente_lanza_ova_not_found():
    repo = DummyDuplicationRepository(source=None)
    use_case = DuplicateOva(repo=repo)

    with pytest.raises(OvaNotFound, match="OVA no encontrado."):
        use_case.execute(
            DuplicateOvaInput(ova_id="ova-fantasma", actor=OvaActor(id="user-1", is_admin=False))
        )


def test_duplicar_ova_ajena_sin_ser_admin_lanza_ova_forbidden():
    repo = DummyDuplicationRepository(source=_build_source(owner_id="propietario-original"))
    use_case = DuplicateOva(repo=repo)

    with pytest.raises(OvaForbidden, match="Sin permisos."):
        use_case.execute(
            DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="otro-usuario", is_admin=False))
        )


def test_duplicar_ova_ajena_como_admin_es_permitido():
    repo = DummyDuplicationRepository(source=_build_source(owner_id="propietario-original"))
    use_case = DuplicateOva(repo=repo)

    result = use_case.execute(
        DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="admin-user", is_admin=True))
    )

    assert result.id == "ova-duplicate-id"
    assert repo.created_ovas[0]["owner_id"] == "admin-user"


def test_duplicar_ova_en_estado_generando_lanza_ova_generating():
    repo = DummyDuplicationRepository(source=_build_source(status="generando"))
    use_case = DuplicateOva(repo=repo)

    with pytest.raises(OvaGenerating, match="No se puede duplicar mientras se está generando."):
        use_case.execute(
            DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="user-1", is_admin=False))
        )


def test_duplicar_ova_copia_fases_e_inicializa_version():
    source = _build_source()
    repo = DummyDuplicationRepository(source=source)
    use_case = DuplicateOva(repo=repo)

    use_case.execute(
        DuplicateOvaInput(ova_id="ova-source-1", actor=OvaActor(id="user-1", is_admin=False))
    )

    assert repo.created_versions == [
        {"ova_id": "ova-duplicate-id", "version_number": 1, "prompt": "Prompt original"}
    ]
    assert repo.added_phases == [{"version_id": "version-duplicate-id", "phases": source.phases}]
    assert repo.current_versions == [("ova-duplicate-id", "version-duplicate-id")]
    assert repo.committed == ["duplicate_ova"]


# --- Pruebas de contrato HTTP para los cuatro sobres (201, 404, 403, 409) ---


@pytest.fixture
def http_client() -> Generator[tuple[TestClient, MagicMock], None, None]:
    app = FastAPI()
    app.include_router(duplicate_router, prefix="/api/ova")

    fake_use_cases = MagicMock(spec=OvaUseCases)
    fake_user = SimpleNamespace(id="user-1", admin_flag_cached=False)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[build_ova] = lambda: fake_use_cases

    client = TestClient(app)
    yield client, fake_use_cases
    app.dependency_overrides.clear()


def test_http_sobre_201_al_duplicar_exitosamente(http_client):
    client, fake_use_cases = http_client
    fake_use_cases.duplicate_ova.execute.return_value = DuplicateOvaResult(
        id="ova-dup-123",
        title="Matemáticas (copia)",
    )

    response = client.post("/api/ova/ova-orig/duplicar")

    assert response.status_code == 201
    assert response.json() == {
        "id": "ova-dup-123",
        "title": "Matemáticas (copia)",
        "status": "borrador",
        "message": "OVA duplicado correctamente.",
        "edit_url": "/ova/ova-dup-123/workspace",
    }


def test_http_sobre_404_cuando_ova_no_existe(http_client):
    client, fake_use_cases = http_client
    fake_use_cases.duplicate_ova.execute.side_effect = OvaNotFound("OVA no encontrado.")

    response = client.post("/api/ova/ova-inexistente/duplicar")

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "OVA no encontrado.",
    }


def test_http_sobre_403_sin_permiso_de_acceso(http_client):
    client, fake_use_cases = http_client
    fake_use_cases.duplicate_ova.execute.side_effect = OvaForbidden("Sin permisos.")

    response = client.post("/api/ova/ova-ajeno/duplicar")

    assert response.status_code == 403
    assert response.json() == {
        "error": "forbidden",
        "message": "Sin permisos.",
    }


def test_http_sobre_409_cuando_ova_esta_generando(http_client):
    client, fake_use_cases = http_client
    fake_use_cases.duplicate_ova.execute.side_effect = OvaGenerating(
        "No se puede duplicar mientras se está generando."
    )

    response = client.post("/api/ova/ova-en-progreso/duplicar")

    assert response.status_code == 409
    assert response.json() == {
        "error": "ova_generating",
        "message": "No se puede duplicar mientras se está generando.",
    }
