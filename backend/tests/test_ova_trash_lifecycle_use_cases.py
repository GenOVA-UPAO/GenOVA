"""Pruebas unitarias del ciclo de vida de papelera de OVA (soft delete, restore, purga y operaciones por lotes)."""

from datetime import UTC, datetime

import pytest

from ova.application.dto import BatchOvaInput, ManageOvaInput, TrashPageInput
from ova.application.use_cases.batch_delete_ovas import BatchDeleteOvas
from ova.application.use_cases.batch_move_ovas_to_trash import BatchMoveOvasToTrash
from ova.application.use_cases.batch_restore_ovas import BatchRestoreOvas
from ova.application.use_cases.count_trashed_ovas import CountTrashedOvas
from ova.application.use_cases.delete_ova import DeleteOva
from ova.application.use_cases.list_trashed_ovas import ListTrashedOvas
from ova.application.use_cases.permanently_delete_ova import PermanentlyDeleteOva
from ova.application.use_cases.restore_ova import RestoreOva
from ova.domain.errors import OvaForbidden, OvaGenerating, OvaNotFound
from ova.domain.model import Ova, OvaActor


class DummyLifecycleRepository:
    def __init__(self, active_ovas: dict[str, Ova] | None = None, trashed_ovas: dict[str, Ova] | None = None) -> None:
        self.active = dict(active_ovas or {})
        self.trashed = dict(trashed_ovas or {})
        self.moved_to_trash: list[tuple[str, datetime]] = []
        self.restored: list[str] = []
        self.staged_deletes: list[str] = []
        self.commits: list[str] = []
        self.count_calls: list[str | None] = []
        self.list_calls: list[tuple[str | None, int, int]] = []

    def get_active(self, ova_id: str) -> Ova | None:
        return self.active.get(ova_id)

    def get_trashed(self, ova_id: str) -> Ova | None:
        return self.trashed.get(ova_id)

    def count_trashed(self, owner_id: str | None) -> int:
        self.count_calls.append(owner_id)
        if owner_id is None:
            return len(self.trashed)
        return sum(1 for ova in self.trashed.values() if ova.owner_id == owner_id)

    def list_trashed(self, owner_id: str | None, offset: int, limit: int) -> list[Ova]:
        self.list_calls.append((owner_id, offset, limit))
        ovas = [ova for ova in self.trashed.values() if owner_id is None or ova.owner_id == owner_id]
        return ovas[offset : offset + limit]

    def update_metadata(self, ova_id: str, title: str, description: str | None) -> None:
        pass

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None:
        self.moved_to_trash.append((ova_id, deleted_at))
        if ova_id in self.active:
            ova = self.active.pop(ova_id)
            self.trashed[ova_id] = ova

    def restore(self, ova_id: str) -> None:
        self.restored.append(ova_id)
        if ova_id in self.trashed:
            ova = self.trashed.pop(ova_id)
            self.active[ova_id] = ova

    def stage_permanent_delete(self, ova_id: str) -> None:
        self.staged_deletes.append(ova_id)
        self.trashed.pop(ova_id, None)

    def commit(self, operation: str) -> None:
        self.commits.append(operation)


class DummyScormCleaner:
    def __init__(self) -> None:
        self.deleted_packages: list[tuple[str | None, str | None]] = []

    def delete(self, file_path: str | None, storage_key: str | None) -> None:
        self.deleted_packages.append((file_path, storage_key))


def _make_ova(
    ova_id: str,
    owner_id: str = "user-1",
    status: str = "listo",
    file_path: str | None = None,
    storage_key: str | None = None,
    deleted_at: datetime | None = None,
) -> Ova:
    return Ova(
        id=ova_id,
        owner_id=owner_id,
        title=f"OVA {ova_id}",
        description=None,
        status=status,
        file_path=file_path,
        storage_key=storage_key,
        version_number=1,
        created_at=datetime.now(UTC),
        updated_at=None,
        deleted_at=deleted_at,
    )


# --- DeleteOva (Soft Delete) ---


def test_delete_ova_falla_si_no_existe_o_ya_esta_en_papelera():
    repo = DummyLifecycleRepository()
    use_case = DeleteOva(repo=repo)

    with pytest.raises(OvaNotFound, match="OVA no encontrado o ya eliminado."):
        use_case.execute(ManageOvaInput(ova_id="inexistente", actor=OvaActor("user-1", False)))


def test_delete_ova_falla_si_usuario_no_es_dueno_ni_admin():
    ova = _make_ova("ova-1", owner_id="otro-user")
    repo = DummyLifecycleRepository(active_ovas={"ova-1": ova})
    use_case = DeleteOva(repo=repo)

    with pytest.raises(OvaForbidden, match="No tienes permiso"):
        use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))


def test_delete_ova_falla_si_status_es_generando():
    """Generando de verdad: el guard sigue bloqueando el borrado (409)."""
    ova = _make_ova("ova-1", owner_id="user-1", status="generando")
    repo = DummyLifecycleRepository(active_ovas={"ova-1": ova})
    use_case = DeleteOva(repo=repo)

    with pytest.raises(OvaGenerating, match="No se puede eliminar el OVA mientras se está generando."):
        use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))


def test_delete_ova_abandonado_ya_reconciliado_se_puede_borrar():
    """Tras el sweep, el Ova zombi deja 'generando' (p.ej. error) y el borrado pasa."""
    ova = _make_ova("ova-1", owner_id="user-1", status="error")
    repo = DummyLifecycleRepository(active_ovas={"ova-1": ova})
    use_case = DeleteOva(repo=repo)

    result = use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))

    assert result.id == "ova-1"
    assert repo.moved_to_trash[0][0] == "ova-1"
    assert repo.commits == ["delete_ova"]


def test_delete_ova_exitoso_mueve_a_papelera_y_hace_commit():
    ova = _make_ova("ova-1", owner_id="user-1", status="listo")
    repo = DummyLifecycleRepository(active_ovas={"ova-1": ova})
    use_case = DeleteOva(repo=repo)

    result = use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))

    assert result.id == "ova-1"
    assert len(repo.moved_to_trash) == 1
    assert repo.moved_to_trash[0][0] == "ova-1"
    assert repo.commits == ["delete_ova"]


# --- RestoreOva ---


def test_restore_ova_falla_si_no_esta_en_papelera():
    repo = DummyLifecycleRepository()
    use_case = RestoreOva(repo=repo)

    with pytest.raises(OvaNotFound, match="OVA no encontrado en la papelera."):
        use_case.execute(ManageOvaInput(ova_id="ova-no-papelera", actor=OvaActor("user-1", False)))


def test_restore_ova_falla_si_actor_no_tiene_permiso():
    ova = _make_ova("ova-1", owner_id="otro-user", deleted_at=datetime.now(UTC))
    repo = DummyLifecycleRepository(trashed_ovas={"ova-1": ova})
    use_case = RestoreOva(repo=repo)

    with pytest.raises(OvaForbidden, match="No tienes permiso"):
        use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))


def test_restore_ova_exitoso_restaura_y_hace_commit():
    ova = _make_ova("ova-1", owner_id="user-1", deleted_at=datetime.now(UTC))
    repo = DummyLifecycleRepository(trashed_ovas={"ova-1": ova})
    use_case = RestoreOva(repo=repo)

    result = use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))

    assert result.id == "ova-1"
    assert repo.restored == ["ova-1"]
    assert repo.commits == ["restore_ova"]


# --- PermanentlyDeleteOva (Purga + Paquete SCORM) ---


def test_permanent_delete_falla_si_no_esta_en_papelera():
    repo = DummyLifecycleRepository()
    cleaner = DummyScormCleaner()
    use_case = PermanentlyDeleteOva(repo=repo, packages=cleaner)

    with pytest.raises(OvaNotFound, match="OVA no encontrado en la papelera."):
        use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))


def test_permanent_delete_falla_si_no_tiene_permisos():
    ova = _make_ova("ova-1", owner_id="otro-user", deleted_at=datetime.now(UTC))
    repo = DummyLifecycleRepository(trashed_ovas={"ova-1": ova})
    cleaner = DummyScormCleaner()
    use_case = PermanentlyDeleteOva(repo=repo, packages=cleaner)

    with pytest.raises(OvaForbidden, match="No tienes permiso"):
        use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))


def test_permanent_delete_exitoso_purga_bd_y_borra_paquete_scorm():
    ova = _make_ova(
        "ova-1",
        owner_id="user-1",
        file_path="/var/scorm/ova-1.zip",
        storage_key="user-1/ova-1_v1.zip",
        deleted_at=datetime.now(UTC),
    )
    repo = DummyLifecycleRepository(trashed_ovas={"ova-1": ova})
    cleaner = DummyScormCleaner()
    use_case = PermanentlyDeleteOva(repo=repo, packages=cleaner)

    result = use_case.execute(ManageOvaInput(ova_id="ova-1", actor=OvaActor("user-1", False)))

    assert result.id == "ova-1"
    assert repo.staged_deletes == ["ova-1"]
    assert repo.commits == ["permanent_delete_ova"]
    assert cleaner.deleted_packages == [("/var/scorm/ova-1.zip", "user-1/ova-1_v1.zip")]


# --- Operaciones por lotes (Batch) ---


def test_batch_move_to_trash_procesa_validos_y_omite_conflictivos():
    o1 = _make_ova("o1", owner_id="user-1", status="listo")
    o2 = _make_ova("o2", owner_id="user-1", status="generando")  # conflictivo
    o3 = _make_ova("o3", owner_id="otro-user", status="listo")  # no accesible
    repo = DummyLifecycleRepository(active_ovas={"o1": o1, "o2": o2, "o3": o3})
    use_case = BatchMoveOvasToTrash(repo=repo)

    result = use_case.execute(
        BatchOvaInput(ova_ids=("o1", "o2", "o3", "fantasma"), actor=OvaActor("user-1", False))
    )

    assert result.completed == ("o1",)
    assert result.skipped == ("o2", "o3", "fantasma")
    assert [m[0] for m in repo.moved_to_trash] == ["o1"]
    assert repo.commits == ["batch_move_to_trash"]


def test_batch_restore_procesa_validos_y_omite_invalidos():
    t1 = _make_ova("t1", owner_id="user-1", deleted_at=datetime.now(UTC))
    t2 = _make_ova("t2", owner_id="otro-user", deleted_at=datetime.now(UTC))  # ajeno
    repo = DummyLifecycleRepository(trashed_ovas={"t1": t1, "t2": t2})
    use_case = BatchRestoreOvas(repo=repo)

    result = use_case.execute(
        BatchOvaInput(ova_ids=("t1", "t2", "no-existe"), actor=OvaActor("user-1", False))
    )

    assert result.completed == ("t1",)
    assert result.skipped == ("t2", "no-existe")
    assert repo.restored == ["t1"]
    assert repo.commits == ["batch_restore"]


def test_batch_permanent_delete_purga_validos_y_elimina_todos_los_paquetes():
    t1 = _make_ova("t1", owner_id="user-1", file_path="/p/t1.zip", storage_key=None)
    t2 = _make_ova("t2", owner_id="user-1", file_path=None, storage_key="key/t2.zip")
    t3 = _make_ova("t3", owner_id="otro-user")
    repo = DummyLifecycleRepository(trashed_ovas={"t1": t1, "t2": t2, "t3": t3})
    cleaner = DummyScormCleaner()
    use_case = BatchDeleteOvas(repo=repo, packages=cleaner)

    result = use_case.execute(
        BatchOvaInput(ova_ids=("t1", "t2", "t3"), actor=OvaActor("user-1", False))
    )

    assert result.completed == ("t1", "t2")
    assert result.skipped == ("t3",)
    assert repo.staged_deletes == ["t1", "t2"]
    assert repo.commits == ["batch_permanent_delete"]
    assert cleaner.deleted_packages == [("/p/t1.zip", None), (None, "key/t2.zip")]


# --- Conteo y Listado de Papelera ---


def test_count_trashed_ovas_aplica_filtro_de_rol():
    t1 = _make_ova("t1", owner_id="user-1")
    t2 = _make_ova("t2", owner_id="user-2")
    repo = DummyLifecycleRepository(trashed_ovas={"t1": t1, "t2": t2})
    use_case = CountTrashedOvas(repo=repo)

    # Usuario normal: solo cuenta sus propias OVAs
    assert use_case.execute(OvaActor("user-1", is_admin=False)) == 1
    assert repo.count_calls[-1] == "user-1"

    # Administrador: cuenta todas las de la papelera
    assert use_case.execute(OvaActor("admin", is_admin=True)) == 2
    assert repo.count_calls[-1] is None


def test_list_trashed_ovas_calcula_offset_correctamente():
    t1 = _make_ova("t1", owner_id="user-1")
    t2 = _make_ova("t2", owner_id="user-1")
    t3 = _make_ova("t3", owner_id="user-1")
    repo = DummyLifecycleRepository(trashed_ovas={"t1": t1, "t2": t2, "t3": t3})
    use_case = ListTrashedOvas(repo=repo)

    result = use_case.execute(
        TrashPageInput(actor=OvaActor("user-1", is_admin=False), page=2, limit=2)
    )

    assert result.total_items == 3
    assert result.page == 2
    assert result.limit == 2
    assert len(result.ovas) == 1
    assert repo.list_calls == [("user-1", 2, 2)]
