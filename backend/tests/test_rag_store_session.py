"""Un fallo de SQL en el RAG no deja la sesión del llamador inservible (sin BD)."""

from contextlib import contextmanager

import pytest

from rag.infrastructure import pgvector_store as ps


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class _FakeSession:
    """Imita lo justo de Session. Una sentencia que falla deja la transacción
    abortada (como PostgreSQL) salvo que ocurra dentro de un SAVEPOINT."""

    def __init__(self, fail_on: str):
        self.fail_on = fail_on
        self.aborted = False
        self.savepoints: list[str] = []
        self.rollbacks = 0
        self.commits = 0

    @contextmanager
    def begin_nested(self):
        try:
            yield
        except Exception:
            self.savepoints.append("rollback")
            self.aborted = False  # ROLLBACK TO SAVEPOINT: la transacción sigue viva
            raise
        self.savepoints.append("release")

    def execute(self, stmt, params=None):
        if self.aborted:
            raise RuntimeError("InFailedSqlTransaction")
        if self.fail_on in str(stmt):
            self.aborted = True
            raise RuntimeError("DataError: different vector dimensions")
        return _Result([{"id": "c1", "upload_id": "u1", "chunk_index": 0, "content": "Zorblax"}])

    def commit(self):
        if self.aborted:
            raise RuntimeError("InFailedSqlTransaction")
        self.commits += 1

    def rollback(self):
        self.aborted = False
        self.rollbacks += 1


def test_fallo_de_la_rama_vectorial_no_tumba_la_lexica():
    db = _FakeSession(fail_on="<=>")
    rows = ps.search_hybrid(db, "volcán Zorblax", [0.1] * 3072, ["u1"], k=3)
    assert [r["id"] for r in rows] == ["c1"]  # la léxica respondió
    assert db.savepoints == ["rollback", "release"]
    assert not db.aborted  # el llamador puede seguir usando la sesión


def test_fallo_de_la_rama_lexica_no_rompe_la_sesion():
    db = _FakeSession(fail_on="websearch_to_tsquery")
    rows = ps.search_hybrid(db, "volcán Zorblax", [0.1] * 768, ["u1"], k=3)
    assert [r["id"] for r in rows] == ["c1"]  # la vectorial respondió
    assert not db.aborted


def test_insercion_fallida_deshace_la_transaccion_y_propaga():
    db = _FakeSession(fail_on="INSERT INTO rag_chunks")
    with pytest.raises(RuntimeError, match="DataError"):
        ps.insert_chunks(
            db, user_id="u", upload_id="u1", source_filename="a.docx", chunks=["x"], embeddings=[[0.1]]
        )
    assert db.rollbacks == 1 and not db.aborted
