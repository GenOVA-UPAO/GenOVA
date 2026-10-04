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


def test_kafka_does_not_return_apache():
    """Verifica que Apache Kafka NO devuelve la pluma de Apache HTTP Server."""
    source = LogoSource()

    # Distintas variantes de consulta y marca
    assert find_logo_slug("Apache Kafka") is None
    assert find_logo_slug("Kafka", brand="Apache Kafka") is None
    assert find_logo_slug("Kafka") is None
    assert find_logo_slug("", brand="Kafka") is None
    assert find_logo_slug("", brand="Apache Kafka") is None
    assert find_logo_slug("procesamiento distribuido con Apache Kafka") is None

    # Petición formal a LogoSource
    req = ImageRequest(tipo="logo", descripcion="Stream de eventos", marca="Apache Kafka", consulta="Apache Kafka")
    res = source.fetch(req)
    assert res is None  # No hay logo estático -> cae a búsqueda


def test_logo_official_colors_in_svg():
    """Verifica que los logotipos de Simple Icons incluyen su color oficial en el SVG (no negro)."""
    source = LogoSource()
    import base64

    # PostgreSQL oficial (#4169E1)
    res_pg = source.fetch(ImageRequest(tipo="logo", descripcion="Postgres", marca="PostgreSQL"))
    assert res_pg is not None
    svg_pg = base64.b64decode(res_pg.data_uri.split(",")[1]).decode("utf-8")
    assert 'fill="#4169E1"' in svg_pg or 'fill="#4169e1"' in svg_pg.lower()

    # Docker oficial (#2496ED)
    res_docker = source.fetch(ImageRequest(tipo="logo", descripcion="Docker", marca="Docker"))
    assert res_docker is not None
    svg_docker = base64.b64decode(res_docker.data_uri.split(",")[1]).decode("utf-8")
    assert 'fill="#2496ED"' in svg_docker or 'fill="#2496ed"' in svg_docker.lower()

    # Kubernetes oficial (#326CE5)
    res_k8s = source.fetch(ImageRequest(tipo="logo", descripcion="Kubernetes", marca="Kubernetes"))
    assert res_k8s is not None
    svg_k8s = base64.b64decode(res_k8s.data_uri.split(",")[1]).decode("utf-8")
    assert 'fill="#326CE5"' in svg_k8s or 'fill="#326ce5"' in svg_k8s.lower()
