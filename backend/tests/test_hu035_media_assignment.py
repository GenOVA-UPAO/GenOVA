"""HU-035 — media assignment + generation switches + legacy image_* map."""

from llm.images import image_settings_resolve as resolve
from llm.utils import llm_config_store as store


def test_sanitize_includes_media_and_generation_enabled(monkeypatch):
    monkeypatch.setattr(
        store,
        "_full_keys",
        lambda: {("runware", "runware:100@1"), ("groq", "llama-3.3-70b-versatile")},
    )
    clean = store.sanitize_config(
        {
            "defaults": {
                "imagen": {"provider": "runware", "model_id": "runware:100@1"},
                "texto": {"provider": "bogus", "model_id": "x"},
            },
            "fallbacks": {
                "imagen": [{"provider": "runware", "model_id": "runware:100@1"}],
            },
            "generation_enabled": {"imagen": False, "video": True},
        }
    )
    assert clean["defaults"]["imagen"]["model_id"] == "runware:100@1"
    assert "texto" not in clean["defaults"]
    assert clean["generation_enabled"] == {"imagen": False, "video": True}


def test_sanitize_video_defaults_off():
    clean = store.sanitize_config({})
    assert clean["generation_enabled"]["video"] is False
    assert clean["generation_enabled"]["imagen"] is True


def test_legacy_image_none_disables():
    entry, enabled = resolve.legacy_image_entry({"image_provider": "none"})
    assert entry is None
    assert enabled is False


def test_legacy_image_maps_provider_model():
    entry, enabled = resolve.legacy_image_entry(
        {"image_provider": "runware", "image_model": "runware:100@1"}
    )
    assert enabled is True
    assert entry == {"provider": "runware", "model_id": "runware:100@1", "extra": {}}


def test_imagen_chain_prefers_store_over_legacy():
    stored = {
        "defaults": {"imagen": {"provider": "falai", "model_id": "fal-ai/flux"}},
        "fallbacks": [],
    }
    chain = resolve.imagen_chain(
        stored, {"image_provider": "runware", "image_model": "runware:100@1"}
    )
    assert chain[0]["provider"] == "falai"


def test_imagen_chain_falls_back_to_legacy():
    chain = resolve.imagen_chain(
        {}, {"image_provider": "siliconflow", "image_model": "stabilityai/sd"}
    )
    assert chain == [
        {"provider": "siliconflow", "model_id": "stabilityai/sd", "extra": {}}
    ]


def test_should_generate_video_off_by_default():
    assert resolve.should_generate_video({}) is False


def test_should_generate_video_requires_switch_and_chain():
    stored = {
        "generation_enabled": {"video": True},
        "defaults": {"video": {"provider": "openrouter", "model_id": "kling"}},
    }
    assert resolve.should_generate_video(stored) is True
    assert resolve.should_generate_video({"generation_enabled": {"video": True}}) is False


def test_build_image_settings_respects_disabled(monkeypatch):
    monkeypatch.setattr(
        store,
        "stored_cached",
        lambda: {
            "generation_enabled": {"imagen": False, "video": False},
            "defaults": {"imagen": {"provider": "runware", "model_id": "runware:100@1"}},
        },
    )
    monkeypatch.setattr(
        "llm.clients.key_resolver.resolve_key",
        lambda *a, **k: "k",
    )
    out = resolve.build_image_settings(ova_settings={}, user_api_keys={}, db=None)
    assert out["enabled"] is False
    assert out["provider"] == "none"


def test_build_image_settings_uses_chain(monkeypatch):
    monkeypatch.setattr(
        store,
        "stored_cached",
        lambda: {
            "generation_enabled": {"imagen": True, "video": False},
            "defaults": {"imagen": {"provider": "runware", "model_id": "runware:100@1"}},
        },
    )
    monkeypatch.setattr(
        "llm.clients.key_resolver.resolve_key",
        lambda *a, **k: "secret",
    )
    out = resolve.build_image_settings(
        ova_settings={"max_images": 3}, user_api_keys={}, db=None
    )
    assert out["enabled"] is True
    assert out["provider"] == "runware"
    assert out["image_model"] == "runware:100@1"
    assert out["api_key"] == "secret"
    assert out["max_images"] == 3


def test_enrich_skips_when_disabled():
    from llm.images.image_enrich import enrich_with_images

    data = [{"prompt_imagen": "a cat"}]
    assert enrich_with_images(data, {"enabled": False, "max_images": 2}) == {}
