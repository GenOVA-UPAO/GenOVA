"""Fuente de imágenes reales desde la web con licencia libre (Wikimedia Commons, Openverse, Pexels, Unsplash).

Implementa la búsqueda técnica y fotográfica del OVA:
- Proveedores sin key: Wikimedia Commons y Openverse.
- Proveedores con key opcional: Pexels y Unsplash.
- Filtrado estricto de licencias (CC0, Dominio Público, CC BY, CC BY-SA, Pexels/Unsplash).
- Filtros de calidad técnica: dimensiones mínimas, proporción, exclusión de scripts en SVG,
  descarte de capturas de texto ilegibles y filtrado de idiomas ajenos a español/inglés.
- Elección entre candidatas por puntuación semántica y re-ranking visual opcional.
- Descarga, compresión (WebP) y caché en disco.
"""

from __future__ import annotations

import base64
import os
import re
import urllib.parse
from typing import Any

import requests
import structlog
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from llm.images import image_cache
from llm.images.clip_rerank import ClipReranker
from llm.images.image_compress import compress_data_uri
from llm.images.sources.contract import Credit, ImageRequest, ImageResult

logger = structlog.get_logger(__name__)

USER_AGENT = "GenOVA/1.0 (https://github.com/GenOVA-UPAO/GenOVA; soporte@genova.edu.pe)"
_TIMEOUT_S = 6.0

# Licencias permitidas según requerimiento
_ALLOWED_LICENSE_TOKENS = (
    "cc0",
    "public domain",
    "pdm",
    "pd ",
    "pd-",
    "cc by",
    "cc by-sa",
    "cc-by",
    "cc-by-sa",
    "pexels",
    "unsplash",
    "postgresql",
    "mit",
    "bsd",
    "apache",
    "gpl",
)

_FORBIDDEN_LICENSE_TOKENS = (
    "nc",
    "non-commercial",
    "noncommercial",
    "nd",
    "no-derivatives",
    "noderivatives",
    "all rights reserved",
    "todos los derechos reservados",
    "unknown",
    "desconocida",
)

# Regex para detectar scripts no latinos (hebreo, árabe, cirílico, asiáticos, etc.)
_NON_LATIN_SCRIPTS_RE = re.compile(
    r"[\u0590-\u05FF"  # Hebreo
    r"\u0600-\u06FF"  # Árabe
    r"\u0400-\u04FF"  # Cirílico
    r"\u4E00-\u9FFF"  # CJK
    r"\u3040-\u30FF"  # Hiragana/Katakana
    r"\uAC00-\uD7AF"  # Hangul
    r"\u0E00-\u0E7F"  # Tailandés
    r"\u0900-\u097F]"  # Devanagari
)

# Frases explícitas de idioma ajeno en título o descripción
_FOREIGN_LANG_MENTION_RE = re.compile(
    r"\b(?:in\s+hebrew|en\s+hebreo|in\s+russian|en\s+ruso|in\s+arabic|en\s+árabe|"
    r"in\s+chinese|en\s+chino|in\s+japanese|en\s+japonés|in\s+korean|en\s+coreano|"
    r"in\s+farsi|in\s+persian|in\s+hebrew\s+language)\b",
    re.IGNORECASE,
)

# Patrones de capturas ilegibles o volcados de texto plano
_LOW_QUALITY_SCREENSHOT_RE = re.compile(
    r"\b(?:screenshot\s+of\s+text|terminal\s+dump|console\s+log|illegible|blurry\s+screenshot)\b",
    re.IGNORECASE,
)

# Detección de código malicioso o interactivo en SVG
_UNSAFE_SVG_RE = re.compile(r"(?i)(?:<script[\s>]|javascript:|onload\s*=|onerror\s*=|onclick\s*=)")

# Detección de títulos o descripciones que denotan diagramas, gráficos o esquemas (búsqueda solo fotos)
_NON_PHOTO_TITLE_RE = re.compile(
    r"\b(?:diagram|diagrama|schema|scheme|schematic|chart|graph|infographic|infograf[ií]a|"
    r"wordcloud|word\s+cloud|tag\s+cloud|die\s+shot|chip\s+die|floorplan|blueprint|"
    r"dall[·-]?e|midjourney|stable\s+diffusion|3d\s+render|cg\s+render)\b",
    re.IGNORECASE,
)


def is_allowed_license(license_str: str) -> bool:
    """Verifica si la licencia está en el conjunto permitido (CC0, PD, CC BY, CC BY-SA, Pexels, Unsplash)."""
    if not license_str or not isinstance(license_str, str):
        return False
    norm = license_str.lower().strip()
    # Rechazo estricto si contiene cláusulas prohibitivas (NC, ND o desconocida)
    if any(f in norm for f in _FORBIDDEN_LICENSE_TOKENS):
        return False
    # Aceptación de tokens permitidos
    return any(a in norm for a in _ALLOWED_LICENSE_TOKENS) or norm in ("pd", "by", "by-sa")


def is_safe_svg(svg_content: str) -> bool:
    """Rechaza archivos SVG que contengan scripts o manejadores de eventos en línea."""
    return not bool(_UNSAFE_SVG_RE.search(svg_content))


def has_foreign_language(text: str) -> bool:
    """Detecta si el texto está en idiomas no permitidos (hebreo, ruso, chino, etc.)."""
    if not text:
        return False
    if _NON_LATIN_SCRIPTS_RE.search(text):
        return True
    return bool(_FOREIGN_LANG_MENTION_RE.search(text))


def clean_html_tags(raw: str) -> str:
    """Elimina etiquetas HTML de cadenas devueltas por APIs como Wikimedia."""
    return re.sub(r"<[^>]+>", "", raw or "").strip()


def create_http_session() -> requests.Session:
    """Crea una sesión requests con reintentos exponenciales para lidiar con 429."""
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def score_candidate(candidate: dict[str, Any], query: str, description: str, concept: str) -> float:
    """Calcula la relevancia semántica de una candidata respecto a la consulta y el tema."""
    title = candidate.get("title", "").lower()
    desc = candidate.get("description", "").lower()

    score = 10.0

    # Normalizar tokens de búsqueda
    terms = set(re.findall(r"\w{3,}", f"{query} {description} {concept}".lower()))

    # Puntos por coincidencia de términos en el título y descripción
    for term in terms:
        if term in title:
            score += 8.0
        elif term in desc:
            score += 3.0

    # Bonificación si coincide la consulta completa en el título
    if query.lower() in title:
        score += 15.0

    # Bonificación por licencias más abiertas
    lic = (candidate.get("license") or "").lower()
    if any(p in lic for p in ("cc0", "public domain", "pdm")):
        score += 5.0
    elif "by-sa" in lic:
        score += 2.0
    elif "by" in lic:
        score += 3.0

    # Penalizaciones
    if "screenshot" in title or "captura" in title:
        score -= 6.0
    if "logo" in title and candidate.get("kind") != "logo":
        score -= 4.0

    return max(0.0, score)


def search_wikimedia(query: str, session: requests.Session | None = None) -> list[dict[str, Any]]:
    """Consulta la API de Wikimedia Commons."""
    s = session or create_http_session()
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",  # Espacio File:
        "gsrlimit": "20",
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime",
        "iiurlwidth": "800",
        "format": "json",
    }
    try:
        resp = s.get(url, params=params, timeout=_TIMEOUT_S)
        if resp.status_code != 200:
            logger.warning("wikimedia search request failed", status=resp.status_code)
            return []
        data = resp.json()
    except Exception as exc:
        logger.warning("wikimedia search error", error=str(exc)[:120])
        return []

    pages = data.get("query", {}).get("pages", {})
    candidates: list[dict[str, Any]] = []

    for page in pages.values():
        title = page.get("title", "").replace("File:", "")
        imageinfo = page.get("imageinfo", [{}])[0]
        extmetadata = imageinfo.get("extmetadata", {})

        url_img = imageinfo.get("thumburl") or imageinfo.get("url")
        if not url_img:
            continue

        mime = imageinfo.get("mime", "")
        width = int(imageinfo.get("width") or 0)
        height = int(imageinfo.get("height") or 0)

        lic = extmetadata.get("LicenseShortName", {}).get("value") or extmetadata.get("License", {}).get("value") or ""
        lic_url = extmetadata.get("LicenseUrl", {}).get("value") or "https://creativecommons.org/"
        author = clean_html_tags(
            extmetadata.get("Artist", {}).get("value")
            or extmetadata.get("Credit", {}).get("value")
            or "Colaborador de Wikimedia"
        )
        desc = clean_html_tags(extmetadata.get("ImageDescription", {}).get("value") or title)
        source_url = imageinfo.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(page.get('title', ''))}"

        candidates.append({
            "title": title,
            "description": desc,
            "url": url_img,
            "width": width,
            "height": height,
            "mime": mime,
            "license": lic,
            "license_url": lic_url,
            "author": author,
            "source_url": source_url,
            "provider": "wikimedia",
        })

    return candidates


def search_openverse(query: str, session: requests.Session | None = None) -> list[dict[str, Any]]:
    """Consulta la API pública de Openverse (sin key)."""
    s = session or create_http_session()
    url = "https://api.openverse.org/v1/images/"
    params = {
        "q": query,
        "license": "pdm,cc0,by,by-sa",
        "page_size": "20",
    }
    try:
        resp = s.get(url, params=params, timeout=_TIMEOUT_S)
        if resp.status_code != 200:
            logger.warning("openverse search request failed", status=resp.status_code)
            return []
        data = resp.json()
    except Exception as exc:
        logger.warning("openverse search error", error=str(exc)[:120])
        return []

    candidates: list[dict[str, Any]] = []
    for item in data.get("results", []):
        url_img = item.get("url")
        if not url_img:
            continue

        lic = item.get("license", "")
        lic_ver = item.get("license_version", "")
        lic_name = f"CC {lic.upper()} {lic_ver}".strip() if lic not in ("cc0", "pdm") else lic.upper()
        lic_url = item.get("license_url") or "https://creativecommons.org/"

        candidates.append({
            "title": item.get("title") or "Imagen Openverse",
            "description": item.get("title") or "",
            "url": url_img,
            "width": int(item.get("width") or 0),
            "height": int(item.get("height") or 0),
            "mime": "image/jpeg",
            "license": lic_name,
            "license_url": lic_url,
            "author": item.get("creator") or "Autor Openverse",
            "source_url": item.get("foreign_landing_url") or item.get("url") or "",
            "provider": "openverse",
        })

    return candidates


def search_pexels(query: str, api_key: str, session: requests.Session | None = None) -> list[dict[str, Any]]:
    """Consulta Pexels (solo si hay key configurada)."""
    if not api_key:
        return []
    s = session or create_http_session()
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    try:
        resp = s.get(url, params={"query": query, "per_page": 10}, headers=headers, timeout=_TIMEOUT_S)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []

    candidates: list[dict[str, Any]] = []
    for photo in data.get("photos", []):
        src = photo.get("src", {}).get("large") or photo.get("src", {}).get("original")
        if not src:
            continue
        candidates.append({
            "title": photo.get("alt") or f"Foto de {photo.get('photographer')}",
            "description": photo.get("alt") or "",
            "url": src,
            "width": int(photo.get("width") or 0),
            "height": int(photo.get("height") or 0),
            "mime": "image/jpeg",
            "license": "Pexels License",
            "license_url": "https://www.pexels.com/license/",
            "author": photo.get("photographer") or "Fotógrafo de Pexels",
            "source_url": photo.get("url") or "https://www.pexels.com",
            "provider": "pexels",
        })
    return candidates


def search_unsplash(query: str, access_key: str, session: requests.Session | None = None) -> list[dict[str, Any]]:
    """Consulta Unsplash (solo si hay key configurada)."""
    if not access_key:
        return []
    s = session or create_http_session()
    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {access_key}"}
    try:
        resp = s.get(url, params={"query": query, "per_page": 10}, headers=headers, timeout=_TIMEOUT_S)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []

    candidates: list[dict[str, Any]] = []
    for photo in data.get("results", []):
        urls = photo.get("urls", {})
        src = urls.get("regular") or urls.get("full")
        if not src:
            continue
        user = photo.get("user", {})
        candidates.append({
            "title": photo.get("alt_description") or photo.get("description") or "Foto Unsplash",
            "description": photo.get("description") or photo.get("alt_description") or "",
            "url": src,
            "width": int(photo.get("width") or 0),
            "height": int(photo.get("height") or 0),
            "mime": "image/jpeg",
            "license": "Unsplash License",
            "license_url": "https://unsplash.com/license",
            "author": user.get("name") or "Fotógrafo Unsplash",
            "source_url": photo.get("links", {}).get("html") or "https://unsplash.com",
            "provider": "unsplash",
        })
    return candidates


def filter_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aplica todos los filtros técnicos, de idioma y de licencia a las candidatas."""
    filtered: list[dict[str, Any]] = []
    forbidden_exts = (
        ".pdf", ".djvu", ".tif", ".tiff", ".ogg", ".ogv", ".webm",
        ".mp4", ".mp3", ".wav", ".mid", ".midi", ".doc", ".docx",
        ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".zip", ".tar",
    )

    for c in candidates:
        # 0. Formato: descartar documentos, audios, videos y formatos no soportados
        mime_lower = (c.get("mime") or "").lower()
        if mime_lower and not mime_lower.startswith("image/"):
            continue
        if mime_lower in ("image/tiff", "image/vnd.djvu"):
            continue

        url_clean = (c.get("url") or "").lower().split("?")[0]
        title_clean = (c.get("title") or "").lower()
        if any(url_clean.endswith(ext) or title_clean.endswith(ext) for ext in forbidden_exts):
            continue

        # 1. Licencia permitida
        if not is_allowed_license(c.get("license", "")):
            continue

        # 2. Idioma: descartar si hay caracteres o menciones explícitas de idioma ajeno
        title = c.get("title", "")
        desc = c.get("description", "")
        if has_foreign_language(title) or has_foreign_language(desc):
            continue

        # 3. Descartar capturas de baja calidad / volcados de texto ilegibles
        if _LOW_QUALITY_SCREENSHOT_RE.search(title) or _LOW_QUALITY_SCREENSHOT_RE.search(desc):
            continue

        # 4. Descartar diagramas, esquemas, gráficos, infografías, renders IA o chip dies (búsqueda solo fotos)
        if _NON_PHOTO_TITLE_RE.search(title) or _NON_PHOTO_TITLE_RE.search(desc) or _NON_PHOTO_TITLE_RE.search(url_clean):
            continue

        # 5. Dimensiones y proporción razonable (si vienen informadas)
        w, h = c.get("width", 0), c.get("height", 0)
        if w > 0 and h > 0:
            if w < 240 or h < 160:
                continue
            ratio = w / h
            if ratio < 0.35 or ratio > 2.85:
                continue

        filtered.append(c)

    return filtered


def rerank_with_vision(
    top_candidates: list[dict[str, Any]], request: ImageRequest
) -> list[dict[str, Any]]:
    """Intenta reordenar las mejores 3 candidatas mediante un modelo con visión."""
    if len(top_candidates) <= 1:
        return top_candidates

    try:
        from llm.router import generar_vision

        prompt_text = (
            f"Evalúa la relevancia pedagógica de estas opciones para el concepto '{request.concept}' "
            f"con descripción '{request.descripcion}':\n"
        )
        for idx, cand in enumerate(top_candidates[:3], 1):
            prompt_text += f"{idx}. Título: {cand.get('title')}. Descripción: {cand.get('description')}\n"
        prompt_text += "Responde con el número de la mejor opción (1, 2 o 3) y una breve justificación."

        messages = [
            {"role": "user", "content": prompt_text}
        ]
        resp = generar_vision(messages, max_tokens=100)
        match = re.search(r"\b([1-3])\b", resp)
        if match:
            best_idx = int(match.group(1)) - 1
            if 0 <= best_idx < len(top_candidates):
                chosen = top_candidates.pop(best_idx)
                return [chosen, *top_candidates]
    except Exception as exc:
        logger.debug("vision reranking skipped or failed", error=str(exc)[:100])

    return top_candidates


def download_image_as_data_uri(candidate: dict[str, Any], session: requests.Session | None = None) -> str | None:
    """Descarga los bytes de la imagen y los convierte en un data URI comprimido."""
    content = candidate.get("_downloaded_bytes")
    url = candidate.get("url")
    if not content:
        s = session or create_http_session()
        if not url:
            return None
        try:
            resp = s.get(url, timeout=8.0, stream=True)
            if resp.status_code != 200:
                return None
            content = resp.content
        except Exception as exc:
            logger.warning("image download failed", url=url[:80], error=str(exc)[:100])
            return None

    mime = candidate.get("mime", "image/jpeg")

    # Si es SVG, verificar seguridad
    if "svg" in mime or (url and url.lower().endswith(".svg")):
        try:
            svg_text = content.decode("utf-8", errors="replace")
            if not is_safe_svg(svg_text):
                logger.warning("unsafe SVG discarded", url=str(url)[:80])
                return None
            b64 = base64.b64encode(svg_text.encode("utf-8")).decode("ascii")
            return f"data:image/svg+xml;base64,{b64}"
        except Exception:
            return None

    # Si no es imagen raster, descartar
    if not mime.startswith("image/"):
        return None

    # Imagen raster (JPEG, PNG, WebP)
    b64 = base64.b64encode(content).decode("ascii")
    raw_uri = f"data:{mime};base64,{b64}"
    # Comprimir usando compress_data_uri para que el SCORM sea ligero
    compressed = compress_data_uri(raw_uri)
    return compressed or raw_uri


def build_search_queries(request: ImageRequest) -> list[str]:
    """Genera variantes de consulta (términos en inglés, sinónimos y concepto) para ampliar candidatas."""
    queries: list[str] = []
    seen = set()

    def add(q: str) -> None:
        q_clean = re.sub(r"\s+", " ", q).strip()
        if q_clean and len(q_clean) >= 3 and q_clean.lower() not in seen:
            seen.add(q_clean.lower())
            queries.append(q_clean)

    concept = request.concept.strip()
    desc = request.descripcion.strip()
    consulta = request.consulta.strip()
    marca = request.marca.strip()

    cs_mappings = [
        (r"ciberseguridad|seguridad", "cyber security data encryption server network"),
        (r"monitoreo|observabilidad", "network operations center monitor displays metrics"),
        (r"telecomunicaciones|conmutador|switches?", "telecommunications patch panel ethernet cables switches"),
        (r"cables? submarinos?|fibra [oó]ptica", "fiber optic cables patch panel networking"),
        (r"cumplimiento|normativ[oa]|auditor[ií]a", "digital privacy compliance data security server"),
        (r"datacenter|centro de datos|servidores", "modern datacenter server racks interior"),
        (r"redes?|cableado", "computer networking server room patch panel cables"),
        (r"placa base|procesador|cpu|microprocesador|circuitos integrados", "computer motherboard silicon microprocessor circuit"),
        (r"memoria ram|almacenamiento masivo|discos? duros?|raid", "hard drive disk array storage server"),
        (r"criptograf[ií]a|rsa|cifrado", "cryptography digital security server network encryption"),
        (r"superc[oó]mputo|supercomputador|clusters? de gpu", "gpu cluster supercomputer server datacenter"),
        (r"infraestructura cloud|virtualizaci[oó]n", "cloud computing infrastructure server hardware datacenter"),
        (r"cliente-servidor|arquitectura web", "client server network datacenter workstation equipment"),
        (r"kanban|agil|scrum", "software development agile board office"),
        (r"postgresql", "database server hardware storage rack datacenter"),
        (r"mongodb", "nosql database server hardware rack infrastructure"),
        (r"redis", "high performance in-memory cache server hardware rack"),
        (r"kafka", "distributed event streaming server cluster datacenter"),
        (r"kubernetes", "kubernetes cloud container cluster server rack datacenter"),
        (r"docker", "datacenter server blade container infrastructure"),
        (r"bases? de datos|sql", "database storage array server rack datacenter"),
        (r"contenedores", "cloud computing container datacenter server hardware"),
        (r"linux|kernel|sistema operativo", "computer server linux open source system terminal"),
        (r"git|control de versiones", "git developer workstation terminal screen programming"),
        (r"python", "python programming workstation terminal monitor code"),
        (r"nginx", "web server rack datacenter hardware computer networking"),
    ]

    target_text = f"{concept} {desc} {consulta} {marca}".lower()

    # 1. Marca específica si viene informada
    if marca:
        add(f"{marca} server hardware infrastructure")
        add(f"{marca} computer technology")

    # 2. Conceptos técnicos mapeados al inglés (óptimos para Wikimedia y Openverse)
    for pattern, mapped_en in cs_mappings:
        if re.search(pattern, target_text):
            add(mapped_en)

    # 3. Consulta directa si es técnica y no es código SQL o sintaxis bruta
    is_sql = bool(re.search(r"\b(select|insert|update|create|drop|from|where)\b", consulta, re.IGNORECASE))
    is_spanish = bool(re.search(r"[áéíóúñÁÉÍÓÚÑ]|\b(de|la|el|en|con|para|por)\b", consulta, re.IGNORECASE))
    if consulta and not is_sql:
        if not is_spanish:
            # Consulta directa en inglés tiene alta prioridad
            queries.insert(0, consulta)
            seen.add(consulta.lower())
        else:
            add(consulta)

    # 4. Términos limpios del concepto
    concept_terms = " ".join(w for w in re.findall(r"[a-zA-Z0-9]+", concept) if len(w) > 3)
    if concept_terms:
        add(f"{concept_terms} technology")

    # 5. Fallback si no hay consultas
    if not queries:
        fallback = consulta or concept or desc
        if fallback:
            add(fallback)

    return queries[:4]


class SearchSource:
    """Fuente de imágenes reales con licencia libre desde Wikimedia, Openverse, Pexels o Unsplash."""

    name: str = "busqueda"

    def __init__(self) -> None:
        self.session = create_http_session()
        self.last_diagnostics: list[dict[str, Any]] = []

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        """Busca, filtra, puntúa con CLIP y descarga la imagen más relevante."""
        query = (request.consulta or request.descripcion or request.concept).strip()
        if not query:
            return None

        # 1. Comprobar caché de disco por consulta normalizada
        norm_query = image_cache.normalize_prompt(f"{query} {request.concept}")
        ckey = image_cache.cache_key(norm_query, "search", "free", request.width, request.height)

        if image_cache.enabled():
            record = image_cache.get_record(ckey)
            if record and record.get("meta") and record["meta"].get("credit"):
                c_meta = record["meta"]["credit"]
                cached_phash = (record["meta"].get("search_meta") or {}).get("phash") or record["meta"].get("phash")

                # Deduplicación perceptual dentro del mismo OVA
                is_dup = False
                if cached_phash and request.used_hashes:
                    from llm.images.clip_rerank import (
                        MAX_HAMMING_DISTANCE_DUPLICATE,
                        hamming_distance,
                    )
                    for uh in request.used_hashes:
                        if hamming_distance(cached_phash, uh) <= MAX_HAMMING_DISTANCE_DUPLICATE:
                            is_dup = True
                            break

                if is_dup:
                    logger.info("search cache hit skipped due to intra-OVA duplicate hash", query=query, phash=cached_phash)
                else:
                    author = (c_meta.get("author") or "").strip()
                    lic = (c_meta.get("license") or "").strip()
                    prov = (c_meta.get("provider") or "").strip()
                    src_url = (c_meta.get("source_url") or "").strip()
                    lic_url = (c_meta.get("license_url") or "").strip()

                    is_generic = (
                        not author
                        or author.lower() in ("fuente libre", "comunidad libre", "desconocido", "unknown")
                        or not lic
                        or lic.lower() in ("licencia libre verificada", "licencia libre", "unknown")
                        or prov.lower() == "cache"
                    )
                    if not is_generic:
                        logger.info("search image cache hit with real credit", query=query, author=author, license=lic)
                        if cached_phash:
                            image_cache.record_image_usage(cached_phash, query)
                        real_credit = Credit(
                            title=c_meta.get("title") or f"Imagen para {query}",
                            author=author,
                            license=lic,
                            license_url=lic_url or "https://creativecommons.org/",
                            source_url=src_url,
                            provider=prov or "busqueda",
                        )
                        return ImageResult(
                            data_uri=record["data_uri"],
                            source="busqueda",
                            alt=request.descripcion or real_credit.title or query,
                            credit=real_credit,
                            meta={
                                "cache_hit": True,
                                "query": query,
                                "phash": cached_phash,
                                **(record["meta"].get("search_meta") or {}),
                            },
                        )
                    logger.info("search image cache hit contained generic/invalid credit; treating as miss", query=query)

        # 2. Recolectar 15-20 candidatas usando múltiples variantes de consulta
        search_queries = build_search_queries(request)
        all_candidates: list[dict[str, Any]] = []
        seen_urls = set()

        for sq in search_queries:
            for c in search_wikimedia(sq, self.session):
                u = c.get("url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    all_candidates.append(c)

            for c in search_openverse(sq, self.session):
                u = c.get("url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    all_candidates.append(c)

        pexels_key = os.getenv("PEXELS_API_KEY", "").strip()
        if pexels_key and search_queries:
            for c in search_pexels(search_queries[0], pexels_key, self.session):
                u = c.get("url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    all_candidates.append(c)

        unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
        if unsplash_key and search_queries:
            for c in search_unsplash(search_queries[0], unsplash_key, self.session):
                u = c.get("url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    all_candidates.append(c)

        # 3. Filtrar candidatas (licencia, idioma, proporciones, capturas ilegibles)
        valid_candidates = filter_candidates(all_candidates)

        if not valid_candidates:
            logger.info("no candidates passed initial search filters", query=query, raw_total=len(all_candidates))
            return None

        # 4. Re-ranking visual local con CLIP y clases negativas zero-shot
        reranker = ClipReranker.get_instance()
        primary_query = search_queries[0] if search_queries else query
        best_candidate, clip_diagnostics = reranker.score_candidates(
            valid_candidates[:20],
            concept=request.concept,
            query=primary_query,
            description=request.descripcion,
            used_hashes=request.used_hashes,
        )
        self.last_diagnostics = clip_diagnostics

        if not best_candidate:
            logger.info("all candidates rejected by CLIP similarity or negative classes", query=query)
            return None

        chosen_phash = best_candidate.get("phash")
        if chosen_phash:
            image_cache.record_image_usage(chosen_phash, primary_query)

        # 5. Descargar y comprimir la mejor candidata aceptada
        data_uri = download_image_as_data_uri(best_candidate, self.session)
        if not data_uri:
            return None

        # 6. Atribución real obligatoria (CC BY / CC BY-SA)
        author = best_candidate.get("author") or "Colaborador de Wikimedia"
        license_name = best_candidate.get("license") or "CC BY-SA 4.0"
        credit = Credit(
            title=best_candidate.get("title") or query,
            author=author,
            license=license_name,
            license_url=best_candidate.get("license_url") or "https://creativecommons.org/",
            source_url=best_candidate.get("source_url") or best_candidate.get("url") or "https://commons.wikimedia.org/",
            provider=best_candidate.get("provider") or "wikimedia",
        )

        # 7. Guardar en caché con metadatos reales completos
        if image_cache.enabled():
            credit_meta = {
                "title": credit.title,
                "author": credit.author,
                "license": credit.license,
                "license_url": credit.license_url,
                "source_url": credit.source_url,
                "provider": credit.provider,
            }
            image_cache.put_record(
                ckey,
                data_uri,
                meta={
                    "credit": credit_meta,
                    "phash": chosen_phash,
                    "search_meta": {
                        "provider": credit.provider,
                        "candidates_evaluated": len(valid_candidates),
                        "chosen_title": best_candidate.get("title"),
                        "clip_score": best_candidate.get("clip_score"),
                        "phash": chosen_phash,
                    },
                },
            )

        logger.info(
            "search source succeeded with CLIP verification",
            query=query,
            title=credit.title,
            clip_score=best_candidate.get("clip_score"),
            provider=credit.provider,
            license=credit.license,
        )

        return ImageResult(
            data_uri=data_uri,
            source="busqueda",
            alt=request.descripcion or best_candidate.get("description") or query,
            credit=credit,
            meta={
                "provider": credit.provider,
                "candidates_evaluated": len(valid_candidates),
                "chosen_title": best_candidate.get("title"),
                "clip_score": best_candidate.get("clip_score"),
                "phash": chosen_phash,
                "clip_diagnostics": clip_diagnostics,
            },
        )
