from llm.images import image_cache, image_enrich
from llm.images.style_guide import CHARACTERS, build_style_guide, guide_from_settings


def test_guia_de_estilo_es_determinista_y_sin_texto():
    a, b = build_style_guide("Índices  B-tree"), build_style_guide("índices b-tree")
    assert a == b
    assert "no text" in a.suffix
    assert "#0A3D91" in a.prefix
    assert 0 <= a.seed < 2**31


def test_apply_antepone_estilo_y_personaje():
    guide = build_style_guide("tema")
    out = guide.apply("Max opens a drawer.", CHARACTERS["max"])
    assert out.startswith(guide.prefix)
    assert CHARACTERS["max"] in out
    assert out.endswith(guide.suffix)


def test_guia_guardada_en_el_job_tiene_prioridad():
    fixed = build_style_guide("otro").as_dict()
    assert guide_from_settings({"style_guide": fixed}, "tema").key == fixed["key"]
    assert guide_from_settings({}, "tema") == build_style_guide("tema")


def test_clave_de_cache_normaliza_y_distingue_estilo_modelo_tamano():
    k = image_cache.cache_key("A  Cat", "s", "m", 512, 512)
    assert k == image_cache.cache_key("a cat", "s", "m", 512, 512)
    assert k != image_cache.cache_key("a cat", "s2", "m", 512, 512)
    assert k != image_cache.cache_key("a cat", "s", "m2", 512, 512)
    assert k != image_cache.cache_key("a cat", "s", "m", 768, 512)


def test_enrich_aplica_estilo_a_todas_las_imagenes_y_reutiliza_cache(monkeypatch, tmp_path):
    monkeypatch.setenv("IMAGE_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(image_enrich, "fake_media_enabled", lambda: False)
    monkeypatch.setattr(image_enrich, "compress_data_uri", lambda uri: uri)
    seen: list[tuple[str, int | None]] = []

    def fake_get(prompt, provider, api_key, model=None, hf_fallback=True, seed=None):
        seen.append((prompt, seed))
        return "data:image/png;base64,AAAA"

    monkeypatch.setattr(image_enrich, "get_image_data_uri", fake_get)
    settings = {"provider": "local", "max_images": 3}
    data = {"vinetas": [{"prompt_imagen": f"scene {i}"} for i in range(3)]}
    before = image_cache.stats()
    image_enrich.enrich_with_images(data, settings, character=CHARACTERS["max"], ova_key="tema")
    guide = build_style_guide("tema")
    assert len(seen) == 3
    assert all(p.startswith(guide.prefix) and CHARACTERS["max"] in p for p, _ in seen)
    assert {s for _, s in seen} == {guide.seed}

    again = {"vinetas": [{"prompt_imagen": f"scene {i}"} for i in range(3)]}
    image_enrich.enrich_with_images(again, settings, character=CHARACTERS["max"], ova_key="tema")
    assert len(seen) == 3  # todo de caché
    after = image_cache.stats()
    assert after["hits"] - before["hits"] == 3
