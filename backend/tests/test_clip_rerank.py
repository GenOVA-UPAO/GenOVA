"""Tests unitarios para el re-ranking visual local con CLIP y clases negativas zero-shot."""

import io

import pytest
from PIL import Image, ImageDraw

# CLIP es opcional (requirements-clip.txt): sin torch/open_clip, o sin el modelo
# descargado, estas pruebas no aplican (el CI no instala dependencias pesadas).
pytest.importorskip("torch")
pytest.importorskip("open_clip")

from llm.images.clip_rerank import ClipReranker  # noqa: E402

if not ClipReranker.get_instance().available:
    pytest.skip("modelo CLIP no disponible", allow_module_level=True)


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
    assert "diagrama" in d["neg_scores"]
    assert "esquema" in d["neg_scores"]
    assert "ia_render3d" in d["neg_scores"]
    assert "die_chip_plano" in d["neg_scores"]
    assert "phash" in d
    assert "specificity_margin" in d
    assert "top_generic_prompt" in d
    assert "top_generic_score" in d
    assert "usage_penalty" in d
    assert "reason" in d


def test_dhash_and_hamming_distance():
    from llm.images.clip_rerank import compute_dhash, hamming_distance

    img1 = Image.new("RGB", (64, 64), color=(50, 50, 50))
    img2 = Image.new("RGB", (64, 64), color=(50, 50, 50))
    h1 = compute_dhash(img1)
    h2 = compute_dhash(img2)
    assert h1 == h2
    assert hamming_distance(h1, h2) == 0

    # Modificar ligeramente img2 pero sin cambiar el patrón de gradiente
    draw = ImageDraw.Draw(img2)
    draw.rectangle([10, 10, 20, 20], fill=(52, 52, 52))
    h2_mod = compute_dhash(img2)
    assert hamming_distance(h1, h2_mod) <= 2

    # Imagen con gradiente decreciente (izq clara, der oscura -> bits en 1)
    img3 = Image.new("L", (64, 64))
    for x in range(64):
        for y in range(64):
            img3.putpixel((x, y), (63 - x) * 4)
    h3 = compute_dhash(img3.convert("RGB"))
    assert hamming_distance(h1, h3) >= 32


def test_clip_rerank_intra_ova_deduplication():
    from llm.images.clip_rerank import compute_dhash

    reranker = ClipReranker.get_instance()
    img = Image.new("RGB", (224, 224), color=(40, 90, 160))
    img_bytes = _image_to_bytes(img)
    img_phash = compute_dhash(img)

    candidates = [
        {
            "title": "Network Switch",
            "url": "https://example.com/switch.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    # Pasamos img_phash como used_hashes: debe ser descartada por duplicada
    best, diags = reranker.score_candidates(
        candidates,
        concept="Redes",
        query="network switch ethernet hardware",
        description="Switch ethernet administrable",
        min_similarity=0.10,
        used_hashes=[img_phash],
    )
    assert best is None
    assert len(diags) == 1
    assert "duplicada_mismo_ova" in diags[0]["reason"]
    assert diags[0]["passed"] is False


def test_clip_rerank_usage_penalty(tmp_path, monkeypatch):
    from llm.images import image_cache
    from llm.images.clip_rerank import compute_dhash

    monkeypatch.setenv("IMAGE_CACHE_DIR", str(tmp_path / "cache"))

    reranker = ClipReranker.get_instance()
    img = Image.new("RGB", (224, 224), color=(60, 120, 180))
    img_bytes = _image_to_bytes(img)
    img_phash = compute_dhash(img)

    # Registramos que este hash ya fue usado para otra consulta previa
    image_cache.record_image_usage(img_phash, "previous query server infrastructure")

    candidates = [
        {
            "title": "Server Chassis",
            "url": "https://example.com/server.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    _, diags = reranker.score_candidates(
        candidates,
        concept="Hardware",
        query="different query modern datacenter server rack",
        description="Servidores en rack",
        min_similarity=0.01,
    )
    assert len(diags) == 1
    assert diags[0]["usage_penalty"] >= 0.04
    assert diags[0]["effective_score"] < diags[0]["pos_score"]


def test_clip_person_classes_and_threshold_configuration():
    """Verifica que las clases negativas de persona estén explícitamente configuradas con el umbral 0.205."""
    from llm.images.clip_rerank import (
        DEFAULT_PERSON_THRESHOLD,
        GENERATED_NEGATIVE_CLASSES,
        NEGATIVE_CLASSES,
        PERSON_NEGATIVE_CLASSES,
    )

    assert DEFAULT_PERSON_THRESHOLD == 0.205
    for p_class in ("persona", "persona_primer_plano", "persona_rostro", "persona_posando"):
        assert p_class in NEGATIVE_CLASSES
        assert p_class in GENERATED_NEGATIVE_CLASSES
        assert p_class in PERSON_NEGATIVE_CLASSES

    # Verificar que los prompts de persona contengan los términos explícitos requeridos
    assert "close-up portrait of a person" in NEGATIVE_CLASSES["persona_primer_plano"]
    assert "person's face" in NEGATIVE_CLASSES["persona_primer_plano"]
    assert "people posing" in NEGATIVE_CLASSES["persona_posando"]


def test_clip_rerank_person_discard_rule(monkeypatch):
    """Verifica que un candidato con score de persona >= DEFAULT_PERSON_THRESHOLD es descartado por persona_detectada."""
    from llm.images.clip_rerank import DEFAULT_PERSON_THRESHOLD

    reranker = ClipReranker.get_instance()
    test_img = Image.new("RGB", (224, 224), color=(50, 100, 150))
    img_bytes = _image_to_bytes(test_img)

    # Creamos un tensor sintético normalizado
    def mock_encode_image(tensor):
        # Tomamos el embedding de la clase persona_rostro ponderado para dar exactamente 0.22
        from llm.images.clip_rerank import NEGATIVE_CLASSES
        neg_names = list(NEGATIVE_CLASSES.keys())
        p_idx = neg_names.index("persona_rostro")
        # El vector de persona_rostro multiplicado por 0.22 más ortogonal
        v = reranker.negative_embeddings[p_idx:p_idx+1].clone() * 0.22
        return v / v.norm(dim=-1, keepdim=True)

    monkeypatch.setattr(reranker.model, "encode_image", mock_encode_image)

    candidates = [
        {
            "title": "Persona en primer plano",
            "url": "https://example.com/face.png",
            "_downloaded_bytes": img_bytes,
        }
    ]

    best, diags = reranker.score_candidates(
        candidates,
        concept="Ciberseguridad",
        query="cybersecurity brass padlock",
        description="Candado físico de seguridad",
        min_similarity=0.10,
    )

    assert best is None
    assert len(diags) == 1
    d = diags[0]
    assert d["passed"] is False
    assert "persona_detectada" in d["reason"] or "negativa_ganadora" in d["reason"]
    assert d["top_persona_score"] >= DEFAULT_PERSON_THRESHOLD


def test_clip_rerank_server_room_penalty_non_infra_vs_infra():
    """Verifica que el score de sala de servidores se penaliza/descarta en temas no-infraestructura."""
    from llm.images.clip_rerank import SERVER_ROOM_PROMPTS
    from llm.images.query_builder import is_infrastructure_topic

    assert len(SERVER_ROOM_PROMPTS) >= 2

    # Verificar clasificación de temas
    assert is_infrastructure_topic("Centros de datos y servidores en rack") is True
    assert is_infrastructure_topic("Infraestructura física de centros de datos") is True
    assert is_infrastructure_topic("Bases de datos relacionales con PostgreSQL") is False
    assert is_infrastructure_topic("Ciberseguridad y criptografía") is False
    assert is_infrastructure_topic("Programación orientada a objetos") is False
    assert is_infrastructure_topic("Redes de computadoras y 5G") is False


def test_clip_validate_generated_image_person_and_server_room_rejection(monkeypatch):
    """Verifica que validate_generated_image rechace imágenes generadas con personas o con salas de servidores fuera de infra."""
    from llm.images.clip_rerank import ClipReranker

    reranker = ClipReranker.get_instance()
    test_img = Image.new("RGB", (224, 224), color=(120, 120, 120))
    img_bytes = _image_to_bytes(test_img)

    # 1. Imagen que supera el umbral de persona
    def mock_encode_person(tensor):
        from llm.images.clip_rerank import GENERATED_NEGATIVE_CLASSES
        gen_neg_names = list(GENERATED_NEGATIVE_CLASSES.keys())
        p_idx = gen_neg_names.index("persona_rostro")
        v = reranker.generated_negative_embeddings[p_idx:p_idx+1].clone()
        return v / v.norm(dim=-1, keepdim=True)

    monkeypatch.setattr(reranker.model, "encode_image", mock_encode_person)

    passed, reason, score, diag = reranker.validate_generated_image(
        image_input=img_bytes,
        concept="Bases de datos relacionales",
        subject_prompt="un disco duro con platos magnéticos",
    )
    assert passed is False
    assert "persona_detectada" in reason or "negativa_ganadora" in reason

    # 2. Imagen que es sala de servidores en tema no de infraestructura
    def mock_encode_servers(tensor):
        v = reranker.server_room_embeddings[0:1].clone()
        return v / v.norm(dim=-1, keepdim=True)

    monkeypatch.setattr(reranker.model, "encode_image", mock_encode_servers)

    passed_sr, reason_sr, score_sr, diag_sr = reranker.validate_generated_image(
        image_input=img_bytes,
        concept="Bases de datos relacionales",
        subject_prompt="un disco duro con platos magnéticos",
    )
    assert passed_sr is False
    assert "sala_de_servidores" in reason_sr or "negativa_ganadora" in reason_sr


