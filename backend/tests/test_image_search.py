"""Tests unitarios para la fuente de búsqueda web (SearchSource) sin conexión externa."""

from unittest.mock import MagicMock
from urllib.parse import urlparse

from llm.images.sources.contract import ImageRequest
from llm.images.sources.search import (
    SearchSource,
    filter_candidates,
    has_foreign_language,
    is_allowed_license,
    is_safe_svg,
    score_candidate,
)

# SVG de prueba 100% seguro
SAFE_SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
# SVG malicioso con script
UNSAFE_SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>'


def test_license_filtering():
    # Licencias permitidas
    assert is_allowed_license("CC BY-SA 4.0") is True
    assert is_allowed_license("CC BY 3.0") is True
    assert is_allowed_license("CC0") is True
    assert is_allowed_license("Public domain") is True
    assert is_allowed_license("Pexels License") is True
    assert is_allowed_license("Unsplash License") is True
    assert is_allowed_license("PostgreSQL License") is True

    # Licencias rechazadas (NC, ND, desconocidas)
    assert is_allowed_license("CC BY-NC 4.0") is False
    assert is_allowed_license("CC BY-NC-SA 2.0") is False
    assert is_allowed_license("CC BY-ND 3.0") is False
    assert is_allowed_license("All rights reserved") is False
    assert is_allowed_license("Unknown") is False
    assert is_allowed_license("") is False


def test_safe_svg_filter():
    assert is_safe_svg(SAFE_SVG) is True
    assert is_safe_svg(UNSAFE_SVG) is False
    assert is_safe_svg('<svg onload="alert(1)"></svg>') is False
    assert is_safe_svg('<svg><a href="javascript:alert(1)">link</a></svg>') is False


def test_foreign_language_filter():
    # Título en hebreo de la prueba previa real
    assert has_foreign_language("An example of entity relationship diagram in Hebrew.jpg") is True
    # Caracteres hebreos reales
    assert has_foreign_language("תרשים ישויות קשרים") is True
    # Caracteres cirílicos (ruso)
    assert has_foreign_language("Диаграмма базы данных") is True
    # Caracteres chinos
    assert has_foreign_language("数据库关系图") is True

    # Español e inglés válidos
    assert has_foreign_language("Entity relationship diagram for database design") is False
    assert has_foreign_language("Diagrama entidad relación de biblioteca universitaria") is False


def test_candidate_filtering_and_ranking():
    candidates = [
        # Candidata 1: en hebreo (debe ser descartada)
        {
            "title": "An example of entity relationship diagram in Hebrew.jpg",
            "description": "ER diagram in Hebrew",
            "url": "https://example.com/hebrew.jpg",
            "width": 800,
            "height": 600,
            "license": "CC BY-SA 3.0",
        },
        # Candidata 2: licencia no permitida NC (debe ser descartada)
        {
            "title": "Database Schema Diagram.png",
            "description": "Database schema",
            "url": "https://example.com/nc.jpg",
            "width": 800,
            "height": 600,
            "license": "CC BY-NC 4.0",
        },
        # Candidata 3: dimensiones diminutas (debe ser descartada)
        {
            "title": "Tiny Icon.png",
            "description": "Tiny",
            "url": "https://example.com/tiny.png",
            "width": 40,
            "height": 40,
            "license": "CC0",
        },
        # Candidata 4: válida y relevante (fotografía real de servidores)
        {
            "title": "PostgreSQL Database Server Hardware Rack in Datacenter",
            "description": "High performance server rack hosting PostgreSQL database cluster",
            "url": "https://example.com/pg_rack.jpg",
            "width": 1024,
            "height": 768,
            "license": "CC BY-SA 4.0",
        },
        # Candidata 5: diagrama / esquema (debe ser descartada por _NON_PHOTO_TITLE_RE)
        {
            "title": "PostgreSQL Architecture Diagram",
            "description": "Detailed database schema flowchart",
            "url": "https://example.com/diagram.png",
            "width": 1024,
            "height": 768,
            "license": "CC BY-SA 4.0",
        },
    ]

    filtered = filter_candidates(candidates)
    assert len(filtered) == 1
    assert filtered[0]["title"] == "PostgreSQL Database Server Hardware Rack in Datacenter"

    # Verificar puntuación
    score = score_candidate(
        filtered[0],
        query="PostgreSQL database server hardware",
        description="Rack de servidores en datacenter",
        concept="Bases de datos",
    )
    assert score > 20.0


def test_search_source_fetch_with_mocked_network(monkeypatch, tmp_path):
    monkeypatch.setenv("IMAGE_CACHE_DIR", str(tmp_path / "cache"))
    # Prueba el flujo de red/licencias, no CLIP (opcional): se fuerza sin verificación visual.
    monkeypatch.setenv("IMAGE_SEARCH_WITHOUT_CLIP", "1")

    # Falsa respuesta de Wikimedia
    mock_wiki_resp = {
        "query": {
            "pages": {
                "123": {
                    "title": "File:PostgreSQL_server_rack.jpg",
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/pg_rack.jpg",
                            "width": 1200,
                            "height": 800,
                            "mime": "image/jpeg",
                            "extmetadata": {
                                "LicenseShortName": {"value": "CC BY-SA 4.0"},
                                "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0"},
                                "Artist": {"value": "John Doe DBA"},
                                "ImageDescription": {"value": "Rack de servidores con PostgreSQL"},
                            },
                        }
                    ],
                }
            }
        }
    }

    # Falso contenido binario de imagen (PNG 1x1 pixel)
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"

    def mock_get(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        host = urlparse(url).hostname or ""
        if host == "commons.wikimedia.org":
            resp.json.return_value = mock_wiki_resp
        elif host.endswith("openverse.org"):
            resp.json.return_value = {"results": []}
        else:
            resp.content = fake_png
        return resp

    from llm.images.clip_rerank import ClipReranker

    def mock_score(self, candidates, concept, query, description, **kwargs):
        if candidates:
            c = dict(candidates[0])
            c["clip_score"] = 0.29
            return c, [{"passed": True, "pos_score": 0.29, "title": c.get("title")}]
        return None, []

    monkeypatch.setattr(ClipReranker, "score_candidates", mock_score)

    source = SearchSource()
    monkeypatch.setattr(source.session, "get", mock_get)

    req = ImageRequest(
        tipo="foto",
        descripcion="Rack de servidores PostgreSQL en centro de datos",
        consulta="PostgreSQL server rack",
        concept="Bases de datos",
    )

    result = source.fetch(req)
    assert result is not None
    assert result.source == "busqueda"
    assert result.data_uri.startswith("data:image/")
    assert result.credit is not None
    assert result.credit.provider == "wikimedia"
    assert result.credit.author == "John Doe DBA"
    assert "CC BY-SA 4.0" in result.credit.license

    # Segunda llamada: debe responder desde la caché de disco CON EL CRÉDITO REAL
    cached_result = source.fetch(req)
    assert cached_result is not None
    assert cached_result.meta.get("cache_hit") is True
    assert cached_result.credit is not None
    assert cached_result.credit.author == "John Doe DBA"
    assert cached_result.credit.author != "Fuente libre"
    assert "CC BY-SA 4.0" in cached_result.credit.license
    assert cached_result.credit.license != "Licencia libre verificada"
    assert cached_result.credit.provider == "wikimedia"
    assert cached_result.credit.provider != "cache"


def test_search_cache_rejects_generic_credit_and_preserves_real_credit(monkeypatch, tmp_path):
    """Verifica que nunca se devuelvan créditos inventados ('Fuente libre', 'cache') y que la caché conserve datos reales."""
    from llm.images import image_cache

    monkeypatch.setenv("IMAGE_CACHE_DIR", str(tmp_path / "cache_test"))

    fake_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    req = ImageRequest(tipo="foto", descripcion="Datacenter rack", consulta="datacenter rack", concept="Sistemas")

    norm_query = image_cache.normalize_prompt(f"{req.consulta} {req.concept}")
    ckey = image_cache.cache_key(norm_query, "search", "free", req.width, req.height)

    # 1. Caso corrupto/genérico: caché antigua con 'Fuente libre' o 'Licencia libre verificada'
    image_cache.put_record(
        ckey,
        fake_png,
        meta={
            "credit": {
                "title": "Imagen para datacenter rack",
                "author": "Fuente libre",
                "license": "Licencia libre verificada",
                "license_url": "https://creativecommons.org/",
                "source_url": "https://commons.wikimedia.org/",
                "provider": "cache",
            }
        },
    )

    source = SearchSource()
    # No hay red; si lee el crédito genérico fallará la prueba porque debe tratarlo como miss
    def mock_fail(*args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {"query": {"pages": {}}, "results": []}
        return resp

    monkeypatch.setattr(source.session, "get", mock_fail)

    # Debe ser cache MISS porque el crédito almacenado es genérico/inválido
    res = source.fetch(req)
    assert res is None  # Descartó el hit corrupto y no halló en red

    # 2. Caso legítimo: guardar crédito real
    real_credit = {
        "title": "Datacenter Supermicro Rack",
        "author": "Ing. Maria Ramirez",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "source_url": "https://commons.wikimedia.org/wiki/File:Supermicro_Rack.jpg",
        "provider": "wikimedia",
    }
    image_cache.put_record(ckey, fake_png, meta={"credit": real_credit})

    res_valid = source.fetch(req)
    assert res_valid is not None
    assert res_valid.meta.get("cache_hit") is True
    assert res_valid.credit.author == "Ing. Maria Ramirez"
    assert res_valid.credit.author != "Fuente libre"
    assert res_valid.credit.license == "CC BY-SA 4.0"
    assert res_valid.credit.license != "Licencia libre verificada"
    assert res_valid.credit.provider == "wikimedia"
    assert res_valid.credit.provider != "cache"


def test_search_skipped_without_clip(monkeypatch, tmp_path):
    """Sin CLIP disponible la búsqueda no devuelve fotos sin verificar."""
    from llm.images.clip_rerank import ClipReranker
    from llm.images.sources.contract import ImageRequest
    from llm.images.sources.search import SearchSource

    monkeypatch.setenv("IMAGE_CACHE", "0")
    monkeypatch.delenv("IMAGE_SEARCH_WITHOUT_CLIP", raising=False)
    fake = type("R", (), {"available": False})()
    monkeypatch.setattr(ClipReranker, "get_instance", classmethod(lambda cls: fake))
    src = SearchSource()
    monkeypatch.setattr(
        "llm.images.sources.search.search_wikimedia",
        lambda *a, **k: [{"url": "https://upload.wikimedia.org/x.jpg", "width": 1200, "height": 800,
                          "license": "CC0", "title": "File:server.jpg", "provider": "wikimedia"}],
    )
    monkeypatch.setattr("llm.images.sources.search.search_openverse", lambda *a, **k: [])
    monkeypatch.setattr("llm.images.sources.search.filter_candidates", lambda c: c)
    assert src.fetch(ImageRequest(tipo="foto", descripcion="servidores", consulta="server rack")) is None
