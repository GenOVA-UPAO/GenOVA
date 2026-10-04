"""Tests unitarios para la validación con CLIP de imágenes generadas y reintento con semilla."""

import io
from unittest.mock import MagicMock, patch

from PIL import Image

from llm.images.clip_rerank import ClipReranker
from llm.images.sources.contract import ImageRequest
from llm.images.sources.router import GenerationSource, _validate_and_retry_generation
from llm.images.style_guide import build_style_guide


def _make_dummy_data_uri(color: tuple[int, int, int] = (10, 61, 145)) -> str:
    import base64

    img = Image.new("RGB", (64, 64), color)
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/webp;base64,{b64}"


def test_style_guide_has_no_children_or_cottages():
    guide = build_style_guide("Bases de datos relacionales con PostgreSQL")
    # No debe contener gouache de libros infantiles
    assert "children's book" not in guide.prefix.lower()
    # Debe contener restricciones negativas estrictas
    assert "no children" in guide.suffix.lower()
    assert "no house" in guide.suffix.lower()


def test_validate_and_retry_generation_passes_first_try():
    gen_mock = MagicMock(return_value=_make_dummy_data_uri())

    with patch.object(ClipReranker, "get_instance") as mock_get:
        reranker = MagicMock()
        reranker.validate_generated_image.return_value = (True, "aprobada", 0.28, {"pos_score": 0.28})
        mock_get.return_value = reranker

        uri, seed_used, score, diag = _validate_and_retry_generation(
            "full prompt", 12345, "PostgreSQL", "servers in a rack", gen_mock
        )

        assert uri is not None
        assert seed_used == 12345
        assert score == 0.28
        assert gen_mock.call_count == 1


def test_validate_and_retry_generation_retries_and_succeeds():
    gen_mock = MagicMock(return_value=_make_dummy_data_uri())

    with patch.object(ClipReranker, "get_instance") as mock_get:
        reranker = MagicMock()
        # Primer intento falla (ej. casitas/niños), segundo intento pasa
        reranker.validate_generated_image.side_effect = [
            (False, "negativa_ganadora:infantil_casitas", 0.15, {}),
            (True, "aprobada", 0.25, {"pos_score": 0.25}),
        ]
        mock_get.return_value = reranker

        uri, seed_used, score, diag = _validate_and_retry_generation(
            "full prompt", 12345, "PostgreSQL", "servers in a rack", gen_mock
        )

        assert uri is not None
        assert seed_used != 12345  # Usó semilla alternativa
        assert score == 0.25
        assert gen_mock.call_count == 2


def test_validate_and_retry_generation_fails_twice_returns_none():
    gen_mock = MagicMock(return_value=_make_dummy_data_uri())

    with patch.object(ClipReranker, "get_instance") as mock_get:
        reranker = MagicMock()
        # Ambos intentos fallan la validación CLIP
        reranker.validate_generated_image.side_effect = [
            (False, "fuerte_negativa:infantil_casitas", 0.12, {}),
            (False, "especificidad_insuficiente", 0.14, {}),
        ]
        mock_get.return_value = reranker

        uri, seed_used, score, diag = _validate_and_retry_generation(
            "full prompt", 12345, "PostgreSQL", "servers in a rack", gen_mock
        )

        assert uri is None  # Retorna None para que la plantilla use su alternativa SVG/fallback
        assert gen_mock.call_count == 2


def test_generation_source_fetch_with_clip_integration():
    source = GenerationSource(image_settings={"enabled": True, "provider": "local"})
    req = ImageRequest(
        tipo="escena",
        descripcion="Infraestructura de servidores",
        concept="Centros de datos y servidores de alta densidad",
    )

    with patch("llm.images.sources.router.get_image_data_uri", return_value=_make_dummy_data_uri()), \
         patch.object(ClipReranker, "get_instance") as mock_get:
        reranker = MagicMock()
        reranker.validate_generated_image.return_value = (True, "aprobada", 0.29, {"pos_score": 0.29})
        mock_get.return_value = reranker

        result = source.fetch(req)
        assert result is not None
        assert result.source == "generada"
        assert result.meta.get("clip_score") == 0.29
        assert "servers in a datacenter rack" in result.meta.get("subject", "")
