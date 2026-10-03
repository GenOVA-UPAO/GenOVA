"""Revisor de contenido del motor: detección, corrección de solo los campos afectados, flags."""

import copy

import pytest

from ova_engine import review as R
from ova_engine.html import document, engine_info
from ova_engine.registry import get_spec


@pytest.fixture
def spec():
    return get_spec("engage", 1)


@pytest.fixture
def data(spec):
    return spec.sample("Índices B-tree", spec.resolve_params({}))


def test_rutas_get_set_roundtrip(data):
    fields = R.iter_text_fields(data)
    assert fields
    path = next(p for p, _ in fields if "[" in p)
    d = copy.deepcopy(data)
    R.set_path(d, path, "nuevo texto de prueba")
    assert R.get_path(d, path) == "nuevo texto de prueba"
    assert R.get_path(data, path) != "nuevo texto de prueba"


def test_campos_de_prompt_no_se_revisan(data):
    assert not any("prompt_imagen" in p for p, _ in R.iter_text_fields(data))


def _verdicts(fields, bad):
    return {"revision": [{"n": n, "veredicto": bad.get(p, "ok")} for n, (p, _) in enumerate(fields)]}


def test_review_fields_ignora_indices_inventados(monkeypatch, data):
    fields = R.iter_text_fields(data)
    path = fields[1][0]
    out = _verdicts(fields, {path: "fuera_de_tema"})
    out["revision"].append({"n": 999, "veredicto": "incorrecto"})
    monkeypatch.setenv("OVA_CONTENT_REVIEW_VERIFY", "0")
    monkeypatch.setattr(R, "_llm_json", lambda *a, **k: out)
    got = R.review_fields("Índices B-tree", fields)
    assert [(p["campo"], p["tipo"]) for p in got] == [(path, "fuera_de_tema")]


def test_verificacion_descarta_falsos_positivos(monkeypatch, data):
    fields = R.iter_text_fields(data)
    path = fields[1][0]
    monkeypatch.setenv("OVA_CONTENT_REVIEW_VERIFY", "1")

    def fake(prompt, schema, **k):
        if "respuesta_si" in str(schema):
            return {"motivo": "razonable", "respuesta_si": True}
        return _verdicts(fields, {path: "incorrecto"})

    monkeypatch.setattr(R, "_llm_json", fake)
    assert R.review_fields("Índices B-tree", fields) == []


def test_review_and_fix_reescribe_solo_el_campo_afectado(monkeypatch, spec, data):
    schema = spec.schema(spec.resolve_params({}))
    fields = R.iter_text_fields(data)
    path = fields[1][0]
    monkeypatch.setenv("OVA_CONTENT_REVIEW", "1")
    monkeypatch.setenv("OVA_CONTENT_REVIEW_VERIFY", "0")
    monkeypatch.setattr(R, "_llm_json", lambda *a, **k: _verdicts(fields, {path: "fuera_de_tema"}))

    def fake_generate(prompt, sch, **k):
        new = copy.deepcopy(data)
        R.set_path(new, path, "Texto corregido sobre el concepto.")
        # el modelo «aprovecha» y toca otro campo: debe ignorarse
        R.set_path(new, fields[2][0], "Cambio no pedido")
        return new

    monkeypatch.setattr(R, "generate_json", fake_generate)
    out, rep = R.review_and_fix("Índices B-tree", data, schema)
    assert R.get_path(out, path) == "Texto corregido sobre el concepto."
    assert R.get_path(out, fields[2][0]) == R.get_path(data, fields[2][0])
    assert (len(rep.found), rep.fixed) == (1, 1)
    assert rep.summary()["fixed"] == 1


def test_correccion_invalida_se_descarta(monkeypatch, spec, data):
    schema = spec.schema(spec.resolve_params({}))
    fields = R.iter_text_fields(data)
    path = fields[1][0]
    monkeypatch.setenv("OVA_CONTENT_REVIEW_VERIFY", "0")
    monkeypatch.setattr(R, "_llm_json", lambda *a, **k: _verdicts(fields, {path: "vacio"}))

    def bad(prompt, sch, **k):
        new = copy.deepcopy(data)
        R.set_path(new, path, "x" * 5000)  # excede maxLength*1.3
        return new

    monkeypatch.setattr(R, "generate_json", bad)
    out, rep = R.review_and_fix("c", data, schema)
    assert out == data and rep.fixed == 0


def test_flag_apagado_no_llama_al_llm(monkeypatch, spec, data):
    monkeypatch.setenv("OVA_CONTENT_REVIEW", "0")
    monkeypatch.setattr(R, "_llm_json", lambda *a, **k: pytest.fail("no debe llamar"))
    out, rep = R.review_and_fix("c", data, spec.schema(spec.resolve_params({})))
    assert out is data and rep.summary() is None


def test_fallo_del_llm_nunca_tumba_el_recurso(monkeypatch, spec, data):
    monkeypatch.setenv("OVA_CONTENT_REVIEW", "1")

    def boom(*a, **k):
        raise RuntimeError("ollama caído")

    monkeypatch.setattr(R, "_llm_json", boom)
    out, rep = R.review_and_fix("c", data, spec.schema(spec.resolve_params({})))
    assert out is data and rep.error


def test_sin_presupuesto_no_revisa(monkeypatch, spec, data):
    import time

    monkeypatch.setenv("OVA_CONTENT_REVIEW", "1")
    monkeypatch.setattr(R, "_llm_json", lambda *a, **k: pytest.fail("no debe llamar"))
    out, rep = R.review_and_fix("c", data, spec.schema(spec.resolve_params({})), deadline=time.monotonic() + 5)
    assert out is data and rep.error


def test_engine_info_viaja_en_el_html():
    html = document("t", "<p>x</p>", key="engage_01", info={"params": {"num_panels": 5}, "review": {"found": 1}})
    info = engine_info(html)
    assert info["key"] == "engage_01" and info["params"] == {"num_panels": 5} and info["review"] == {"found": 1}
    assert engine_info("<html></html>") == {}


def test_engine_info_tras_inyectar_el_runtime():
    """El runtime UPAO mete CSS antes del meta: el meta debe seguir leyéndose."""
    html = document("t", "<p>x</p>", key="explain_05", info={"params": {"num_steps": 4}})
    html = html.replace("<head>", "<head><style>" + "a{}" * 6000 + "</style>", 1)
    assert engine_info(html)["key"] == "explain_05"
    assert engine_info(html)["params"] == {"num_steps": 4}
