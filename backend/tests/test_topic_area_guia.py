"""El «área temática» de Configuración guía la generación (tarea 35), sin LLM real."""

from uuid import uuid4

import pytest

from generation.application.dto import CreateJobInput
from generation.application.use_cases import CreateJob
from generation.domain.execution import build_graph_state
from generation.infrastructure.input_guardrail import _CLASSIFIER_PROMPT
from ova_engine import pipeline
from ova_engine.domain_context import area_scope, current_area, domain_for, with_area
from ova_engine.registry import all_specs
from ova_engine.text import _full_prompt

AREA_BD = "Sistemas y gestión de base de datos"
AREA_ML = "machine learning"


def test_area_bd_con_tema_ambiguo_es_bd_y_el_bloque_va_en_rules():
    d = domain_for("Árboles", "", area=AREA_BD)
    assert d.is_db
    assert d.area == AREA_BD
    rules = d.rules()
    assert "[ÁREA DEL CURSO]" in rules
    assert f"«{AREA_BD}»" in rules
    assert "Interpreta el tema «Árboles» dentro de esa área" in rules
    # Un área de BD no implica Oracle (tarea 36): sin hechos de Oracle.
    assert not d.is_oracle
    assert "Hechos de referencia de Oracle" not in _full_prompt("x", {"type": "object"}, d.is_oracle)


def test_area_ml_con_arboles_no_trae_hechos_oracle():
    d = domain_for("Árboles", "", area=AREA_ML)
    assert not d.is_db
    assert "[ÁREA DEL CURSO]" in d.rules()
    assert "«machine learning»" in d.rules()
    assert "Hechos de referencia de Oracle" not in _full_prompt("x", {"type": "object"}, d.is_oracle)


def test_sin_area_todo_igual_que_antes():
    d = domain_for("Fotosíntesis", "")
    assert d.area == ""
    assert "[ÁREA DEL CURSO]" not in d.rules()
    assert not d.is_db
    assert with_area("prompt") == "prompt"


def test_area_scope_se_hereda_y_se_restaura():
    assert current_area() == ""
    with area_scope(f"  «{AREA_ML}»\n"):
        assert current_area() == AREA_ML
        assert domain_for("Regresión", "").area == AREA_ML
        with area_scope(""):
            assert current_area() == ""
    assert current_area() == ""


def test_with_area_no_duplica_el_bloque():
    with area_scope(AREA_ML):
        once = with_area("Haz algo", "Árboles")
        assert once.startswith("[ÁREA DEL CURSO]")
        assert with_area(once, "Árboles") == once


class _Captured(Exception):
    pass


@pytest.mark.parametrize("spec", sorted(all_specs().values(), key=lambda s: (s.phase, s.rt)), ids=lambda s: s.key)
def test_toda_plantilla_recibe_el_area_en_su_prompt(spec, monkeypatch):
    """El bloque del área entra en el prompt de CADA plantilla (también si el tema es de BD)."""
    seen = {}

    def fake_generate_json(prompt, *_a, **_k):
        seen["prompt"] = prompt
        seen["db_facts"] = _k.get("db_facts")
        raise _Captured

    monkeypatch.setattr(pipeline, "generate_json", fake_generate_json)
    monkeypatch.setattr(pipeline, "_params", lambda s, *_a, **_k: s.resolve_params({}))
    with area_scope(AREA_BD), pytest.raises(_Captured):
        pipeline.generate_with_template(spec, "Árboles")
    assert "[ÁREA DEL CURSO]" in seen["prompt"]
    assert f"«{AREA_BD}»" in seen["prompt"]
    assert seen["db_facts"] is False  # área de BD sin Oracle: sin hechos de Oracle


class _Source:
    def __init__(self, area):
        self.area = area

    def active_area(self):
        return self.area


class _Repo:
    def __init__(self):
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs

        class Job:
            id = uuid4()
            ova_id = uuid4()

        return Job()


class _Images:
    def resolve(self, **_k):
        return {}


class _Launcher:
    def launch(self, *_a, **_k):
        pass


class _Allow:
    def assert_allowed(self, *_a):
        pass


def _create(area_source):
    repo = _Repo()
    uc = CreateJob(repo=repo, images=_Images(), launcher=_Launcher(), guardrail=_Allow(), topic_area=area_source)
    uc.execute(CreateJobInput(user_id=uuid4(), prompt="Normalización", resource_plan=[]))
    return repo.kwargs["params"]


def test_el_job_guarda_el_area_y_el_motor_la_recibe():
    params = _create(_Source(AREA_BD))
    assert params["topic_area"] == AREA_BD
    # Reintento y reanudación arman el estado desde los params guardados.
    state = build_graph_state(
        prompt="Normalización",
        params=params,
        job_id=uuid4(),
        only_resource_ids=None,
        phases_seed={},
        phase_order_seed=[],
    )
    assert state["topic_area"] == AREA_BD


def test_sin_area_activa_el_job_no_guarda_nada():
    assert "topic_area" not in _create(_Source(""))
    assert "topic_area" not in _create(None)


def test_el_worker_pasa_el_area_del_estado_a_generate_resource(monkeypatch):
    from prometheus.engine import workpool

    seen = {}

    class _Result:
        html = "<html></html>"
        defects: list = []
        raw_json = None
        activity = None

    def fake_generate_resource(*_a, **kw):
        seen.update(kw)
        raise RuntimeError("stop")

    monkeypatch.setattr("prometheus.plans.generate.generate_resource", fake_generate_resource)
    monkeypatch.setattr(workpool, "job_stopped", lambda _j: False)
    monkeypatch.setattr(workpool, "mark_running", lambda *_a: None)
    monkeypatch.setattr(workpool, "persist_failure", lambda *_a, **_k: None)
    workpool.resource_worker(
        {"work_item": {"phase": "engage", "resource_type": 1}, "prompt": "Árboles", "topic_area": AREA_BD}
    )
    assert seen["area"] == AREA_BD


def test_generate_resource_abre_el_ambito_del_area(monkeypatch):
    from prometheus.plans import generate

    seen = []
    monkeypatch.setattr(generate, "_generate_resource", lambda *_a, **_k: seen.append(current_area()))
    generate.generate_resource("engage", 1, "Árboles", area=AREA_ML)
    generate.generate_resource("engage", 1, "Árboles")
    assert seen == [AREA_ML, ""]


def test_podcast_recibe_el_area(monkeypatch):
    from prometheus.plans import generate

    seen = {}

    def fake_plain(text, **_k):
        seen["prompt"] = text
        return "monólogo"

    monkeypatch.setattr("ova_engine.text.generate_plain", fake_plain)
    monkeypatch.setattr("llm.podcast.podcast.podcast_audio", lambda _t: None)
    generate._gen_podcast("engage", 3, "Árboles", "", None, None, fake=False)
    assert "[ÁREA DEL CURSO]" not in seen["prompt"]
    with area_scope(AREA_ML):
        generate._gen_podcast("engage", 3, "Árboles", "", None, None, fake=False)
    assert "«machine learning»" in seen["prompt"]


def test_edicion_por_instruccion_conserva_el_area(monkeypatch):
    from generation.regen import regen_edit

    prompts = []
    monkeypatch.setattr(regen_edit, "generar_texto", lambda p, *_a, **_k: prompts.append(p) or "")
    monkeypatch.setattr("core.config.settings.llm_fake", False)
    regen_edit.edit_phase_content("Árboles", "cambia X", "<html></html>", area=AREA_BD)
    assert prompts and all("«" + AREA_BD + "»" in p for p in prompts)


def test_critico_y_concierge_reciben_el_area():
    from prometheus.nodes import concierge, critic, editor

    for node in (concierge.concierge_node, critic.critic_node, editor.editor_node):
        assert node.__name__.endswith("_node")
    import inspect

    for mod in (concierge, critic, editor):
        assert "area_scope(state.get(\"topic_area\"))" in inspect.getsource(mod)


def test_el_clasificador_permite_terminos_ambiguos_con_sentido_en_el_area():
    assert "NO PUEDE interpretarse razonablemente" in _CLASSIFIER_PROMPT
    assert "ambiguo o genérico" in _CLASSIFIER_PROMPT
    for ejemplo in ("Árboles", "Normalización", "Índices", "Modelos", "Regresión", "Seguridad"):
        assert ejemplo in _CLASSIFIER_PROMPT
    assert "Fotosíntesis" in _CLASSIFIER_PROMPT
    body = _CLASSIFIER_PROMPT.format(area=AREA_BD, prompt="Árboles")
    assert AREA_BD in body


def test_area_activa_solo_si_el_guardarrail_de_tema_esta_encendido(monkeypatch):
    from generation.infrastructure import guardrails_store

    def rs(enabled, area):
        return lambda: {"topic_enabled": enabled, "topic_area": area}

    monkeypatch.setattr(guardrails_store, "runtime_settings", rs(True, AREA_BD))
    assert guardrails_store.active_topic_area() == AREA_BD
    monkeypatch.setattr(guardrails_store, "runtime_settings", rs(False, AREA_BD))
    assert guardrails_store.active_topic_area() == ""
    monkeypatch.setattr(guardrails_store, "runtime_settings", rs(True, ""))
    assert guardrails_store.active_topic_area() == ""
