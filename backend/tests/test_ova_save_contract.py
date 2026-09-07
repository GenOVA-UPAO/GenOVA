"""Pruebas de contrato del orden de guardado de OVA y tolerancia de almacenamiento/RAG."""

from pathlib import Path
from typing import Any

import pytest

from ova.application.dto import SaveOvaInput
from ova.application.scorm_persist import persist_scorm_zip
from ova.application.use_cases.save_ova import SaveOva
from ova.domain.model import OvaPhase
from storage import StorageError


class TraceRecordingRepository:
    def __init__(self, raise_on_rag: bool = False) -> None:
        self.events: list[str] = []
        self.raise_on_rag = raise_on_rag
        self.scorm_package_args: tuple[str, str, str | None, str | None] | None = None
        self.tied_uploads: tuple[tuple[str, ...], str] | None = None

    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str:
        self.events.append(f"create_ova:{owner_id}:{title}:{status}")
        return "ova-uuid-1"

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str:
        self.events.append(f"create_version:{ova_id}:{version_number}")
        return "version-uuid-1"

    def add_phases(self, version_id: str, phases: tuple[OvaPhase, ...]) -> None:
        self.events.append(f"add_phases:{version_id}:{len(phases)}")

    def set_scorm_package(
        self,
        ova_id: str,
        version_id: str,
        storage_key: str | None,
        file_path: str | None,
    ) -> None:
        self.scorm_package_args = (ova_id, version_id, storage_key, file_path)
        self.events.append(f"set_scorm_package:{storage_key}:{file_path}")

    def tie_uploads_to_ova(self, upload_ids: tuple[str, ...], ova_id: str) -> None:
        self.events.append(f"tie_uploads:{ova_id}:{len(upload_ids)}")
        self.tied_uploads = (upload_ids, ova_id)
        if self.raise_on_rag:
            raise RuntimeError("Error tolerado al vincular chunks de RAG")

    def commit(self, operation: str) -> None:
        self.events.append(f"commit:{operation}")


def _build_phases() -> tuple[OvaPhase, ...]:
    return (
        OvaPhase(type="ENGAGE", order=1, content="Contenido 1", title="Introducción"),
        OvaPhase(type="EXPLORE", order=2, content="Contenido 2", title="Desarrollo"),
    )


def test_save_ova_orden_estricto_de_operaciones():
    repo = TraceRecordingRepository()
    trace: list[str] = []

    def dummy_builder(**kwargs: Any) -> bytes:
        trace.append("build_scorm_zip")
        repo.events.append("build_scorm_zip")
        return b"PK_DUMMY_ZIP_BYTES"

    def dummy_persister(zip_bytes: bytes, user_id: str, ova_id: str, version: int):
        trace.append("persist_scorm_zip")
        repo.events.append(f"persist_scorm_zip:{user_id}:{ova_id}:{version}")
        return "storage-key-1", None

    use_case = SaveOva(
        repo=repo,
        build_scorm_zip=dummy_builder,
        persist_scorm_zip=dummy_persister,
    )

    result = use_case.execute(
        SaveOvaInput(
            actor_id="user-42",
            title="Mi Curso OVA",
            prompt="Genera una lección de matemáticas",
            phases=_build_phases(),
            upload_ids=("upload-1", "upload-2"),
        )
    )

    assert result.ova_id == "ova-uuid-1"
    orden_esperado = [
        "create_ova:user-42:Mi Curso OVA:listo",
        "create_version:ova-uuid-1:1",
        "add_phases:version-uuid-1:2",
        "build_scorm_zip",
        "persist_scorm_zip:user-42:ova-uuid-1:1",
        "set_scorm_package:storage-key-1:None",
        "commit:save_ova",
        "tie_uploads:ova-uuid-1:2",
    ]
    assert repo.events == orden_esperado


def test_save_ova_persistencia_con_storage_configurado():
    repo = TraceRecordingRepository()

    def persister_storage(zip_bytes: bytes, user_id: str, ova_id: str, version: int):
        return f"{user_id}/{ova_id}_v{version}.zip", None

    use_case = SaveOva(
        repo=repo,
        build_scorm_zip=lambda **kwargs: b"ZIP",
        persist_scorm_zip=persister_storage,
    )

    use_case.execute(
        SaveOvaInput(
            actor_id="user-1",
            title="Título",
            prompt="Prompt",
            phases=_build_phases(),
            upload_ids=(),
        )
    )

    assert repo.scorm_package_args == (
        "ova-uuid-1",
        "version-uuid-1",
        "user-1/ova-uuid-1_v1.zip",
        None,
    )


def test_save_ova_persistencia_con_caida_a_disco_local():
    repo = TraceRecordingRepository()

    def persister_local(zip_bytes: bytes, user_id: str, ova_id: str, version: int):
        return None, f"/local/path/{ova_id}_v{version}.zip"

    use_case = SaveOva(
        repo=repo,
        build_scorm_zip=lambda **kwargs: b"ZIP",
        persist_scorm_zip=persister_local,
    )

    use_case.execute(
        SaveOvaInput(
            actor_id="user-1",
            title="Título",
            prompt="Prompt",
            phases=_build_phases(),
            upload_ids=(),
        )
    )

    assert repo.scorm_package_args == (
        "ova-uuid-1",
        "version-uuid-1",
        None,
        "/local/path/ova-uuid-1_v1.zip",
    )


def test_save_ova_sin_upload_ids_no_invoca_tie_uploads():
    repo = TraceRecordingRepository()
    use_case = SaveOva(
        repo=repo,
        build_scorm_zip=lambda **kwargs: b"ZIP",
        persist_scorm_zip=lambda *args: ("key", None),
    )

    use_case.execute(
        SaveOvaInput(
            actor_id="user-1",
            title="Título",
            prompt="Prompt",
            phases=_build_phases(),
            upload_ids=(),
        )
    )

    assert repo.tied_uploads is None
    assert not any(event.startswith("tie_uploads") for event in repo.events)


def test_save_ova_commit_ocurre_antes_de_rag_para_tolerar_fallo():
    repo = TraceRecordingRepository(raise_on_rag=True)
    use_case = SaveOva(
        repo=repo,
        build_scorm_zip=lambda **kwargs: b"ZIP",
        persist_scorm_zip=lambda *args: ("key", None),
    )

    with pytest.raises(RuntimeError, match="Error tolerado al vincular chunks de RAG"):
        use_case.execute(
            SaveOvaInput(
                actor_id="user-1",
                title="Título",
                prompt="Prompt",
                phases=_build_phases(),
                upload_ids=("up-1",),
            )
        )

    # El commit de la OVA debe haber ocurrido estrictamente antes de intentar atar los uploads
    commit_idx = repo.events.index("commit:save_ova")
    tie_idx = repo.events.index("tie_uploads:ova-uuid-1:1")
    assert commit_idx < tie_idx


def test_persist_scorm_zip_storage_configurado_y_exitoso(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setenv("OVA_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr("ova.application.scorm_persist.is_configured", lambda: True)

    subidas: list[tuple[str, bytes]] = []

    def fake_upload(object_key: str, zip_bytes: bytes) -> str:
        subidas.append((object_key, zip_bytes))
        return object_key

    monkeypatch.setattr("ova.application.scorm_persist.upload_zip", fake_upload)

    contenido = b"ZIP_STORAGE_SUCCESS"
    storage_key, file_path = persist_scorm_zip(contenido, "user-9", "ova-99", 1)

    assert storage_key == "user-9/ova-99_v1.zip"
    assert file_path is None
    assert subidas == [("user-9/ova-99_v1.zip", contenido)]
    assert len(list(tmp_path.iterdir())) == 0


def test_persist_scorm_zip_fallo_de_storage_cae_a_disco_local(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    monkeypatch.setenv("OVA_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr("ova.application.scorm_persist.is_configured", lambda: True)

    def fake_upload_failing(object_key: str, zip_bytes: bytes) -> str:
        raise StorageError("Fallo de conexión con Supabase")

    monkeypatch.setattr("ova.application.scorm_persist.upload_zip", fake_upload_failing)

    contenido = b"ZIP_FALLBACK_BYTES"
    storage_key, file_path = persist_scorm_zip(contenido, "user-9", "ova-99", 1)

    assert storage_key is None
    assert file_path is not None
    assert Path(file_path).exists()
    assert Path(file_path).read_bytes() == contenido


def test_persist_scorm_zip_storage_no_configurado_guarda_en_disco_local(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    monkeypatch.setenv("OVA_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr("ova.application.scorm_persist.is_configured", lambda: False)

    contenido = b"ZIP_LOCAL_ONLY_BYTES"
    storage_key, file_path = persist_scorm_zip(contenido, "user-8", "ova-88", 2)

    assert storage_key is None
    assert file_path is not None
    assert Path(file_path).exists()
    assert Path(file_path).read_bytes() == contenido
