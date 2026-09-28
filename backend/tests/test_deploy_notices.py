"""Avisos de despliegue al arrancar: límites por proceso sin REDIS_URL y
fragmentos del RAG embebidos con otro modelo (hay que reindexar).

Sin red ni Postgres: el recuento de workers se prueba con argv/entorno
simulados y el aviso del RAG con un almacén y un embedder falsos.

Uso:  pytest tests/test_deploy_notices.py -v
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402
from structlog.testing import capture_logs  # noqa: E402

from core.rate_limit import configured_workers, per_process_limits_warning  # noqa: E402
from rag import reindex_notice  # noqa: E402
from rag.application.errors import EmbedderError  # noqa: E402

# ── Workers y REDIS_URL ────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("argv", "environ", "expected"),
    [
        (["uvicorn", "main:app", "--port", "8000"], {}, 1),
        (["uvicorn", "main:app", "--workers", "4"], {}, 4),
        (["uvicorn", "main:app", "--workers=3"], {}, 3),
        (["gunicorn", "-w", "2", "main:app"], {}, 2),
        (["uvicorn", "main:app"], {"WEB_CONCURRENCY": "2"}, 2),
        (["uvicorn", "main:app"], {"UVICORN_WORKERS": "5"}, 5),
        (["uvicorn", "main:app"], {"WEB_CONCURRENCY": "no-es-numero"}, 1),
        (["uvicorn", "main:app", "--workers"], {}, 1),  # flag sin valor
    ],
)
def test_cuenta_los_workers_pedidos(argv, environ, expected):
    assert configured_workers(argv, environ) == expected


def test_avisa_en_produccion_con_varios_workers_sin_redis():
    msg = per_process_limits_warning(env="production", redis_url="", workers=2)
    assert msg and "REDIS_URL" in msg and "2 veces" in msg


@pytest.mark.parametrize(
    ("env", "redis_url", "workers"),
    [
        ("production", "", 1),  # un proceso: la memoria del proceso es exacta
        ("production", "redis://kv:6379", 4),  # compartido en Redis
        ("dev", "", 4),  # solo se avisa en producción
    ],
)
def test_no_avisa_si_el_limite_es_exacto(env, redis_url, workers):
    assert per_process_limits_warning(env=env, redis_url=redis_url, workers=workers) is None


# ── Fragmentos del RAG desfasados ──────────────────────────────────────────────


class _Embedder:
    fingerprint = "gemini:gemini-embedding-2:768:prefix-v1"

    def embed_batch(self, texts):  # pragma: no cover — el aviso nunca embebe
        raise AssertionError("el aviso del arranque no debe llamar al embedder")

    def embed_query(self, text):  # pragma: no cover
        raise AssertionError("el aviso del arranque no debe llamar al embedder")


class _Store:
    def __init__(self, by_model=None, error=None):
        self.by_model = by_model or {}
        self.error = error

    def count_by_embedding_model(self, *, upload_id=None):
        if self.error:
            raise self.error
        return dict(self.by_model)

    def stale_chunks(self, *a, **k):  # pragma: no cover
        raise AssertionError("solo cuenta")

    def update_embeddings(self, *a, **k):  # pragma: no cover
        raise AssertionError("solo cuenta")


class _Db:
    def __init__(self):
        self.rollbacks = 0

    def rollback(self):
        self.rollbacks += 1


@pytest.fixture(autouse=True)
def _rag_on(monkeypatch):
    monkeypatch.delenv("RAG_DISABLED", raising=False)


def test_avisa_con_el_comando_si_hay_fragmentos_de_otro_modelo():
    store = _Store(
        {
            _Embedder.fingerprint: 10,
            "gemini:gemini-embedding-2-preview:768:prefix-v1": 7,
            None: 3,
        }
    )
    with capture_logs() as logs:
        stale = reindex_notice.warn_if_stale_embeddings(_Db(), embedder=_Embedder(), store=store)
    assert stale == 10
    (entry,) = [e for e in logs if e["log_level"] == "warning"]
    assert entry["stale"] == 10 and entry["total"] == 20
    assert entry["active_embedder"] == _Embedder.fingerprint
    assert entry["reindex"].endswith("scripts/reindex_rag.py --apply")
    assert entry["dry_run"].endswith("scripts/reindex_rag.py")
    assert entry["by_model"]["(sin registrar)"] == 3


def test_calla_si_todo_esta_al_dia():
    store = _Store({_Embedder.fingerprint: 5})
    with capture_logs() as logs:
        stale = reindex_notice.warn_if_stale_embeddings(_Db(), embedder=_Embedder(), store=store)
    assert stale == 0
    assert not [e for e in logs if e["log_level"] == "warning"]


def test_no_comprueba_con_el_rag_apagado(monkeypatch):
    monkeypatch.setenv("RAG_DISABLED", "1")
    store = _Store(error=AssertionError("no debe consultar"))
    assert reindex_notice.warn_if_stale_embeddings(_Db(), embedder=_Embedder(), store=store) is None


def test_sin_embedder_no_comprueba(monkeypatch):
    def _sin_clave():
        raise EmbedderError("GEMINI_API_KEY is not set")

    monkeypatch.setattr("rag.infrastructure.embedders.get_embedder", _sin_clave)
    assert reindex_notice.warn_if_stale_embeddings(_Db(), store=_Store()) is None


def test_un_fallo_de_la_bd_no_tumba_el_arranque():
    db = _Db()
    store = _Store(error=RuntimeError("relation rag_chunks does not exist"))
    assert reindex_notice.warn_if_stale_embeddings(db, embedder=_Embedder(), store=store) is None
    assert db.rollbacks == 1


def test_la_purga_del_arranque_lanza_el_aviso(monkeypatch):
    import rag

    calls = []
    monkeypatch.setattr(rag, "_purge_expired_chunks", lambda db: calls.append("purge") or 4)
    monkeypatch.setattr(
        reindex_notice, "warn_if_stale_embeddings", lambda db: calls.append("check") or 0
    )
    assert rag.purge_expired(_Db()) == 4
    assert calls == ["purge", "check"]  # se cuenta después de purgar
