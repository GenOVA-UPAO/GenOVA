import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

from fastapi.testclient import TestClient

from auth.dependencies import get_current_user
from main import app
from ova.container import build_ova
from ova.domain.editor import EditorOva, EditorPhase, EditorVersion
from ova_engine.block_parser import parse_html_blocks


# ---------------------------------------------------------------- Block parser tests
def test_parse_html_blocks_explain():
    html = """
    <upao-header title="Auditoría en Oracle" eyebrow="LECTURA GUIADA">
      <p>Introducción a la lectura.</p>
    </upao-header>
    <section class="ova-card intro-card">
      <h2 class="card-title">Contexto</h2>
      <p class="card-body-text">Texto de introducción detallado.</p>
    </section>
    <upao-node number="1" title="Fundamento" label="Sección 1">
      <div class="sec-card sec-idea-card">
        <p class="sec-text">Idea central sobre auditoría.</p>
      </div>
      <div class="sec-card sec-ejemplo-card">
        <p class="sec-text">Ejemplo razonado en Oracle.</p>
      </div>
      <div class="sec-card sec-check-card">
        <p class="sec-question">¿Para qué sirve auditar?</p>
        <upao-reveal label="Comprobar">
          <div class="sec-model-ans"><p>Para verificar accesos.</p></div>
        </upao-reveal>
      </div>
    </upao-node>
    <upao-summary title="Síntesis">
      <p>Cierre de la lectura.</p>
      <upao-complete slot="actions" label="Finalizar"></upao-complete>
    </upao-summary>
    """
    blocks = parse_html_blocks(html)
    assert len(blocks) >= 5
    types = [b["tipo"] for b in blocks]
    assert "upao-header" in types
    assert "upao-example" in types
    assert "upao-question" in types
    assert "upao-summary" in types

    ex_block = next(b for b in blocks if b["tipo"] == "upao-example")
    assert "Ejemplo razonado" in ex_block["props"]["content"]


def test_parse_html_blocks_evaluate_quiz():
    html = """
    <upao-header eyebrow="QUIZ" title="Evaluación de ACID"></upao-header>
    <upao-question number="1" prompt="¿Qué significa la A de ACID?">
      <upao-choice group="q1" value="A" correct="true" feedback="Correcto">Atomicidad</upao-choice>
      <upao-choice group="q1" value="B" correct="false" feedback="Incorrecto">Anonimato</upao-choice>
    </upao-question>
    <upao-summary title="Fin">¡Buen trabajo!</upao-summary>
    """
    blocks = parse_html_blocks(html)
    assert len(blocks) == 3
    q_block = next(b for b in blocks if b["tipo"] == "upao-question")
    assert q_block["props"]["prompt"] == "¿Qué significa la A de ACID?"
    assert len(q_block["props"]["choices"]) == 2
    assert q_block["props"]["choices"][0]["value"] == "A"
    assert q_block["props"]["choices"][0]["correct"] is True


def test_parse_html_blocks_empty():
    assert parse_html_blocks("") == []
    assert parse_html_blocks("   ") == []


# ---------------------------------------------------------------- Endpoint tests
class FakeUser:
    def __init__(self, user_id: str, is_admin: bool = False):
        self.id = uuid.UUID(user_id)
        self.admin_flag_cached = is_admin


class FakeRepo:
    def __init__(self, ova: EditorOva | None, active_version: EditorVersion | None, phase: EditorPhase | None):
        self._ova = ova
        self._active = active_version
        self._phase = phase

    def get_ova(self, ova_id: str):
        if self._ova and self._ova.id == ova_id:
            return self._ova
        return None

    def get_or_create_active_version(self, ova: EditorOva):
        return self._active

    def get_phase(self, phase_id: str, version_id: str):
        if self._phase and self._phase.id == phase_id:
            return self._phase
        return None

    def list_micro_versions(self, phase_id: str, ova_id: str):
        return []


def test_get_phase_blocks_owner_success():
    owner_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())

    sample_html = """
    <upao-header title="Recurso de prueba" eyebrow="EXPLAIN"></upao-header>
    <upao-question number="1" prompt="Pregunta 1">
      <upao-choice group="q1" value="A" correct="true" feedback="Bien">Opción A</upao-choice>
    </upao-question>
    """
    ova = EditorOva(id=ova_id, owner_id=owner_id, title="Test OVA", status="borrador", description="")
    phase = EditorPhase(
        id=phase_id,
        phase_type="explain",
        phase_order=1,
        content=sample_html,
        regenerated=False,
        resource_type_id=2,
        title="Lectura",
    )
    version = EditorVersion(
        id=version_id,
        version_number=1,
        prompt="",
        is_active=True,
        created_at=None,
        phases=(phase,),
    )
    repo = FakeRepo(ova, version, phase)

    from ova.application.use_cases.phase_versions import PhaseVersions
    fake_uc = type("FakeUC", (), {
        "phase_versions": PhaseVersions(repo),
    })()

    app.dependency_overrides[get_current_user] = lambda: FakeUser(owner_id, is_admin=False)
    app.dependency_overrides[build_ova] = lambda: fake_uc

    try:
        client = TestClient(app)
        res = client.get(f"/api/ovas/{ova_id}/fases/{phase_id}/bloques")
        assert res.status_code == 200
        blocks = res.json()
        assert len(blocks) == 2
        assert blocks[0]["tipo"] == "upao-header"
        assert blocks[1]["tipo"] == "upao-question"
    finally:
        app.dependency_overrides.clear()


def test_get_phase_blocks_forbidden_for_other_user():
    owner_id = str(uuid.uuid4())
    other_user_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())

    ova = EditorOva(id=ova_id, owner_id=owner_id, title="Test OVA", status="borrador", description="")
    phase = EditorPhase(
        id=phase_id,
        phase_type="explain",
        phase_order=1,
        content="<p>Texto</p>",
        regenerated=False,
        resource_type_id=2,
        title="Lectura",
    )
    version = EditorVersion(
        id=version_id,
        version_number=1,
        prompt="",
        is_active=True,
        created_at=None,
        phases=(phase,),
    )
    repo = FakeRepo(ova, version, phase)

    from ova.application.use_cases.phase_versions import PhaseVersions
    fake_uc = type("FakeUC", (), {
        "phase_versions": PhaseVersions(repo),
    })()

    app.dependency_overrides[get_current_user] = lambda: FakeUser(other_user_id, is_admin=False)
    app.dependency_overrides[build_ova] = lambda: fake_uc

    try:
        client = TestClient(app)
        res = client.get(f"/api/ovas/{ova_id}/fases/{phase_id}/bloques")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_get_phase_blocks_not_found():
    user_id = str(uuid.uuid4())
    ova_id = str(uuid.uuid4())
    phase_id = str(uuid.uuid4())

    repo = FakeRepo(None, None, None)

    from ova.application.use_cases.phase_versions import PhaseVersions
    fake_uc = type("FakeUC", (), {
        "phase_versions": PhaseVersions(repo),
    })()

    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id, is_admin=False)
    app.dependency_overrides[build_ova] = lambda: fake_uc

    try:
        client = TestClient(app)
        res = client.get(f"/api/ovas/{ova_id}/fases/{phase_id}/bloques")
        assert res.status_code == 404
    finally:
        app.dependency_overrides.clear()
