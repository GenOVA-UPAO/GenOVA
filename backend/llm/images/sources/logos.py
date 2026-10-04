"""Fuente de imágenes estáticas para logotipos de software e informática.

Vendoriza logotipos vectoriales (SVG) libres de Simple Icons y Devicon para ~60
tecnologías clave (bases de datos, lenguajes, nubes, sistemas operativos y herramientas).
No realiza peticiones de red en tiempo de ejecución.
"""

from __future__ import annotations

import base64
import re
from typing import Any

import structlog

from llm.images.sources.contract import Credit, ImageRequest, ImageResult
from llm.images.sources.logos_data import LOGOS

logger = structlog.get_logger(__name__)

# Mapa invertido de alias en minúsculas -> slug canónico
_ALIAS_MAP: dict[str, str] = {}
for _slug, _data in LOGOS.items():
    _ALIAS_MAP[_slug.lower()] = _slug
    for _alias in _data.get("aliases", []):
        _ALIAS_MAP[_alias.lower()] = _slug

# Ordenar alias de mayor a menor longitud para evitar coincidencias parciales indebidas
_SORTED_ALIASES = sorted(_ALIAS_MAP.keys(), key=lambda a: (-len(a), a))


_EXCLUDED_APACHE_SUBPROJECTS = {
    "kafka", "spark", "hadoop", "flink", "airflow", "tomcat",
    "maven", "solr", "zookeeper", "hive", "storm", "drill", "hbase"
}


def normalize_logo_name(name: str) -> str:
    """Normaliza un nombre o marca a minúsculas y caracteres alfanuméricos simples."""
    return re.sub(r"[^a-z0-9+#.-]", "", (name or "").strip().lower())


def find_logo_slug(query: str, brand: str = "") -> str | None:
    """Encuentra el slug de un logo dado el nombre de marca o una consulta/descripción."""
    full_text = f" {brand.lower()} {query.lower()} "

    # Exclusión explícita: subproyectos de Apache no vendorizados (ej. Apache Kafka no es Apache HTTP Server)
    if any(p in full_text for p in _EXCLUDED_APACHE_SUBPROJECTS):
        if "cassandra" in full_text:
            return "cassandra"
        return None

    # 1. Probar marca explícita
    if brand:
        norm_brand = brand.strip().lower()
        if norm_brand in _ALIAS_MAP:
            return _ALIAS_MAP[norm_brand]
        clean_brand = normalize_logo_name(brand)
        if clean_brand in _ALIAS_MAP:
            return _ALIAS_MAP[clean_brand]

    # 2. Buscar en la consulta o descripción por palabras completas
    text = f" {query.lower()} "
    for alias in _SORTED_ALIASES:
        # Alias demasiado cortos (longitud <= 2 como 'c', 'r', 'go') sólo se permiten en marca explícita
        if len(alias) <= 2:
            continue
        # Match con límites de palabra o puntuación común
        pattern = rf"(?:^|[\s_.,:;()/-]){re.escape(alias)}(?:$|[\s_.,:;()/-])"
        if re.search(pattern, text):
            return _ALIAS_MAP[alias]

    return None


def get_logo_data(slug: str) -> dict[str, Any] | None:
    """Obtiene los datos vendorizados de un logotipo por su slug."""
    return LOGOS.get(slug)


def svg_to_data_uri(svg_content: str, hex_color: str = "") -> str:
    """Convierte código SVG a un data URI base64 autocontenido con su color oficial."""
    if hex_color and "<path" in svg_content and 'fill="' not in svg_content:
        color = hex_color if hex_color.startswith("#") else f"#{hex_color}"
        svg_content = svg_content.replace("<path ", f'<path fill="{color}" ', 1)
    encoded = base64.b64encode(svg_content.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


class LogoSource:
    """Proveedor estático de logotipos de tecnologías informáticas."""

    name: str = "logo"

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        """Busca y devuelve el logotipo solicitado en formato SVG embebido."""
        slug = find_logo_slug(
            query=f"{request.consulta} {request.descripcion}",
            brand=request.marca,
        )
        if not slug:
            logger.debug(
                "logo not found in static repository",
                brand=request.marca,
                query=request.consulta,
            )
            return None

        logo_info = get_logo_data(slug)
        if not logo_info:
            return None

        data_uri = svg_to_data_uri(logo_info["svg"], logo_info.get("hex", ""))
        if request.descripcion and logo_info["title"].lower() in request.descripcion.lower():
            alt_text = request.descripcion
        elif request.descripcion:
            alt_text = f"Logotipo de {logo_info['title']}: {request.descripcion}"
        else:
            alt_text = f"Logotipo oficial de {logo_info['title']}"

        credit = Credit(
            title=f"Logotipo oficial de {logo_info['title']}",
            author=f"Proyecto / Comunidad {logo_info['title']}",
            license=logo_info["license"],
            license_url=logo_info["license_url"],
            source_url=logo_info["source_url"],
            provider=logo_info["provider"],
        )

        logger.info(
            "logo source resolved",
            slug=slug,
            title=logo_info["title"],
            provider=logo_info["provider"],
        )

        return ImageResult(
            data_uri=data_uri,
            source="logo",
            alt=alt_text,
            credit=credit,
            meta={
                "slug": slug,
                "title": logo_info["title"],
                "category": logo_info["category"],
                "provider": logo_info["provider"],
            },
        )
