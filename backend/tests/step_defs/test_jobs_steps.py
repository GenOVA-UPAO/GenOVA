"""EN-013 — BDD steps for job persistence + the background runner.

Runs against a single in-memory SQLite DB shared across sessions (StaticPool) so
the runner's own `SessionLocal()` writes and the test's reads see the same rows —
mirroring "client disconnects, generation keeps going server-side". The LLM agent
(`regen_agents.regenerate_phase_content`) is monkeypatched, so no provider call
happens. The runner is invoked synchronously (`run_job`) for deterministic state.

`DATABASE_URL` is set to SQLite *before* importing `database`/`models` so the app
binds to a throwaway engine; we then point `SessionLocal` at the shared one.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest  # noqa: E402
from pytest_bdd import given, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import models  # noqa: E402, F401  — registers ORM tables on the shared metadata
from generation.jobs_helpers import job_to_dict  # noqa: E402
from generation import jobs_runner, jobs_service  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-013_jobs.feature")

# SQLite-compatible DDL (Postgres uses migration 019 + gen_random_uuid()).
_DDL = """
CREATE TABLE ova_jobs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ova_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued', prompt TEXT NOT NULL DEFAULT '',
  params TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP, finished_at TIMESTAMP
);
CREATE TABLE ova_job_resources (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL, phase_type VARCHAR(30) NOT NULL,
  phase_order INTEGER NOT NULL, resource_type VARCHAR(40),
  resource_order INTEGER NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0, error_id TEXT, ova_phase_id TEXT, content TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_error_logs (
  error_id TEXT PRIMARY KEY, ova_id TEXT, job_id TEXT, job_resource_id TEXT,
  user_id TEXT, error_category VARCHAR(20) NOT NULL DEFAULT 'other',
  message TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ovas (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT, status VARCHAR(20) NOT NULL DEFAULT 'borrador',
  file_path TEXT, storage_key TEXT, current_version_id TEXT, deleted_at TIMESTAMP,
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
"""

_SECRET = "sk-livesecret0123456789ABCDEFghijklmnop"


@pytest.fixture
def engine():
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    return eng


@pytest.fixture
def Sess(engine, monkeypatch):
    factory = sessionmaker(bind=engine, future=True)
    # The runner creates its OWN session via SessionLocal — point it at our DB.
    monkeypatch.setattr(jobs_runner, "SessionLocal", factory)
    # B2 materialization builds + stores a SCORM zip; skip the (disk/storage) I/O
    # in unit tests — we assert the Ova/OvaPhase rows, not the zip bytes.
    from ova import jobs_materialize

    monkeypatch.setattr(jobs_materialize, "_persist_scorm", lambda *a, **k: None)
    return factory


@pytest.fixture
def db(Sess):
    session = Sess()
    try:
        yield session
    finally:
        session.close()


def _stub_agent(monkeypatch, behavior):
    """Replace the LLM agent: `behavior(phase_type, rtype, concept) -> html|raise`.

    The real `regenerate_phase_content` takes extra `llm_config` and `enabled_models`
    args (per-user model overrides); the wrapper absorbs them so stubs stay 3-arg.
    """
    from ova import jobs_runner_exec

    def wrapper(phase_type, rtype, concept, llm_config=None, enabled_models=None):
        return behavior(phase_type, rtype, concept)

    monkeypatch.setattr(jobs_runner_exec.regen_agents, "regenerate_phase_content", wrapper)


def _make_job(db, *, user_id, resources, status="queued"):
    job = jobs_service.create_job(
        db, user_id=user_id, prompt="redes neuronales", params={}, resources=resources
    )
    job.status = status
    db.commit()
    return job


# Real ENGAGE resource names (prometheus.prompts.engage_prompts.RECURSOS_META) so the runner
# resolves each to its numeric id (1, 2, 3) exactly as in production.
_ENGAGE_NAMES = ["Cómic Interactivo", "Storyboard de Video", "Micro-Podcast"]
_FAILING_NAME = "Storyboard de Video"  # ENGAGE id 2


def _engage_plan(n):
    return [
        {
            "phase_type": "engage",
            "phase_order": i + 1,
            "resource_type": _ENGAGE_NAMES[i % len(_ENGAGE_NAMES)],
            "resource_order": 0,
        }
        for i in range(n)
    ]


# Scenario 1: generación continúa pese a desconexión (R3, R4, R5)
@scenario(FEATURE, "La generación continúa aunque el cliente se desconecte")
def test_continua_tras_desconexion():
    pass


@given("un usuario autenticado inicia la generación de un OVA con 2 fases", target_fixture="ctx")
def inicia_generacion():
    return {"user_id": uuid.uuid4()}


@given('el servidor crea un job con sus recursos "pending"')
def crea_job(db, ctx, monkeypatch):
    _stub_agent(monkeypatch, lambda pt, rt, c: f"<html>{pt}-{rt}</html>")
    ctx["job"] = _make_job(db, user_id=ctx["user_id"], resources=_engage_plan(2))


@when("el runner ejecuta el job en background mientras el cliente está desconectado")
def runner_ejecuta(db, ctx):
    jobs_runner.run_job(ctx["job"].id)


@when("el cliente vuelve a consultar el estado del job más tarde")
def cliente_consulta(db, ctx):
    db.expire_all()
    ctx["job_fetched"] = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])


@then("el job refleja las fases completadas durante la desconexión")
def job_refleja_completadas(db, ctx):
    job = ctx["job_fetched"]
    assert job.status == "done"
    resources = jobs_service.list_resources(db, job.id)
    assert all(r.status == "done" for r in resources)


@then("el contenido de cada recurso quedó persistido en la base de datos")
def contenido_persistido(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    assert all(r.content and r.content.strip() for r in resources)


# Scenario 2: un recurso falla sin abortar el resto (R6)
@scenario(FEATURE, "Un recurso falla sin abortar el resto")
def test_recurso_falla_sin_abortar():
    pass


@given("un job de generación con 3 recursos donde el segundo falla siempre", target_fixture="ctx")
def job_con_fallo(db, monkeypatch):
    user_id = uuid.uuid4()

    def agent(phase_type, rtype, concept):
        if rtype == 2:  # the second resource maps to "Storyboard de Video" → ENGAGE id 2
            raise RuntimeError("provider 500 internal error")
        return f"<html>{rtype}</html>"

    _stub_agent(monkeypatch, agent)
    job = _make_job(db, user_id=user_id, resources=_engage_plan(3))
    return {"user_id": user_id, "job": job}


@when("el runner ejecuta el job")
def runner_ejecuta_2(db, ctx):
    jobs_runner.run_job(ctx["job"].id)
    db.expire_all()


@then('el recurso que falla queda en estado "error" con un error_id')
def recurso_falla_error_id(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    failed = [r for r in resources if r.resource_type == _FAILING_NAME]
    assert len(failed) == 1
    assert failed[0].status == "error"
    assert failed[0].error_id is not None
    uuid.UUID(str(failed[0].error_id))


@then('los otros recursos quedan "done"')
def otros_done(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    done = [r for r in resources if r.resource_type != _FAILING_NAME]
    assert done and all(r.status == "done" for r in done)


@then('el job termina "done" porque al menos un recurso quedó listo')
def job_done(db, ctx):
    job = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])
    assert job.status == "done"


@then('el contenido de los recursos "done" quedó persistido')
def contenido_done_persistido(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    for r in resources:
        if r.status == "done":
            assert r.content and r.content.strip()


# Scenario 3: reintentos hasta agotar (R6)
@scenario(FEATURE, "Reintenta el recurso hasta agotar los intentos")
def test_reintentos():
    pass


@given("un job con un recurso que falla siempre", target_fixture="ctx")
def job_falla_siempre(db, monkeypatch):
    user_id = uuid.uuid4()
    calls = {"n": 0}

    def agent(phase_type, rtype, concept):
        calls["n"] += 1
        raise RuntimeError("always down")

    _stub_agent(monkeypatch, agent)
    job = _make_job(db, user_id=user_id, resources=_engage_plan(1))
    return {"user_id": user_id, "job": job, "calls": calls}


@then("el recurso registra el máximo de intentos")
def maximo_intentos(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    assert resources[0].attempts == jobs_runner.MAX_ATTEMPTS
    assert ctx["calls"]["n"] == jobs_runner.MAX_ATTEMPTS


@then('queda "error" con un error_id')
def queda_error(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    assert resources[0].status == "error"
    assert resources[0].error_id is not None


# Scenario 4: reanudar solo pending/error (R7)
@scenario(FEATURE, "Reanudar continúa solo las fases pendientes")
def test_reanudar_solo_pendientes():
    pass


@given('un job "interrupted" con un recurso "done" y dos "pending"', target_fixture="ctx")
def job_interrupted(db):
    user_id = uuid.uuid4()
    job = _make_job(db, user_id=user_id, resources=_engage_plan(3), status="interrupted")
    resources = jobs_service.list_resources(db, job.id)
    resources[0].status = "done"
    resources[0].content = "<html>done</html>"
    db.commit()
    return {"user_id": user_id, "job": job, "done_id": resources[0].id}


@when("se solicitan los recursos reanudables del job", target_fixture="resumable")
def solicita_reanudables(db, ctx):
    return jobs_service.resumable_resource_ids(db, ctx["job"].id)


@then('solo se listan los recursos "pending"')
def solo_pending(db, ctx, resumable):
    assert len(resumable) == 2


@then('el recurso "done" no se incluye')
def done_excluido(ctx, resumable):
    assert ctx["done_id"] not in resumable


# Scenario 5: barrido perezoso interrupted (R7)
@scenario(FEATURE, "Un job running sin progreso reciente se marca interrupted")
def test_barrido_interrupted():
    pass


@given('un job "running" cuyo progreso quedó obsoleto', target_fixture="ctx")
def job_stale(db):
    from datetime import timedelta

    user_id = uuid.uuid4()
    job = _make_job(db, user_id=user_id, resources=_engage_plan(1), status="running")
    stale = jobs_service._now() - timedelta(seconds=jobs_service.STALE_AFTER_SECONDS + 60)
    job.updated_at = stale
    db.commit()
    return {"user_id": user_id, "job": job}


@when("el dueño consulta el estado del job", target_fixture="fetched")
def dueno_consulta(db, ctx):
    db.expire_all()
    return jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])


@then('el job pasa a "interrupted"')
def pasa_interrupted(fetched):
    assert fetched.status == "interrupted"


# Scenario 6: el estado no filtra detalles sensibles (R8)
@scenario(FEATURE, "El estado no filtra detalles sensibles")
def test_no_filtra_sensibles():
    pass


@given("un recurso que falló por un error interno del proveedor LLM", target_fixture="ctx")
def recurso_fallo_sensible(db, monkeypatch):
    user_id = uuid.uuid4()

    def agent(phase_type, rtype, concept):
        raise RuntimeError(f"auth failed api_key={_SECRET} Bearer {_SECRET}")

    _stub_agent(monkeypatch, agent)
    job = _make_job(db, user_id=user_id, resources=_engage_plan(1))
    jobs_runner.run_job(job.id)
    db.expire_all()
    return {"user_id": user_id, "job": job}


@when("se serializa el estado del job para el cliente", target_fixture="payload")
def serializa_estado(db, ctx):
    job = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])
    resources = jobs_service.list_resources(db, job.id)
    return job_to_dict(job, resources)


@then("la respuesta incluye status y error_id por recurso")
def incluye_status_error_id(payload):
    assert payload["status"] in ("done", "error", "interrupted")
    for r in payload["resources"]:
        assert "status" in r
        assert "error_id" in r


@then("no incluye el contenido, el mensaje de excepción interno ni credenciales")
def no_incluye_sensibles(payload):
    import json

    blob = json.dumps(payload)
    assert _SECRET not in blob
    assert "Bearer" not in blob
    assert "content" not in payload["resources"][0]
    # The error message never travels to the client — only the opaque error_id.
    assert "provider" not in blob.lower() or "auth failed" not in blob


# Scenario 7: solo el dueño consulta su job (R8)
@scenario(FEATURE, "Solo el dueño puede consultar su job")
def test_solo_dueno():
    pass


@given("un job creado por un usuario", target_fixture="ctx")
def job_de_usuario(db):
    user_id = uuid.uuid4()
    job = _make_job(db, user_id=user_id, resources=_engage_plan(1))
    return {"user_id": user_id, "job": job}


@when("otro usuario distinto intenta consultarlo", target_fixture="other_result")
def otro_usuario_consulta(db, ctx):
    return jobs_service.get_job(db, ctx["job"].id, uuid.uuid4())


@then("el servicio no devuelve el job")
def no_devuelve_job(other_result):
    assert other_result is None


# Scenario 8 (HU-022/B1): el plan crea una fila por recurso elegido (Gap D)
@scenario(FEATURE, "El plan de recursos crea una fila por recurso elegido")
def test_plan_recurso_por_fila():
    pass


@given("el cliente elige varios recursos con su fase y tipo", target_fixture="ctx")
def cliente_elige_recursos():
    from generation.jobs_helpers import StartJobRequest

    payload = StartJobRequest(
        prompt="árboles de decisión",
        resources=[
            {"phase_type": "engage", "resource_type": "Cómic Interactivo"},
            {"phase_type": "engage", "resource_type": "Micro-Podcast"},
            {"phase_type": "explore", "resource_type": "5"},
        ],
    )
    return {"payload": payload}


@when("se construye el plan de recursos", target_fixture="plan")
def construye_plan(ctx):
    from generation.jobs_helpers import build_resource_plan

    return build_resource_plan(ctx["payload"])


@then("hay una fila por cada recurso elegido con su resource_type")
def fila_por_recurso(plan):
    assert len(plan) == 3
    assert [r["resource_type"] for r in plan] == ["Cómic Interactivo", "Micro-Podcast", "5"]


@then("cada recurso conserva su fase y su orden dentro de la fase")
def conserva_fase_orden(plan):
    engage = [r for r in plan if r["phase_type"] == "engage"]
    explore = [r for r in plan if r["phase_type"] == "explore"]
    assert [r["resource_order"] for r in engage] == [0, 1]
    assert all(r["phase_order"] == 1 for r in engage)
    assert [r["resource_order"] for r in explore] == [0]
    assert all(r["phase_order"] == 2 for r in explore)


# Scenario 9 (HU-022/B2): materializa OVA parcial con ≥1 done (R1/R2)
@scenario(FEATURE, "Un job con recursos generados materializa un OVA parcial")
def test_materializa_ova_parcial():
    pass


@given("un job donde un recurso se genera y otro falla siempre", target_fixture="ctx")
def job_parcial(db, monkeypatch):
    user_id = uuid.uuid4()

    def agent(phase_type, rtype, concept):
        if rtype == 2:  # "Storyboard de Video" → falla siempre
            raise RuntimeError("provider down")
        return f"<html>{rtype}</html>"

    _stub_agent(monkeypatch, agent)
    job = _make_job(db, user_id=user_id, resources=_engage_plan(3))
    return {"user_id": user_id, "job": job}


@then("el job queda ligado a un OVA con sus fases generadas")
def job_ligado_ova(db, ctx):
    from sqlalchemy import select

    from models import Ova, OvaPhase

    job = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])
    assert job.ova_id is not None
    ova = db.execute(select(Ova).where(Ova.id == job.ova_id)).scalar_one_or_none()
    assert ova is not None and ova.status == "borrador"
    phases = db.execute(select(OvaPhase)).scalars().all()
    assert len(phases) >= 1
    ctx["ova_phases"] = phases


@then("solo los recursos done se vuelven fases del OVA")
def solo_done_fases(db, ctx):
    resources = jobs_service.list_resources(db, ctx["job"].id)
    done = [r for r in resources if r.status == "done"]
    assert len(ctx["ova_phases"]) == len(done)
    assert all(p.content and p.content.strip() for p in ctx["ova_phases"])


# Scenario 10 (HU-022/B2/R8): fallo total no materializa OVA
@scenario(FEATURE, "Un fallo total no materializa ningún OVA")
def test_fallo_total_sin_ova():
    pass


@given("un job donde todos los recursos fallan siempre", target_fixture="ctx")
def job_fallo_total(db, monkeypatch):
    user_id = uuid.uuid4()
    _stub_agent(monkeypatch, lambda pt, rt, c: (_ for _ in ()).throw(RuntimeError("down")))
    job = _make_job(db, user_id=user_id, resources=_engage_plan(2))
    return {"user_id": user_id, "job": job}


@then("el job termina en error sin OVA asociado")
def job_error_sin_ova(db, ctx):
    from sqlalchemy import select

    from models import Ova, OvaVersion

    job = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])
    assert job.status == "error"
    # HU-023: a placeholder OVA is pre-created at job start. On total failure it
    # is marked "error" (not deleted) so it still shows in "Mis OVAs"; crucially
    # nothing is *materialized* — no version/phases are built from 0 done resources.
    if job.ova_id is not None:
        ova = db.get(Ova, job.ova_id)
        assert ova is not None and ova.status == "error"
    assert db.execute(select(OvaVersion)).scalars().first() is None


# Scenario 11 (HU-022/B3): contenido de un recurso done aparte del estado
@scenario(FEATURE, "El contenido de un recurso done se obtiene aparte del estado")
def test_contenido_aparte():
    pass


@given("un job con un recurso done con contenido", target_fixture="ctx")
def job_recurso_done(db):
    user_id = uuid.uuid4()
    job = _make_job(db, user_id=user_id, resources=_engage_plan(1))
    res = jobs_service.list_resources(db, job.id)[0]
    res.status = "done"
    res.content = "<html>contenido del recurso</html>"
    db.commit()
    return {"user_id": user_id, "job": job, "rid": res.id}


@when("el dueño solicita el contenido de ese recurso", target_fixture="content")
def solicita_contenido(db, ctx):
    res = jobs_service.get_resource(db, ctx["job"].id, ctx["rid"])
    assert res is not None and res.status == "done"
    return res.content


@then("recibe el HTML del recurso")
def recibe_html(content):
    assert content == "<html>contenido del recurso</html>"


@then("el estado del job sigue sin exponer el contenido")
def estado_sin_contenido(db, ctx):
    job = jobs_service.get_job(db, ctx["job"].id, ctx["user_id"])
    resources = jobs_service.list_resources(db, job.id)
    payload = job_to_dict(job, resources)
    assert "content" not in payload["resources"][0]


# Scenario 12 (HU-022/B4): reanudar un subconjunto válido
@scenario(FEATURE, "Reintentar un subconjunto de recursos del job")
def test_resume_subconjunto():
    pass


@given("un job interrupted con varios recursos pending", target_fixture="ctx")
def job_interrupted_pending(db):
    user_id = uuid.uuid4()
    job = _make_job(db, user_id=user_id, resources=_engage_plan(3), status="interrupted")
    res = jobs_service.list_resources(db, job.id)
    return {"user_id": user_id, "job": job, "ids": [r.id for r in res]}


@when("se resuelven los recursos a reanudar para un subconjunto válido", target_fixture="resolved")
def resuelve_subconjunto(db, ctx):
    from generation.jobs_helpers import ResumeRequest
    from generation.jobs_router import _resolve_resume_targets

    subset = [str(ctx["ids"][0])]
    return _resolve_resume_targets(db, ctx["job"].id, ResumeRequest(resource_ids=subset))


@then("solo se reanudan los recursos solicitados")
def solo_solicitados(ctx, resolved):
    targets, error = resolved
    assert error is None
    assert targets == [ctx["ids"][0]]


# Scenario 13 (HU-022/B4): id ajeno se rechaza
@scenario(FEATURE, "Reintentar con un recurso ajeno al job se rechaza")
def test_resume_ajeno_rechazado():
    pass


@when("se resuelven los recursos a reanudar incluyendo un id ajeno", target_fixture="resolved")
def resuelve_ajeno(db, ctx):
    from generation.jobs_helpers import ResumeRequest
    from generation.jobs_router import _resolve_resume_targets

    foreign = [str(ctx["ids"][0]), str(uuid.uuid4())]
    return _resolve_resume_targets(db, ctx["job"].id, ResumeRequest(resource_ids=foreign))


@then("la resolución se rechaza como no encontrada")
def resolucion_rechazada(resolved):
    targets, error = resolved
    assert targets == []
    assert error is not None
    assert error.status_code == 404


# Scenario 14 (HU-022/B4/R6/R7): un done en el subset de resume no se relanza
@scenario(FEATURE, "Reintentar un subconjunto con un recurso done no lo regenera")
def test_resume_done_en_subset():
    pass


_DONE_HTML = "<html>contenido original done</html>"


@given("un job interrupted con un recurso done y otro en error", target_fixture="ctx")
def job_done_y_error(db, monkeypatch):
    user_id = uuid.uuid4()
    # Agent only ever runs for resumable resources; record which resource_types it
    # was asked to (re)generate, so we can prove the `done` one is never relaunched.
    seen = {"rtypes": []}

    def agent(phase_type, rtype, concept):
        seen["rtypes"].append(rtype)
        return f"<html>regenerado {rtype}</html>"

    _stub_agent(monkeypatch, agent)
    job = _make_job(db, user_id=user_id, resources=_engage_plan(2), status="interrupted")
    res = jobs_service.list_resources(db, job.id)
    res[0].status = "done"  # ENGAGE id 1 — already good, must stay intact
    res[0].content = _DONE_HTML
    res[1].status = "error"  # ENGAGE id 2 — the one to retry
    db.commit()
    return {
        "user_id": user_id,
        "job": job,
        "done_id": res[0].id,
        "error_id": res[1].id,
        "seen": seen,
    }


@when("el usuario reanuda el subconjunto que incluye el recurso done")
def reanuda_subset_con_done(db, ctx):
    from generation.jobs_helpers import ResumeRequest
    from generation.jobs_router import _resolve_resume_targets

    subset = [str(ctx["done_id"]), str(ctx["error_id"])]
    targets, error = _resolve_resume_targets(db, ctx["job"].id, ResumeRequest(resource_ids=subset))
    assert error is None
    ctx["targets"] = targets
    jobs_runner.run_job(ctx["job"].id, targets)
    db.expire_all()


@then("solo se regenera el recurso en error")
def solo_error_regenerado(db, ctx):
    # The resolved subset excludes the done id; only the error resource is targeted.
    assert ctx["targets"] == [ctx["error_id"]]
    # And the agent was invoked exactly once — for the ENGAGE id 2 (error) resource.
    assert ctx["seen"]["rtypes"] == [2]
    error_res = jobs_service.get_resource(db, ctx["job"].id, ctx["error_id"])
    assert error_res.status == "done"
    assert error_res.content == "<html>regenerado 2</html>"


@then("el recurso done conserva su contenido original sin relanzarse")
def done_intacto(db, ctx):
    done_res = jobs_service.get_resource(db, ctx["job"].id, ctx["done_id"])
    assert done_res.status == "done"
    assert done_res.content == _DONE_HTML
