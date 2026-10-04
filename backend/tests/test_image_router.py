"""Tests unitarios para el decisor/enrutador de fuentes de imagen (ImageRouter)."""

from unittest.mock import MagicMock

from llm.images.sources.contract import Credit, ImageRequest, ImageResult
from llm.images.sources.router import ImageRouter


def _dummy_result(source: str) -> ImageResult:
    return ImageResult(
        data_uri=f"data:image/png;base64,{source}",
        source=source,  # type: ignore
        alt=f"Imagen desde {source}",
        credit=Credit(
            title=f"Test {source}",
            author="Tester",
            license="CC0",
            license_url="http://license.com",
            source_url="http://source.com",
            provider=source,
        )
        if source not in ("generada", "diagrama")
        else None,
        meta={"source_id": source},
    )


def test_router_logo_hit_static():
    logos = MagicMock()
    logos.fetch.return_value = _dummy_result("logo")
    search = MagicMock()

    router = ImageRouter(logos_source=logos, search_source=search)
    req = ImageRequest(tipo="logo", descripcion="PostgreSQL", marca="postgres")

    res = router.route(req)
    assert res is not None
    assert res.source == "logo"
    assert res.meta["chosen_source"] == "logo"
    assert "estática" in res.meta["reason"]
    logos.fetch.assert_called_once()
    search.fetch.assert_not_called()


def test_router_logo_fallback_to_search():
    logos = MagicMock()
    logos.fetch.return_value = None  # No encontrado en biblioteca estática
    search = MagicMock()
    search.fetch.return_value = _dummy_result("busqueda")

    router = ImageRouter(logos_source=logos, search_source=search)
    req = ImageRequest(tipo="logo", descripcion="Logo de producto no catalogado", marca="SuperTool")

    res = router.route(req)
    assert res is not None
    assert res.source == "busqueda"
    assert "logos:not_found" in res.meta["fallback_history"]
    logos.fetch.assert_called_once()
    search.fetch.assert_called_once()


def test_router_foto_primary_search():
    search = MagicMock()
    search.fetch.return_value = _dummy_result("busqueda")
    gen = MagicMock()

    router = ImageRouter(search_source=search, generation_source=gen)
    req = ImageRequest(tipo="foto", descripcion="Servidor en rack", consulta="datacenter rack")

    res = router.route(req)
    assert res is not None
    assert res.source == "busqueda"
    search.fetch.assert_called_once()
    gen.fetch.assert_not_called()


def test_router_foto_fallback_to_generation():
    search = MagicMock()
    search.fetch.return_value = None  # Nada en bancos libres
    gen = MagicMock()
    gen.fetch.return_value = _dummy_result("generada")

    router = ImageRouter(search_source=search, generation_source=gen)
    req = ImageRequest(tipo="foto", descripcion="Servidor muy específico", consulta="exotic server")

    res = router.route(req)
    assert res is not None
    assert res.source == "generada"
    assert "busqueda:not_found" in res.meta["fallback_history"]
    search.fetch.assert_called_once()
    gen.fetch.assert_called_once()


def test_router_diagrama_fallback_chain():
    diagram = MagicMock()
    diagram.fetch.return_value = None
    search = MagicMock()
    search.fetch.return_value = None
    gen = MagicMock()
    gen.fetch.return_value = _dummy_result("generada")

    router = ImageRouter(diagram_source=diagram, search_source=search, generation_source=gen)
    req = ImageRequest(
        tipo="diagrama",
        descripcion="Diagrama ER",
        diagrama={"tipo": "er", "nodos": [{"id": "n1", "etiqueta": "Usuario"}]},
    )

    res = router.route(req)
    assert res is not None
    assert res.source == "generada"
    assert "diagrama:unavailable_or_no_schema" not in res.meta["fallback_history"]
    assert "busqueda:not_found" in res.meta["fallback_history"]


def test_router_escena_and_personaje():
    gen = MagicMock()
    gen.fetch.return_value = _dummy_result("generada")

    router = ImageRouter(generation_source=gen)

    res_escena = router.route(ImageRequest(tipo="escena", descripcion="Un robot en la luna"))
    assert res_escena is not None
    assert res_escena.source == "generada"

    res_personaje = router.route(ImageRequest(tipo="personaje", descripcion="Max explicando bases de datos"))
    assert res_personaje is not None
    assert res_personaje.source == "generada"
