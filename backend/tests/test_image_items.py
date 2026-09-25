"""Las viñetas con prompt_imagen se encuentran aunque el modelo envuelva el array."""

from llm.images.image_enrich import enrich_with_images, image_items

VINETAS = [{"numero": 1, "prompt_imagen": "a robot"}, {"numero": 2, "prompt_imagen": "a cup"}]


def test_array_como_pide_el_prompt():
    assert image_items(list(VINETAS)) == VINETAS


def test_objeto_que_envuelve_el_array():
    data = {"titulo": "Max y el café", "viñetas": [dict(v) for v in VINETAS]}
    items = image_items(data)
    assert [i["numero"] for i in items] == [1, 2]
    assert items[0] is data["viñetas"][0]  # los mismos objetos: reciben el placeholder


def test_una_sola_vineta_y_sin_prompts():
    assert image_items({"prompt_imagen": "x"}) == [{"prompt_imagen": "x"}]
    assert image_items({"texto": "sin imágenes"}) == []
    assert image_items("texto") == []


def test_el_placeholder_queda_en_el_objeto_envuelto(monkeypatch):
    monkeypatch.setattr("llm.images.image_enrich.get_image_data_uri", lambda *a, **k: "data:image/png;base64,AA")
    data = {"viñetas": [dict(v) for v in VINETAS]}
    settings = {"enabled": True, "provider": "openrouter", "api_key": "k", "max_images": 2, "chain": [{"provider": "openrouter", "model_id": "m"}]}
    replacements = enrich_with_images(data, settings)
    assert set(replacements) == {"__IMG_1__", "__IMG_2__"}
    assert data["viñetas"][0]["image_placeholder"] == "__IMG_1__"
