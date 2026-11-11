"""El crédito que deja el enriquecimiento en `data` es serializable (actividad en JSONB)."""

import json

from llm.images.image_enrich import enrich_with_images
from llm.images.sources.contract import Credit, ImageResult
from llm.images.sources.router import ImageRouter
from ova_engine.contract import RenderContext
from ova_engine.registry import get_spec

CREDIT = Credit(
    title="Antena",
    author="Ana Autora",
    license="CC BY-SA 4.0",
    license_url="https://creativecommons.org/licenses/by-sa/4.0/",
    source_url="https://commons.wikimedia.org/wiki/File:Antenna.jpg",
    provider="wikimedia",
)


def test_credito_enriquecido_es_json_y_se_sigue_mostrando(monkeypatch):
    result = ImageResult(
        data_uri="data:image/png;base64,iVBORw0KGgo=",
        source="busqueda",
        alt="Antena",
        credit=CREDIT,
        meta={},
    )
    monkeypatch.setattr(ImageRouter, "route", lambda self, req, **k: result)
    spec = get_spec("engage", 5)
    params = spec.resolve_params({})
    data = spec.sample("Redes", params)
    enrich_with_images(
        data, {"max_images": 1, "provider": "huggingface"}, ova_key="Redes", template_key=spec.key
    )
    assert data["image_credit"]["author"] == "Ana Autora"
    json.dumps(data)
    html = spec.render(data, RenderContext("Redes", spec.phase, spec.rt, spec.title, params))
    assert 'src="__IMG_1__"' in html and "Ana Autora" in html
