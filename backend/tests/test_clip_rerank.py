"""Tests unitarios para el re-ranking visual local con CLIP y clases negativas zero-shot."""

import io

from PIL import Image, ImageDraw

from llm.images.clip_rerank import ClipReranker


def _image_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_clip_reranker_instance():
    reranker = ClipReranker.get_instance()
    assert reranker.available is True
    assert reranker.model is not None
    assert reranker.preprocess is not None
    assert reranker.tokenizer is not None
    assert reranker.negative_embeddings is not None


def test_clip_rerank_low_similarity_threshold_returns_none(monkeypatch):
    """Verifica que si ninguna candidata supera el umbral mínimo de similitud se devuelve None."""
    reranker = ClipReranker.get_instance()

    # Imagen uniforme que no tiene relación con servidores de base de datos
    flat_img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    img_bytes = _image_to_bytes(flat_img)

    candidates = [
        {
            "title": "Grey square",
            "url": "https://example.com/grey.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    # Con umbral alto (ej. 0.35) una imagen gris plana debe ser descartada
    best, diags = reranker.score_candidates(
        candidates,
        concept="Bases de datos",
        query="PostgreSQL high-performance cluster server hardware",
        description="Servidores en rack de alta densidad con discos NVMe",
        min_similarity=0.35,
    )

    assert best is None
    assert len(diags) == 1
    assert diags[0]["passed"] is False
    assert "umbral_minimo" in diags[0]["reason"] or "negativa" in diags[0]["reason"]


def test_clip_rerank_text_poster_negative_class():
    """Verifica que un póster cargado de texto es descartado por la clase negativa poster_texto."""
    reranker = ClipReranker.get_instance()

    # Crear una imagen sintética tipo póster/anuncio llena de texto
    poster = Image.new("RGB", (300, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(poster)
    for y in range(10, 380, 20):
        draw.text((15, y), "CYBER SECURITY AWARENESS MONTH NOTICE WARNING", fill=(0, 0, 0))

    img_bytes = _image_to_bytes(poster)

    candidates = [
        {
            "title": "Awareness Poster",
            "url": "https://example.com/poster.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    best, diags = reranker.score_candidates(
        candidates,
        concept="Ciberseguridad",
        query="cyber security network hardware firewall appliance",
        description="Aparato físico de firewall en rack de centro de datos",
        min_similarity=0.15,
    )

    # El póster con texto debe ser descartado (gana poster_texto o presencia negativa fuerte)
    assert len(diags) == 1
    assert diags[0]["top_neg_class"] in ("poster_texto", "screenshot")
    assert diags[0]["passed"] is False
    assert best is None


def test_clip_rerank_diagnostics_structure():
    """Verifica que el reporte de diagnósticos incluye las métricas objetivas requeridas."""
    reranker = ClipReranker.get_instance()

    test_img = Image.new("RGB", (224, 224), color=(30, 80, 150))
    img_bytes = _image_to_bytes(test_img)

    candidates = [
        {
            "title": "Blue surface",
            "url": "https://example.com/blue.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    _, diags = reranker.score_candidates(
        candidates,
        concept="Redes",
        query="computer network router",
        description="Router de red",
        min_similarity=0.10,
    )

    assert len(diags) == 1
    d = diags[0]
    assert "pos_score" in d
    assert "top_neg_class" in d
    assert "top_neg_score" in d
    assert "neg_scores" in d
    assert "persona" in d["neg_scores"]
    assert "militar" in d["neg_scores"]
    assert "poster_texto" in d["neg_scores"]
    assert "screenshot" in d["neg_scores"]
    assert "meme" in d["neg_scores"]
    assert "reason" in d
