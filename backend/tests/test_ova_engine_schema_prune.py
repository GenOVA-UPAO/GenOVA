"""Las claves que el schema no declara nunca llegan al render (salida del LLM no confiable)."""

import json

from ova_engine import text as text_mod
from ova_engine.contract import RenderContext
from ova_engine.registry import get_spec
from ova_engine.schema import arr, obj, prune, s, validate

# Claves de control que solo escribe el enriquecimiento de imágenes.
INJECTED = {
    "image_placeholder": "https://evil.example/p.png",
    "image_source": "diagrama",
    "image_credit": {"author": "<script>alert(1)</script>", "license": "CC BY", "url": "https://evil.example"},
}


def test_prune_quita_claves_extra_en_raiz_y_anidadas():
    schema = obj(a=s(), items=arr(obj(b=s())))
    data = {"a": "x", "image_credit_html": "<script>", "items": [{"b": "y", "image_placeholder": "u"}]}
    assert validate(data, schema) == []
    assert prune(data, schema) == {"a": "x", "items": [{"b": "y"}]}


def test_prune_respeta_objetos_sin_additional_properties_false():
    schema = {"type": "object", "properties": {"a": s()}}
    assert prune({"a": "x", "libre": 1}, schema) == {"a": "x", "libre": 1}


def test_generate_json_descarta_claves_de_control_del_llm(monkeypatch):
    for key in ("engage:5", "explain:2", "elaborate:1"):
        spec = get_spec(*key.split(":"))
        params = spec.resolve_params({})
        sample = spec.sample("Privacidad de datos", params)
        answer = {**sample, **INJECTED, "imagen": {**sample["imagen"], "src": "https://evil.example/q.png"}}
        monkeypatch.setattr(text_mod, "_router", lambda *a, _r=answer, **k: json.dumps(_r))
        data = text_mod.generate_json("p", spec.schema(params))
        assert not INJECTED.keys() & data.keys(), key
        assert "src" not in data["imagen"], key
        html = spec.render(data, RenderContext("Privacidad de datos", spec.phase, spec.rt, spec.title, params))
        assert "evil.example" not in html and "<script>alert" not in html, key
