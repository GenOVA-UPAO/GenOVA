"""IDOR en RAG: leer chunks ajenos y ligar uploads ajenos a una OVA propia."""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from types import SimpleNamespace  # noqa: E402

from ova.application.dto import SaveOvaInput  # noqa: E402
from ova.application.use_cases.save_ova import SaveOva  # noqa: E402
from rag.infrastructure import pgvector_store  # noqa: E402
from rag.interface.http import router as rag_router  # noqa: E402


class _Result:
    rowcount = 1

    def mappings(self):
        return self

    def all(self):
        return []


class RecordingDb:
    """Sesión falsa: registra (SQL, parámetros) de cada execute."""

    def __init__(self):
        self.calls: list[tuple[str, dict]] = []

    def execute(self, stmt, params=None):
        self.calls.append((str(stmt), dict(params or {})))
        return _Result()

    def commit(self):
        pass


def test_chunks_by_upload_filtra_por_el_usuario_autenticado():
    db = RecordingDb()
    user = SimpleNamespace(id=uuid.uuid4())
    rag_router.list_chunks_by_upload(str(uuid.uuid4()), current_user=user, db=db)
    sql, params = db.calls[0]
    assert "user_id" in sql.lower()
    assert params["user_id"] == str(user.id)


def test_tie_uploads_solo_toca_chunks_del_actor():
    db = RecordingDb()
    actor = str(uuid.uuid4())
    pgvector_store.tie_uploads_to_ova(db, ["u1"], str(uuid.uuid4()), user_id=actor)
    sql, params = db.calls[0]
    assert "user_id = cast(:user_id" in " ".join(sql.lower().split())
    assert params["user_id"] == actor


def test_save_ova_propaga_el_actor_al_ligar_uploads():
    class Repo:
        tied = None

        def create_ova(self, *a):
            return "ova-1"

        def create_version(self, *a):
            return "v-1"

        def add_phases(self, *a):
            pass

        def set_scorm_package(self, *a):
            pass

        def commit(self, *_):
            pass

        def tie_uploads_to_ova(self, upload_ids, ova_id, actor_id):
            self.tied = (upload_ids, ova_id, actor_id)

    repo = Repo()
    uc = SaveOva(repo, lambda **_: b"zip", lambda *a, **k: ("k", "p"))
    uc.execute(
        SaveOvaInput(
            actor_id="actor-1", title="t", prompt="p", phases=(), upload_ids=("u1",)
        )
    )
    assert repo.tied == (("u1",), "ova-1", "actor-1")
