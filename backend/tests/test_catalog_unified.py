"""Unit tests for HU-034 unified catalog: categorize, aptitudes, image entries, dedupe."""

from llm.catalog.catalog_aptitudes import (
    CANONICAL_TYPES,
    aptitudes_for,
    models_apt_for_task,
    parse_modality,
)
from llm.catalog.catalog_categorize import categorize_model
from llm.catalog.catalog_gather import _dedupe_and_sort
from llm.catalog.catalog_image_entries import (
    curated_image_entries,
    merge_image_entries,
)


def test_parse_modality_openrouter_arrow_formats():
    assert parse_modality({"architecture": {"modality": "text->text"}}) == "text"
    assert parse_modality({"architecture": {"modality": "text+image->text"}}) == "multimodal"
    assert parse_modality({"architecture": {"modality": "text->image"}}) == "image"
    assert parse_modality({"architecture": {"modality": "text->video"}}) == "video"
    assert parse_modality({"architecture": {"modality": "text->embeddings"}}) == "embedding"


def test_categorize_includes_video_and_imagen():
    assert categorize_model({"id": "x", "architecture": {"modality": "text->image"}}) == "imagen"
    assert (
        categorize_model({"id": "kling-video", "architecture": {"modality": "text->text"}})
        == "video"
    )
    assert (
        categorize_model({"id": "qwen3-coder", "architecture": {"modality": "text->text"}})
        == "codigo"
    )


def test_categorize_general_llms_stay_texto_not_codigo():
    """Brand names must not force codigo — that emptied the texto assignment pool."""
    assert (
        categorize_model(
            {"id": "deepseek/deepseek-v4-flash", "architecture": {"modality": "text->text"}}
        )
        == "texto"
    )
    assert (
        categorize_model({"id": "anthropic/claude-sonnet", "architecture": {"modality": "text"}})
        == "texto"
    )
    assert (
        categorize_model({"id": "openai/o3-mini", "architecture": {"modality": "text"}})
        == "razonamiento"
    )


def test_multimodal_aptitudes_span_multiple_tasks():
    raw = {
        "id": "vision-model",
        "architecture": {
            "modality": "text+image->text",
            "input_modalities": ["text", "image"],
            "output_modalities": ["text"],
        },
    }
    apt = aptitudes_for("multimodal", "multimodal", raw)
    assert "texto" in apt
    assert "imagen" in apt
    entries = [
        {
            "provider": "openrouter",
            "model_id": "vision-model",
            "category": "multimodal",
            "aptitudes": apt,
        }
    ]
    assert len(models_apt_for_task(entries, "texto")) == 1
    assert len(models_apt_for_task(entries, "imagen")) == 1
    assert models_apt_for_task(entries, "video") == []


def test_canonical_types_include_multimodal_embedding_audio_video():
    for t in ("multimodal", "embedding", "audio", "video", "imagen"):
        assert t in CANONICAL_TYPES


def test_curated_image_providers_in_catalog():
    rows = curated_image_entries()
    providers = {e["provider"] for e in rows}
    assert "huggingface" in providers
    assert "siliconflow" in providers
    assert "runware" in providers
    assert "falai" in providers
    assert all(e["category"] == "imagen" for e in rows)
    assert all("imagen" in e["aptitudes"] for e in rows)


def test_merge_prefers_live_siliconflow():
    curated = curated_image_entries()
    live = {
        "siliconflow": [
            {
                "provider": "siliconflow",
                "model_id": "black-forest-labs/FLUX.1-schnell",
                "label": "FLUX",
                "category": "imagen",
                "modality": "image",
                "curated": False,
                "active": True,
                "aptitudes": ["imagen"],
            }
        ],
        "huggingface": None,
        "runware": None,
        "falai": None,
    }
    merged = merge_image_entries(curated, live)
    assert any(e["provider"] == "siliconflow" for e in merged)
    assert any(e["provider"] == "runware" for e in merged)  # curated fallback


def test_dedupe_by_provider_and_model_id():
    rows = [
        {"provider": "runware", "model_id": "a", "curated": True},
        {"provider": "runware", "model_id": "a", "curated": False},
        {"provider": "falai", "model_id": "a", "curated": True},
    ]
    out = _dedupe_and_sort(rows)
    assert len(out) == 2
    keys = {(e["provider"], e["model_id"]) for e in out}
    assert keys == {("runware", "a"), ("falai", "a")}
