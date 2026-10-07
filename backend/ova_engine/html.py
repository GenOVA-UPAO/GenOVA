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


def render_image_figure(
    img_data: dict | None = None,
    src: str | None = None,
    credit: Any = None,
    credit_html: str = "",
    *,
    alt_fallback: str = "Ilustración conceptual",
    extra_class: str = "",
    concept: str = "",
    **kwargs: Any,
) -> str:
    """Renderiza una figura con imagen y atribución breve; sin imagen devuelve cadena vacía."""
    if concept and alt_fallback == "Ilustración conceptual":
        alt_fallback = f"Ilustración de {concept}"
    alt = esc((img_data or {}).get("descripcion") or alt_fallback)
    cls = f"ova-image-figure {extra_class}".strip()

    if not src and isinstance(img_data, dict):
        src = img_data.get("src") or img_data.get("image_placeholder")

    if src:
        caption = credit_html
        if not caption and credit:
            author = esc(getattr(credit, "author", "") or (credit.get("author") if isinstance(credit, dict) else "") or "Autor")
            lic = esc(getattr(credit, "license", "") or (credit.get("license") if isinstance(credit, dict) else "") or "Licencia libre")
            lic_url = esc(getattr(credit, "license_url", "") or (credit.get("license_url") if isinstance(credit, dict) else "") or "https://creativecommons.org/")
            prov = esc(getattr(credit, "provider", "") or (credit.get("provider") if isinstance(credit, dict) else "") or "web")
            src_url = esc(getattr(credit, "source_url", "") or (credit.get("source_url") if isinstance(credit, dict) else "") or "#")
            caption = (
                f'<figcaption class="ova-image-credit">'
                f'<span>{author}</span> · '
                f'<a href="{lic_url}" target="_blank" rel="noopener noreferrer">{lic}</a> · '
                f'<a href="{src_url}" target="_blank" rel="noopener noreferrer">{prov}</a>'
                f'</figcaption>'
            )
        return (
            f'<figure class="{cls}">'
            f'<img class="ova-figure-img" src="{esc(src)}" alt="{alt}" loading="lazy">'
            f"{caption}"
            f'</figure>'
        )

    # Sin imagen no se dibuja nada: una caja con icono parecía una imagen rota
    # y el recurso ya se entiende sin ella (la imagen es un apoyo opcional).
    return ""


def render_credits_section(data: dict | None) -> str:
    """Renderiza la sección de créditos al pie del recurso si existe alguna atribución."""
    if not isinstance(data, dict):
        return ""
    credit = data.get("image_credit") or data.get("credit")
    if not credit and "author" in data and "license" in data:
        credit = data
    if not credit:
        return ""
    author = esc(getattr(credit, "author", "") or (credit.get("author") if isinstance(credit, dict) else "") or "Autor")
    license_name = esc(getattr(credit, "license", "") or (credit.get("license") if isinstance(credit, dict) else "") or "Licencia libre")
    license_url = esc(getattr(credit, "license_url", "") or (credit.get("license_url") if isinstance(credit, dict) else "") or "#")
    provider = esc(getattr(credit, "provider", "") or (credit.get("provider") if isinstance(credit, dict) else "") or "web")
    source_url = esc(getattr(credit, "source_url", "") or (credit.get("source_url") if isinstance(credit, dict) else "") or "#")
    title = esc(getattr(credit, "title", "") or (credit.get("title") if isinstance(credit, dict) else "") or "Imagen")

    return (
        f'<section class="ova-credits-section">'
        f'<h4>Créditos de imágenes</h4>'
        f'<p><strong>{title}</strong>: Por {author} · '
        f'<a href="{license_url}" target="_blank" rel="noopener noreferrer">{license_name}</a> · '
        f'Fuente: <a href="{source_url}" target="_blank" rel="noopener noreferrer">{provider}</a></p>'
        f'</section>'
    )
