"""Video tardío en la base de datos: sustituir el aviso, SCORM y reanudar al arrancar.

SQLite en memoria con DDL manual (mismo patrón que test_jobs_sweep); el
sumidero abre sus propias sesiones con `core.database.SessionLocal`, que aquí
apunta a esa base.
"""

import os
import sys
import time
import uuid
from io import BytesIO
from zipfile import ZipFile

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from generation.infrastructure import late_video, late_video_scorm  # noqa: E402
from llm.images import video_late  # noqa: E402
from llm.images.video_embed import video_figure  # noqa: E402
from llm.images.video_placeholder import (  # noqa: E402
    MARK_ATTR,
    pending_placeholder,
    unavailable_placeholder,
)
from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion  # noqa: E402

_DDL = """
CREATE TABLE ovas (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador', file_path TEXT, storage_key TEXT,
  current_version_id TEXT, deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE ova_versions (
  id TEXT PRIMARY KEY, ova_id TEXT NOT NULL, version_number INTEGER NOT NULL,
  prompt TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_phases (
  id TEXT PRIMARY KEY, version_id TEXT NOT NULL, phase_type VARCHAR(30) NOT NULL,
  phase_order INTEGER NOT NULL, content TEXT NOT NULL, regenerated BOOLEAN NOT NULL DEFAULT 0,
  resource_type_id INTEGER, title VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_jobs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ova_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  prompt TEXT NOT NULL DEFAULT '', params TEXT NOT NULL DEFAULT '{}',
  rag_context TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP, finished_at TIMESTAMP
);
CREATE TABLE ova_job_resources (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL, phase_type VARCHAR(30) NOT NULL,
  phase_order INTEGER NOT NULL, resource_type VARCHAR(40), resource_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  error_id TEXT, defect_reason TEXT, ova_phase_id TEXT, content TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

JOB = "job-late-1"
STARTED = time.time() - 300
VIDEO = video_figure("data:video/mp4;base64,AAAAGGZ0eXBtcDQy", provider="openrouter", model_id="m")


def _html(job_id=JOB):
    return (
        "<!doctype html><html><body><upao-header>T</upao-header>"
        f"{pending_placeholder(job_id, STARTED, 'openrouter', 'google/veo-3.1-lite')}"
        "<p>guion</p></body></html>"
    )


@pytest.fixture()
def db(monkeypatch, tmp_path):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    with engine.begin() as conn:
        for stmt in _DDL.split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr("core.database.SessionLocal", factory)
    monkeypatch.setenv("OVA_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr("storage.is_configured", lambda: False)
    late_video._related.clear()
    session = factory()
    yield session
    session.close()
    engine.dispose()


def _ova(db, *, status="listo", content=None, old_content=None, job_status="done"):
    """OVA con versión 1 (vieja) y 2 (actual), un job y su recurso con el aviso."""
    user = uuid.uuid4()
    ova = Ova(id=uuid.uuid4(), user_id=user, title="Ciclo del agua", status=status)
    v1 = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="p", is_active=False)
    v2 = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=2, prompt="p", is_active=True)
    ova.current_version_id = v2.id
    db.add_all([ova, v1, v2])
    for version, html in ((v1, old_content or _html()), (v2, content or _html())):
        db.add(OvaPhase(id=uuid.uuid4(), version_id=version.id, phase_type="engage", phase_order=1,
                        content=html, title="Video"))
        db.add(OvaPhase(id=uuid.uuid4(), version_id=version.id, phase_type="explore", phase_order=2,
                        content="<p>otro</p>", title="Otro"))
    job = OvaJob(id=uuid.uuid4(), user_id=user, ova_id=ova.id, status=job_status, params={})
    db.add(job)
    db.add(OvaJobResource(id=uuid.uuid4(), job_id=job.id, phase_type="engage", phase_order=1,
                          resource_type="2", status="done", content=_html()))
    db.commit()
    return ova.id, v1.id, v2.id, job.id


def _contents(db, model):
    db.expire_all()
    return [r.content for r in db.query(model).all()]


def test_sustituye_el_aviso_en_el_recurso_y_en_todas_las_versiones(db):
    ova_id, _, v2, _ = _ova(db)

    report = late_video.apply_late_video(JOB, STARTED, VIDEO)

    assert report == video_late.ApplyReport(3, busy=False)
    assert all(MARK_ATTR not in c for c in _contents(db, OvaPhase) + _contents(db, OvaJobResource))
    assert sum(VIDEO in c for c in _contents(db, OvaPhase)) == 2
    # El SCORM de la versión actual se reconstruye con el video como archivo.
    ova = db.get(Ova, ova_id)
    assert ova.file_path and ova.file_path.endswith(f"{ova_id}_v2.zip")
    z = ZipFile(ova.file_path)
    assert z.read("resources/media/recurso_1_video_1.mp4").startswith(b"\x00\x00\x00\x18ftyp")
    page = z.read("resources/recurso_1.html").decode()
    assert 'src="media/recurso_1_video_1.mp4"' in page and MARK_ATTR not in page


def test_el_aviso_definitivo_tambien_se_entrega(db):
    _ova(db)
    assert late_video.apply_late_video(JOB, STARTED, unavailable_placeholder()).replaced == 3
    assert all("no está disponible" in c for c in _contents(db, OvaJobResource))


def test_si_el_docente_quito_el_aviso_no_se_toca_su_trabajo(db):
    editado = "<body><p>Mi versión editada, sin aviso</p></body>"
    ova_id, _, _, _ = _ova(db, content=editado, old_content=editado)
    db.query(OvaJobResource).update({"content": editado})
    db.commit()

    report = late_video.apply_late_video(JOB, STARTED, VIDEO)

    assert report.replaced == 0
    assert set(_contents(db, OvaJobResource)) == {editado}
    assert editado in _contents(db, OvaPhase)
    assert db.get(Ova, ova_id).file_path is None  # SCORM sin tocar


def test_solo_el_aviso_de_ese_trabajo(db):
    _ova(db, content=_html("job-otro"), old_content=_html("job-otro"))
    assert late_video.apply_late_video(JOB, STARTED, VIDEO).replaced == 1  # solo el recurso del job
    assert all('data-ova-video-pending="job-otro"' in c for c in _contents(db, OvaPhase) if "guion" in c)


def test_un_job_en_marcha_sigue_escribiendo(db):
    _ova(db, job_status="running")
    assert late_video.apply_late_video(JOB, STARTED, VIDEO).busy is True
    # Aunque el aviso ya no esté, el job sigue en marcha: se sigue entregando.
    assert late_video.apply_late_video(JOB, STARTED, VIDEO) == video_late.ApplyReport(0, busy=True)


def test_regenerando_no_se_rehace_el_scorm_y_se_sigue_entregando(db):
    ova_id, _, _, _ = _ova(db, status="generando")
    report = late_video.apply_late_video(JOB, STARTED, VIDEO)
    assert report.busy is True and report.replaced == 3
    assert db.get(Ova, ova_id).file_path is None


def test_filas_anteriores_al_encargo_no_se_miran(db):
    _ova(db)
    # Un video «encargado» dentro de 2 h: ninguna fila existente es posterior.
    assert late_video.apply_late_video(JOB, time.time() + 7200, VIDEO).replaced == 0


def test_el_scorm_se_repite_si_el_docente_edita_mientras_se_construye(db, monkeypatch):
    ova_id, _, v2, _ = _ova(db)
    late_video.apply_late_video(JOB, STARTED, VIDEO)
    from ova.application import scorm_persist

    real = scorm_persist.persist_scorm_zip
    llamadas = []

    def persist(zip_bytes, user_id, ova_id_, version):
        llamadas.append(zip_bytes)
        if len(llamadas) == 1:  # edición concurrente del docente
            db.query(OvaPhase).filter(OvaPhase.version_id == v2, OvaPhase.phase_order == 2).update(
                {"content": "<p>editado por el docente</p>"}
            )
            db.commit()
        return real(zip_bytes, user_id, ova_id_, version)

    monkeypatch.setattr(scorm_persist, "persist_scorm_zip", persist)
    assert late_video_scorm.rebuild_current_scorm(v2) is True
    assert len(llamadas) == 2
    z = ZipFile(BytesIO(llamadas[-1]))
    assert "editado por el docente" in z.read("resources/recurso_2.html").decode()


def test_al_arrancar_se_reanudan_los_avisos_pendientes(db, monkeypatch):
    _ova(db)
    reanudados = []
    monkeypatch.setattr(video_late, "resume", lambda marker, key: reanudados.append((marker, key)) or True)
    monkeypatch.setattr("llm.images.video_generation.key_for", lambda provider, owner: f"clave-de-{owner}")

    assert late_video.recover_late_videos() == 1  # mismo trabajo en 3 filas: una espera
    ((marker, key),) = reanudados
    assert (marker.job_id, marker.provider, marker.model_id) == (JOB, "openrouter", "google/veo-3.1-lite")
    assert marker.started_at == int(STARTED)
    assert key.startswith("clave-de-")


def test_un_aviso_simulado_se_reanuda_sin_clave(db, monkeypatch):
    _ova(db, content=_html("fake-abc"), old_content=_html("fake-abc"))
    reanudados = []
    monkeypatch.setattr(video_late, "resume", lambda marker, key: reanudados.append((marker.job_id, key)) or True)
    monkeypatch.setattr("llm.images.video_generation.key_for", lambda *a: "sk-real")
    assert late_video.recover_late_videos() == 2  # el del recurso del job y el simulado
    assert ("fake-abc", None) in reanudados  # un id simulado nunca recibe clave
    assert (JOB, "sk-real") in reanudados


def test_el_sumidero_se_registra_en_video_late():
    late_video.install_late_video()
    try:
        assert video_late._sink is late_video.apply_late_video
    finally:
        video_late.install_sink(None)
