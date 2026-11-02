"""El parche del Editor de Coherencia 5E llega a la fila del job (y al OVA entregado).

resource_worker ya dejó la fila `done` con su HTML; la reconciliación final salta
las filas `done` y la materialización lee `content` de la fila, así que un parche
que solo cambiaba el estado de LangGraph se perdía.
"""

import json
import uuid

import pytest
from sqlalchemy.orm import sessionmaker

import prometheus.config.nodes_config as nodes_config
import prometheus.engine.runtime as runtime
import prometheus.nodes.editor as editor_mod
from models import OvaJob, OvaJobResource
from tests._sqlite_db import make_session


@pytest.fixture()
def db(monkeypatch):
    session = make_session(OvaJob.__table__, OvaJobResource.__table__)
    monkeypatch.setattr(runtime, "SessionLocal", sessionmaker(bind=session.get_bind()))
    yield session
    session.close()


def _job_with_done_resource(db, html):
    job = OvaJob(id=uuid.uuid4(), user_id=uuid.uuid4(), status="running", params={})
    resource = OvaJobResource(
        id=uuid.uuid4(),
        job_id=job.id,
        phase_type="explore",
        phase_order=2,
        resource_type="2",
        resource_order=0,
        status="done",
        content=html,
    )
    db.add_all([job, resource])
    db.commit()
    return job.id, resource.id


def test_editor_persiste_el_parche_en_la_fila_done(db, monkeypatch):
    html = "<p>La foo del ciclo del agua</p>"
    job_id, resource_id = _job_with_done_resource(db, html)
    monkeypatch.setattr(nodes_config, "get_nodes_config", lambda: {"ova_editor": "1"})
    patch = {"phase": "explore", "buscar": "foo", "reemplazar": "bar"}
    monkeypatch.setattr(
        editor_mod,
        "generar_texto",
        lambda *a, **k: json.dumps({"hallazgos": ["analogía"], "parches": [patch]}),
    )
    state = {
        "job_id": str(job_id),
        "results": [{"phase": "explore", "resource_type": 2, "title": "T", "html": html}],
        "phase_order": ["engage", "explore"],
    }

    out = editor_mod.editor_node(state)

    assert out["coherence_report"]["parches"] == [patch]
    db.expire_all()
    row = db.get(OvaJobResource, resource_id)
    assert row.content == "<p>La bar del ciclo del agua</p>"
    assert row.status == "done"


def test_apply_patches_devuelve_solo_los_recursos_cambiados():
    results = [
        {"phase": "engage", "resource_type": 1, "html": "<p>uno</p>"},
        {"phase": "explore", "resource_type": 2, "html": "<p>dos</p>"},
    ]
    changed = editor_mod._apply_patches(
        results,
        [
            {"phase": "explore", "buscar": "dos", "reemplazar": "DOS"},
            {"phase": "engage", "buscar": "no-esta", "reemplazar": "x"},
        ],
    )
    assert changed == [results[1]]
    assert results[1]["html"] == "<p>DOS</p>"
