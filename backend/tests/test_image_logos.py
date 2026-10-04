"""Tests unitarios para la fuente de logotipos estáticos (LogoSource)."""

from llm.images.sources.contract import ImageRequest
from llm.images.sources.logos import LogoSource, find_logo_slug


def test_logo_source_exact_match():
    source = LogoSource()
    req = ImageRequest(tipo="logo", descripcion="Base de datos relacional", marca="PostgreSQL")
    res = source.fetch(req)
    assert res is not None
    assert res.source == "logo"
    assert res.data_uri.startswith("data:image/svg+xml;base64,")
    assert "PostgreSQL" in res.alt
    assert res.credit is not None
    assert res.credit.provider == "simple-icons"
    assert "CC0" in res.credit.license
    assert res.meta["slug"] == "postgresql"


def test_logo_source_aliases():
    source = LogoSource()

    # Aliases de postgres
    for alias in ["postgres", "pg", "psql", "postgresql"]:
        req = ImageRequest(tipo="logo", descripcion="BD", marca=alias)
        res = source.fetch(req)
        assert res is not None, f"Fallo con alias {alias}"
        assert res.meta["slug"] == "postgresql"

    # Aliases de kubernetes
    assert find_logo_slug("", brand="k8s") == "kubernetes"
    assert find_logo_slug("", brand="kube") == "kubernetes"

    # Aliases de Python y TypeScript
    assert find_logo_slug("", brand="py") == "python"
    assert find_logo_slug("", brand="ts") == "typescript"
    assert find_logo_slug("", brand="js") == "javascript"

    # Aliases de SQL Server
    assert find_logo_slug("", brand="sql server") == "mssql"
    assert find_logo_slug("", brand="mssql") == "mssql"


def test_logo_source_query_extraction_when_brand_empty():
    source = LogoSource()
    # Sin campo marca, pero mencionado en consulta o descripcion
    req = ImageRequest(
        tipo="logo",
        descripcion="Contenedores y despliegue rápido",
        consulta="arquitectura con docker y microservicios",
    )
    res = source.fetch(req)
    assert res is not None
    assert res.meta["slug"] == "docker"
    assert "Docker" in res.credit.title


def test_logo_source_unknown_brand_returns_none():
    source = LogoSource()
    req = ImageRequest(tipo="logo", descripcion="Tecnología desconocida", marca="SuperCustomTechXYZ123")
    res = source.fetch(req)
    assert res is None


def test_logo_source_oracle_and_devicon():
    source = LogoSource()
    req = ImageRequest(tipo="logo", descripcion="Oracle Database Enterprise", marca="oracle")
    res = source.fetch(req)
    assert res is not None
    assert res.meta["slug"] == "oracle"
    assert res.credit.provider == "devicon"
    assert "MIT" in res.credit.license
