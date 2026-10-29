"""Utilidades HTML para las plantillas: escape, documento y datos para el JS.

Regla de seguridad: TODO texto que viene del LLM pasa por `esc` (contenido y
atributos). Los datos que necesita el JS van en `json_data`, que escapa `<` para
que un `</script>` en el texto no cierre la etiqueta.
"""

from __future__ import annotations

import contextlib
import html as _html
import json
import re
from typing import Any

from .icons import js_prelude


def esc(value: Any) -> str:
    return _html.escape("" if value is None else str(value), quote=True)


def paragraphs(text: Any) -> str:
    """Texto plano (con saltos de línea) -> <p> escapados."""
    parts = [p.strip() for p in str(text or "").split("\n") if p.strip()]
    return "".join(f"<p>{esc(p)}</p>" for p in parts)


def ul(items: list, ordered: bool = False) -> str:
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{esc(i)}</li>" for i in items or []) + f"</{tag}>"


def json_data(data: Any, element_id: str = "ova-data") -> str:
    raw = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/json" id="{esc(element_id)}">{raw}</script>'


def script(js: str) -> str:
    """JS de la plantilla, diferido a DOMContentLoaded: el runtime de componentes
    se inyecta al final del documento y antes de eso los upao-* no tienen métodos
    (`prog.set is not a function`). Si el JS pide `ovaIcon('nombre')`, se le
    antepone la tabla con esos iconos SVG."""
    return (
        "<script>\ndocument.addEventListener('DOMContentLoaded', function () {\n"
        f"{js_prelude(js)}{js.strip()}\n}});\n</script>"
    )


ENGINE_META = "genova-engine"


ENGINE_PARAMS_META = "genova-engine-params"


def document(title: str, body: str, *, lang: str = "es", key: str = "", info: dict | None = None) -> str:
    """`info` (params decididos, métricas del revisor) viaja en un meta para que la
    valoración del docente se pueda ligar a la plantilla y a la decisión sin
    persistir nada más (ver `engine_info`)."""
    info_meta = (
        f'<meta name="{ENGINE_PARAMS_META}" content="{esc(json.dumps(info, ensure_ascii=False))}">\n' if info else ""
    )
    return (
        f'<!DOCTYPE html>\n<html lang="{lang}">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<meta name="{ENGINE_META}" content="template:{esc(key)}">\n'
        f"{info_meta}"
        f"<title>{esc(title)}</title>\n</head>\n<body>\n"
        f'<main class="ova-container ova-stack">\n{body}\n</main>\n</body>\n</html>\n'
    )


# JS compartido: progreso + desbloqueo de upao-complete. Las plantillas lo
# reutilizan en vez de reescribirlo (era la fuente nº1 de JS roto del LLM).
PROGRESS_JS = """
(function(){
  const prog = document.getElementById('prog');
  const done = new Set();
  window.ovaMark = function(key){
    if (done.has(key)) return;
    done.add(key);
    if (prog) prog.set(done.size);
    const total = prog ? Number(prog.getAttribute('total')) : 0;
    if (total && done.size >= total) {
      document.querySelectorAll('upao-complete[locked]').forEach(b => b.unlock && b.unlock());
    }
  };
})();
"""


def is_template_html(html: str) -> bool:
    """El recurso salió de una plantilla: su HTML no debe reescribirlo un LLM."""
    return f'name="{ENGINE_META}"' in (html or "")[:2000]


def engine_info(html: str) -> dict:
    """{"key": "engage_01", "params": {...}, "review": {...}} leído del HTML de una plantilla.
    Vacío si el recurso no salió del motor."""
    # El runtime UPAO inyecta ~8 KB de CSS antes de los meta: se busca en todo el <head>.
    html = html or ""
    head = html[: html.find("</head>") if "</head>" in html else 60000]
    m = re.search(rf'<meta name="{ENGINE_META}" content="template:([^"]*)"', head)
    if not m:
        return {}
    out: dict = {"key": _html.unescape(m.group(1))}
    p = re.search(rf'<meta name="{ENGINE_PARAMS_META}" content="([^"]*)"', head)
    if p:
        with contextlib.suppress(ValueError):
            out.update(json.loads(_html.unescape(p.group(1))))
    return out


IMAGE_FIGURE_CSS = """
<style>
.ova-image-figure {
  margin: 16px 0;
  text-align: center;
  background: var(--surface-2, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: var(--radius, 12px);
  padding: 12px;
  overflow: hidden;
}
.ova-figure-img {
  max-width: 100%;
  height: auto;
  max-height: 420px;
  border-radius: 8px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
.ova-image-credit {
  margin-top: 8px;
  font-size: 0.78rem;
  color: var(--text-muted, #64748B);
}
.ova-image-credit a {
  color: inherit;
  text-decoration: underline;
}
.ova-credits-section {
  margin-top: 28px;
  padding: 16px;
  background: var(--surface-2, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: var(--radius, 8px);
  font-size: 0.85rem;
}
.ova-credits-section h4 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--primary, #0A3D91);
}
.ova-credits-section p {
  margin: 0;
  color: var(--text-muted, #475569);
}
</style>
"""


# Textos de relleno: nunca son un autor, una licencia ni una URL de origen reales.
GENERIC_CREDIT_VALUES: frozenset[str] = frozenset({
    "autor", "author", "licencia libre", "free license", "licencia", "license", "web", "cache",
    "fuente libre", "licencia libre verificada", "desconocido", "desconocida", "unknown",
    "anonimo", "anónimo", "anonymous", "colaborador de wikimedia", "autor openverse",
    "internet", "google", "cc", "creative commons", "n/a", "none", "null", "undefined", "#",
    "imagen", "image",
})
# Plataformas de donde sale la imagen: son un proveedor legítimo, pero nunca su autor.
CREDIT_PROVIDER_NAMES: frozenset[str] = frozenset({
    "wikimedia", "wikimedia commons", "wikipedia", "openverse", "flickr", "pexels", "unsplash",
})
_PROVIDER_LABELS = {
    "wikimedia": "Wikimedia Commons",
    "openverse": "Openverse",
    "flickr": "Flickr",
    "pexels": "Pexels",
    "unsplash": "Unsplash",
    "simple-icons": "Simple Icons",
}


def is_generic_credit_value(val: Any) -> bool:
    """Verifica si un campo de crédito es nulo, vacío o un texto de relleno inventado."""
    if not val or not isinstance(val, str):
        return True
    clean = val.strip().lower()
    return not clean or clean in GENERIC_CREDIT_VALUES


def _credit_field(credit: Any, *names: str) -> str:
    """Primer campo no vacío del crédito (``Credit`` o dict), sin espacios."""
    for name in names:
        val = credit.get(name) if isinstance(credit, dict) else getattr(credit, name, None)
        if val:
            return str(val).strip()
    return ""


def _is_http_url(url: str) -> bool:
    return url.startswith(("http://", "https://"))


def is_valid_third_party_credit(credit: Any) -> bool:
    """Valida si un crédito de terceros tiene autor, licencia y URL de origen legítimos (no genéricos)."""
    if not credit:
        return False
    # El nombre de la plataforma no es ni el autor ni la licencia de la obra.
    author, lic = _credit_field(credit, "author"), _credit_field(credit, "license")
    src_url = _credit_field(credit, "source_url", "url")
    return (
        not any(is_generic_credit_value(v) or v.lower() in CREDIT_PROVIDER_NAMES for v in (author, lic))
        and not is_generic_credit_value(src_url)
        and _is_http_url(src_url)
    )


def _credit_parts(credit: Any, default_provider: str) -> dict[str, str]:
    """Campos escapados de un crédito válido para el pie y la sección de créditos.

    Los enlaces son siempre http(s): sin ``license_url`` válida, la licencia enlaza
    al origen (nunca a ``#``). El proveedor conserva su nombre real (Wikimedia
    Commons, Openverse…) y solo si falta o es genérico se usa ``default_provider``.
    """
    source_url = _credit_field(credit, "source_url", "url")
    license_url = _credit_field(credit, "license_url")
    provider = _credit_field(credit, "provider")
    label = (
        default_provider
        if is_generic_credit_value(provider)
        else _PROVIDER_LABELS.get(provider.lower(), provider)
    )
    return {
        "author": esc(_credit_field(credit, "author")),
        "license": esc(_credit_field(credit, "license")),
        "license_url": esc(license_url if _is_http_url(license_url) else source_url),
        "source_url": esc(source_url),
        "provider": esc(label),
    }


def _format_figure_caption(credit: Any, default_prov: str = "origen") -> str:
    """Genera el bloque <figcaption> con autor, licencia y origen si el crédito es válido."""
    if not is_valid_third_party_credit(credit):
        return ""
    c = _credit_parts(credit, default_prov)
    return (
        f'<figcaption class="ova-image-credit">'
        f'<span>{c["author"]}</span> · '
        f'<a href="{c["license_url"]}" target="_blank" rel="noopener noreferrer">{c["license"]}</a> · '
        f'<a href="{c["source_url"]}" target="_blank" rel="noopener noreferrer">{c["provider"]}</a>'
        f'</figcaption>'
    )


# Fuentes propias o con licencia de marca (``ImageResult.source``): no exigen crédito.
_CREDIT_EXEMPT_SOURCES = frozenset({"diagrama", "logo", "generada", "personaje"})
# Sin fuente conocida (datos antiguos, llamadas directas) decide la pista ``tipo`` del LLM.
_CREDIT_EXEMPT_TIPOS = frozenset({"diagrama", "logo", "escena", "personaje"})
_CREDIT_EXEMPT_FLAGS = ("is_diagram", "is_logo", "is_generated", "diagrama")
# Producidas por GenOVA: nunca aparecen en la sección de créditos.
_OWN_SOURCES = frozenset({"diagrama", "generada", "personaje"})
_OWN_TIPOS = frozenset({"diagrama", "escena", "personaje"})


def _is_credit_exempt(img_data: Any, src: Any, kwargs: dict[str, Any]) -> bool:
    """Si la imagen puede mostrarse sin crédito de terceros.

    Manda la fuente real (``image_source``): un 'foto' que el decisor resolvió con IA
    (``generada``) no lleva crédito y se muestra; uno de ``busqueda`` lo exige aunque la
    pista ``tipo`` dijera 'logo'. ``tipo`` y los indicadores solo deciden sin fuente.
    """
    data = img_data if isinstance(img_data, dict) else {}
    source = str(kwargs.get("image_source") or kwargs.get("source") or data.get("source") or data.get("image_source") or "")
    if source:
        return source in _CREDIT_EXEMPT_SOURCES
    tipo = str(kwargs.get("tipo") or data.get("tipo") or "")
    return (
        tipo in _CREDIT_EXEMPT_TIPOS
        or any(kwargs.get(flag) for flag in _CREDIT_EXEMPT_FLAGS)
        or bool(data.get("diagrama"))
        or (isinstance(src, str) and src.startswith("data:image/svg"))
    )


def render_item_figure(item: Any, **kwargs: Any) -> str:
    """Figura de la imagen de un ítem enriquecido por ``llm.images.image_enrich``.

    Lee del mismo dict la petición (``imagen``), el marcador (``image_placeholder``),
    el crédito y la fuente real (``image_source``), para que ninguna plantilla olvide
    pasar la fuente: sin ella, una 'foto' generada con IA (sin crédito) se descartaría.
    ``kwargs`` (``alt_fallback``, ``extra_class``, ``concept``…) van a ``render_image_figure``.
    """
    if not isinstance(item, dict):
        return ""
    imagen = item.get("imagen")
    return render_image_figure(
        imagen if isinstance(imagen, dict) else None,
        item.get("image_placeholder"),
        item.get("image_credit"),
        image_source=item.get("image_source") or "",
        **kwargs,
    )


def render_image_figure(
    img_data: dict | None = None,
    src: str | None = None,
    credit: Any = None,
    *,
    alt_fallback: str = "Ilustración conceptual",
    extra_class: str = "",
    concept: str = "",
    **kwargs: Any,
) -> str:
    """Renderiza una figura con imagen y atribución breve.

    Si a una imagen de terceros le falta autor, licencia o URL de origen, NO se muestra
    la imagen (se trata como sin imagen). Los diagramas, logos con licencia propia y
    generadas siguen sin crédito. Nunca se usan textos genéricos en créditos.
    """
    if not src and isinstance(img_data, dict):
        src = img_data.get("src") or img_data.get("image_placeholder")

    if not src:
        return ""

    if concept and alt_fallback == "Ilustración conceptual":
        alt_fallback = f"Ilustración de {concept}"
    alt = esc((img_data or {}).get("descripcion") or alt_fallback)
    cls = f"ova-image-figure {extra_class}".strip()

    is_exempt = _is_credit_exempt(img_data, src, kwargs)

    if not credit and isinstance(img_data, dict):
        credit = img_data.get("image_credit") or img_data.get("credit")

    # Diagramas, logos con licencia propia y generadas siguen sin crédito
    if is_exempt:
        caption = _format_figure_caption(credit, default_prov="marca")
        return (
            f'<figure class="{cls}">'
            f'<img class="ova-figure-img" src="{esc(src)}" alt="{alt}" loading="lazy">'
            f"{caption}"
            f'</figure>'
        )

    # Imagen de terceros: autor, licencia y URL de origen son estrictamente obligatorios
    if not is_valid_third_party_credit(credit):
        return ""

    caption = _format_figure_caption(credit, default_prov="origen")
    return (
        f'<figure class="{cls}">'
        f'<img class="ova-figure-img" src="{esc(src)}" alt="{alt}" loading="lazy">'
        f"{caption}"
        f'</figure>'
    )


def render_credits_section(data: dict | list | None) -> str:
    """Renderiza la sección de créditos al pie del recurso si existe alguna atribución legítima."""
    if not data:
        return ""

    items = data if isinstance(data, list) else [data]
    valid_entries: list[tuple[str, str, str, str, str, str]] = []

    for item in items:
        if not isinstance(item, dict):
            continue

        # Imágenes propias (diagrama, generada, personaje) no van a créditos. Como en la
        # figura, manda la fuente real: un 'escena' resuelto por búsqueda sí se acredita.
        source = item.get("image_source") or item.get("source") or ""
        tipo = (item.get("imagen") or {}).get("tipo") if isinstance(item.get("imagen"), dict) else item.get("tipo")
        if source in _OWN_SOURCES or (not source and tipo in _OWN_TIPOS):
            continue

        credit = item.get("image_credit") or item.get("credit")
        if not credit and ("author" in item or "license" in item):
            credit = item

        if not is_valid_third_party_credit(credit):
            continue

        c = _credit_parts(credit, "origen")
        raw_title = _credit_field(credit, "title")
        title = esc(raw_title) if not is_generic_credit_value(raw_title) else "Fotografía técnica"
        valid_entries.append((title, c["author"], c["license_url"], c["license"], c["source_url"], c["provider"]))

    if not valid_entries:
        return ""

    paragraphs = "\n".join(
        f'<p><strong>{title}</strong>: Por {author} · '
        f'<a href="{license_url}" target="_blank" rel="noopener noreferrer">{license_name}</a> · '
        f'Fuente: <a href="{source_url}" target="_blank" rel="noopener noreferrer">{provider}</a></p>'
        for title, author, license_url, license_name, source_url, provider in valid_entries
    )

    return (
        f'<section class="ova-credits-section">\n'
        f'<h4>Créditos de imágenes</h4>\n'
        f'{paragraphs}\n'
        f'</section>'
    )
