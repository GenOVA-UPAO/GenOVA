"""Reindexado del RAG y registro del embedder por fragmento (sin red ni BD)."""

import time
from email.utils import formatdate
from types import SimpleNamespace

import pytest

from rag.application.errors import EmbedderError
from rag.application.use_cases import ReindexChunks
from rag.application.use_cases.ingest_document import IngestDocument
from rag.infrastructure import pgvector_store as ps
from rag.infrastructure.embed_retry import RetryPolicy, backoff_s, retry_after_s

FP = "gemini:gemini-embedding-2:768:prefix-v1"


class _Embedder:
    fingerprint = FP

    def __init__(self, fail_on_call: int | None = None):
        self.calls: list[list[str]] = []
        self._fail_on_call = fail_on_call

    def embed_batch(self, texts):
        self.calls.append(list(texts))
        if self._fail_on_call is not None and len(self.calls) == self._fail_on_call:
            raise EmbedderError("429 cuota")
        return [[float(len(t))] for t in texts]


class _Store:
    """ReindexStorePort en memoria: id -> {content, model, upload, vec}."""

    def __init__(self, rows):
        self.rows = {r["id"]: dict(r) for r in rows}
        self.commits = 0

    def _match(self, row, upload_id):
        return upload_id is None or row["upload"] == upload_id

    def count_by_embedding_model(self, *, upload_id=None):
        out: dict = {}
        for row in self.rows.values():
            if self._match(row, upload_id):
                out[row["model"]] = out.get(row["model"], 0) + 1
        return out

    def stale_chunks(self, fingerprint, *, after_id, limit, upload_id=None):
        ids = sorted(
            i
            for i, r in self.rows.items()
            if r["model"] != fingerprint and self._match(r, upload_id) and (after_id is None or i > after_id)
        )
        return [{"id": i, "content": self.rows[i]["content"]} for i in ids[:limit]]

    def update_embeddings(self, rows, fingerprint):
        for cid, vec in rows:
            self.rows[cid].update(vec=vec, model=fingerprint)
        self.commits += 1
        return len(rows)


def _rows():
    rows = [{"id": f"c{i:02d}", "content": "x" * i, "model": None, "upload": "u1"} for i in range(5)]
    rows += [{"id": f"d{i:02d}", "content": "y", "model": "gemini:gemini-embedding-2-preview:768:task_type", "upload": "u2"} for i in range(3)]
    rows += [{"id": f"e{i:02d}", "content": "z", "model": FP, "upload": "u2"} for i in range(2)]
    return rows


def test_ensayo_cuenta_sin_llamar_al_embedder_ni_escribir():
    store, emb = _Store(_rows()), _Embedder()
    report = ReindexChunks(emb, store).execute(dry_run=True, batch_size=3)
    assert (report.total, report.stale, report.reindexed, report.batches) == (10, 8, 0, 3)
    assert emb.calls == [] and store.commits == 0


def test_reindexa_solo_los_desfasados_y_es_idempotente():
    store, emb = _Store(_rows()), _Embedder()
    report = ReindexChunks(emb, store).execute(dry_run=False, batch_size=3)
    assert (report.reindexed, report.batches, report.error) == (8, 3, None)
    assert [len(c) for c in emb.calls] == [3, 3, 2]
    assert all(r["model"] == FP for r in store.rows.values())
    assert store.rows["c03"]["vec"] == [3.0]  # re-embebido desde su propio texto
    again = ReindexChunks(emb, store).execute(dry_run=False, batch_size=3)
    assert (again.stale, again.reindexed) == (0, 0) and len(emb.calls) == 3


def test_se_detiene_en_el_primer_fallo_y_conserva_lo_hecho():
    store, emb = _Store(_rows()), _Embedder(fail_on_call=2)
    report = ReindexChunks(emb, store).execute(dry_run=False, batch_size=3)
    assert report.reindexed == 3 and report.error and "429" in report.error
    assert store.commits == 1
    resumed = ReindexChunks(_Embedder(), store).execute(dry_run=False, batch_size=3)
    assert resumed.stale == 5 and resumed.reindexed == 5


def test_limite_y_filtro_por_documento():
    store = _Store(_rows())
    report = ReindexChunks(_Embedder(), store).execute(dry_run=False, batch_size=2, limit=3, upload_id="u1")
    assert report.stale == 5 and report.reindexed == 3
    assert all(r["model"] is None for i, r in store.rows.items() if i.startswith("c0") and i >= "c03")
    assert all(r["model"] != FP for i, r in store.rows.items() if i.startswith("d"))


def test_sin_fingerprint_no_se_reindexa():
    with pytest.raises(EmbedderError):
        ReindexChunks(SimpleNamespace(embed_batch=lambda t: t), _Store([])).execute()


def test_la_ingesta_guarda_el_embedder_que_produjo_los_vectores():
    captured: dict = {}

    class _Store:
        def insert_chunks(self, **kwargs):
            captured.update(kwargs)
            return len(kwargs["chunks"])

    extractor = SimpleNamespace(
        detect_kind=lambda filename: "text",
        extract_text=lambda storage_path, *, filename: "Texto de prueba.",
    )
    IngestDocument(_Embedder(), _Store(), extractor).execute(
        user_id="u", upload_id="up", storage_path="/tmp/x", filename="a.md"
    )
    assert captured["embedding_model"] == FP


class _Session:
    """Session mínima: la primera sentencia falla si la columna no existe."""

    def __init__(self, has_column: bool):
        self.has_column = has_column
        self.statements: list[str] = []
        self.rollbacks = 0

    def execute(self, stmt, params=None):
        sql = str(stmt)
        self.statements.append(sql)
        if "embedding_model" in sql and not self.has_column:
            raise RuntimeError('column "embedding_model" of relation "rag_chunks" does not exist')

    def commit(self):
        pass

    def rollback(self):
        self.rollbacks += 1


@pytest.mark.parametrize("has_column", [True, False])
def test_insert_funciona_con_y_sin_la_migracion_043(has_column):
    db = _Session(has_column)
    n = ps.insert_chunks(
        db, user_id="u", upload_id="up", source_filename="a", chunks=["a"], embeddings=[[0.1]], embedding_model=FP
    )
    assert n == 1
    assert len(db.statements) == (1 if has_column else 2)
    assert db.rollbacks == (0 if has_column else 1)


def test_insert_otro_error_se_propaga():
    class _Broken(_Session):
        def execute(self, stmt, params=None):
            raise RuntimeError("otra cosa")

    with pytest.raises(RuntimeError, match="otra cosa"):
        ps.insert_chunks(
            _Broken(True), user_id="u", upload_id="up", source_filename="a", chunks=["a"], embeddings=[[0.1]]
        )


def _exc(headers=None, details=None):
    body = {"error": {"code": 429, "details": details or []}}
    return SimpleNamespace(response=SimpleNamespace(headers=headers or {}), details=body, code=429)


def test_retry_after_en_segundos_fecha_http_y_retry_info():
    assert retry_after_s(_exc({"retry-after": "12"})) == 12.0
    future = formatdate(time.time() + 30, usegmt=True)
    assert 25 <= retry_after_s(_exc({"retry-after": future})) <= 31
    info = {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "2.5s"}
    assert retry_after_s(_exc(details=[info])) == 2.5
    assert retry_after_s(_exc()) is None
    assert retry_after_s(RuntimeError("red")) is None


def test_backoff_con_jitter_entre_la_mitad_y_el_techo():
    policy = RetryPolicy(budget_s=60)
    for attempt, ceiling in enumerate([2, 4, 8, 16, 30, 30]):
        values = [backoff_s(attempt, policy) for _ in range(50)]
        assert all(ceiling / 2 <= v <= ceiling for v in values)
