"""Subidas temporales: cada lista es de su contexto y la ingesta RAG va aparte.

Antes los adjuntos del chat del editor aparecían en «Archivos» de /crear (y se
colaban en el siguiente OVA) porque compartían una única lista temporal, y la
ingesta se hacía dentro de la petición, sin un estado «indexando» que enseñar.
"""

import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from uploads.application.dto import IncomingFile, RagStatus
from uploads.application.use_cases import ClaimUploads, IngestUpload, ListUploads, UploadFiles
from uploads.domain.errors import TooManyFiles
from uploads.infrastructure import in_memory_store as store
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository

PDF = b"%PDF-1.4\n%fake\n"
USER = "user-1"
OVA = str(uuid.uuid4())


@pytest.fixture(autouse=True)
def _clean_registry(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    store.registry().clear()
    yield
    store.registry().clear()


class _Limits:
    def max_files_per_request(self):
        return 2

    def max_file_size_bytes(self):
        return 1024 * 1024

    def max_file_size_mb(self):
        return 1


class _Rag:
    def __init__(self, enabled=True, result=None, boom=False):
        self.enabled = enabled
        self.result = result or RagStatus(status="indexed", chunks=3)
        self.boom = boom
        self.calls = []

    def is_enabled(self):
        return self.enabled

    def ingest(self, **kw):
        self.calls.append(kw)
        if self.boom:
            raise RuntimeError("caído")
        return self.result


def _pdf(name="apunte.pdf"):
    return IncomingFile(filename=name, content_type="application/pdf", content=PDF)


def _upload(repo, rag, ova_id=None, n=1):
    return UploadFiles(repo, rag, _Limits()).execute(
        USER, [_pdf(f"f{i}.pdf") for i in range(n)], ova_id
    )


def test_la_subida_queda_en_processing_y_pendiente_de_indexar():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    out = _upload(repo, rag)
    assert out.items[0].rag_status == {"status": "processing", "chunks": 0}
    assert out.pending_ingestion == [out.items[0].upload_id]
    assert rag.calls == []  # nada de embeddings dentro de la petición


def test_con_rag_desactivado_no_queda_pendiente():
    repo = InMemoryTempUploadRepository()
    out = _upload(repo, _Rag(enabled=False))
    assert out.items[0].rag_status["status"] == "disabled"
    assert out.pending_ingestion == []


def test_cada_lista_ve_solo_lo_suyo():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    crear = _upload(repo, rag).items[0]
    chat = _upload(repo, rag, ova_id=OVA).items[0]
    lista = ListUploads(repo)
    assert [v.upload_id for v in lista.execute(USER)] == [crear.upload_id]
    assert [v.upload_id for v in lista.execute(USER, OVA)] == [chat.upload_id]
    assert lista.execute(USER, str(uuid.uuid4())) == []


def test_el_tope_de_archivos_es_por_lista():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    _upload(repo, rag, n=2)
    # La lista de crear está llena, pero el chat del OVA tiene su propio hueco.
    assert len(_upload(repo, rag, ova_id=OVA, n=2).items) == 2
    with pytest.raises(TooManyFiles):
        _upload(repo, rag)


def test_ingesta_en_segundo_plano_deja_el_resultado_en_la_subida():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    item = _upload(repo, rag).items[0]
    status = IngestUpload(repo, rag).execute(USER, item.upload_id)
    assert status.status == "indexed"
    assert repo.get(item.upload_id, USER).rag_status == {"status": "indexed", "chunks": 3}
    assert rag.calls[0]["filename"] == "f0.pdf"


@pytest.mark.parametrize(
    ("result", "fragment"),
    [
        (RagStatus(status="skipped", reason="empty_text"), "No se encontró texto"),
        (RagStatus(status="failed", reason="embedder_unavailable"), "no está disponible"),
        (RagStatus(status="failed", reason="parse_error"), "No se pudo leer"),
    ],
)
def test_un_fallo_de_ingesta_lleva_motivo_legible(result, fragment):
    repo, rag = InMemoryTempUploadRepository(), _Rag(result=result)
    item = _upload(repo, rag).items[0]
    IngestUpload(repo, rag).execute(USER, item.upload_id)
    saved = repo.get(item.upload_id, USER).rag_status
    assert saved["status"] == result.status
    assert saved["reason"] == result.reason
    assert fragment in saved["message"]


def test_una_excepcion_en_la_ingesta_no_se_escapa():
    repo, rag = InMemoryTempUploadRepository(), _Rag(boom=True)
    item = _upload(repo, rag).items[0]
    status = IngestUpload(repo, rag).execute(USER, item.upload_id)
    assert status.status == "error"
    assert "no pudo indexarse" in repo.get(item.upload_id, USER).rag_status["message"]


def test_reclamar_saca_de_la_lista_y_liga_al_ova():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    mine = _upload(repo, rag).items[0]
    claimed = ClaimUploads(repo).execute(USER, [mine.upload_id], OVA)
    assert [v.upload_id for v in claimed] == [mine.upload_id]
    assert claimed[0].ova_id == OVA
    assert ListUploads(repo).execute(USER) == []
    assert ListUploads(repo).execute(USER, OVA) == []  # ya no está pendiente en el chat


def test_no_se_reclaman_subidas_ajenas():
    repo, rag = InMemoryTempUploadRepository(), _Rag()
    mine = _upload(repo, rag).items[0]
    assert ClaimUploads(repo).execute("otro", [mine.upload_id], OVA) == []
    assert len(ListUploads(repo).execute(USER)) == 1


def test_router_filtra_por_ova_y_lanza_la_ingesta_despues(monkeypatch):
    from auth.dependencies import get_current_user
    from uploads.container import UploadsUseCases, build_uploads
    from uploads.interface.http import router as http

    repo, rag = InMemoryTempUploadRepository(), _Rag()
    background = []
    monkeypatch.setattr(
        http, "run_background_ingestion", lambda uid, ids: background.append((uid, ids))
    )
    app = FastAPI()
    app.include_router(http.router, prefix="/api/uploads")
    app.dependency_overrides[get_current_user] = lambda: type("U", (), {"id": USER})()
    app.dependency_overrides[build_uploads] = lambda: UploadsUseCases(
        ListUploads(repo), UploadFiles(repo, rag, _Limits()), None
    )
    client = TestClient(app)

    res = client.post(
        f"/api/uploads/temp?ova_id={OVA}",
        files={"files": ("apunte.pdf", PDF, "application/pdf")},
    )
    assert res.status_code == 200
    item = res.json()["items"][0]
    assert item["ova_id"] == OVA and item["rag_status"]["status"] == "processing"
    assert background == [(USER, [item["upload_id"]])]
    assert client.get("/api/uploads/temp").json()["items"] == []
    assert len(client.get(f"/api/uploads/temp?ova_id={OVA}").json()["items"]) == 1
    assert client.get("/api/uploads/temp?ova_id=no-es-uuid").status_code == 422


def test_crear_job_solo_usa_archivos_propios_y_los_liga_al_ova():
    from uuid import uuid4

    from generation.application.dto import CreateJobInput
    from generation.application.use_cases.create_job import CreateJob

    ova_id, created, bound = uuid4(), {}, []

    class Repo:
        def create(self, **kwargs):
            created.update(kwargs)
            return type("Job", (), {"id": uuid4(), "ova_id": ova_id})()

    class References:
        def owned(self, user_id, upload_ids):
            return [u for u in upload_ids if u != "ajeno"]

        def bind_to_ova(self, user_id, upload_ids, ova):
            bound.append((upload_ids, ova))

    uc = CreateJob(
        repo=Repo(),
        images=type("I", (), {"resolve": lambda self, **k: {}})(),
        launcher=type("L", (), {"launch": lambda self, *a, **k: None})(),
        guardrail=type("G", (), {"assert_allowed": lambda self, *a: None})(),
        references=References(),
    )
    uc.execute(
        CreateJobInput(
            user_id=uuid4(), prompt="tema", resource_plan=[], upload_ids=["mio", "ajeno"]
        )
    )
    assert created["params"]["upload_ids"] == ["mio"]
    assert bound == [(["mio"], str(ova_id))]


def test_un_docx_real_pasa_la_verificacion_de_firma():
    """filetype 1.2 identifica el DOCX por su tipo Office, no como zip genérico."""
    import io

    from docx import Document

    from uploads.domain.policies import magic_bytes_ok

    buf = io.BytesIO()
    Document().save(buf)
    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert magic_bytes_ok(docx_mime, buf.getvalue())
    assert not magic_bytes_ok(docx_mime, PDF)
