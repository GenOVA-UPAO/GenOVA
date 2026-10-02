"""Utilidades HTML para las plantillas: escape, documento y datos para el JS.

Regla de seguridad: TODO texto que viene del LLM pasa por `esc` (contenido y
atributos). Los datos que necesita el JS van en `json_data`, que escapa `<` para
que un `</script>` en el texto no cierre la etiqueta.
"""

from __future__ import annotations

import html as _html
import json
from typing import Any


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
    (`prog.set is not a function`)."""
    return (
        "<script>\ndocument.addEventListener('DOMContentLoaded', function () {\n"
        f"{js.strip()}\n}});\n</script>"
    )


ENGINE_META = "genova-engine"


def document(title: str, body: str, *, lang: str = "es", key: str = "") -> str:
    return (
        f'<!DOCTYPE html>\n<html lang="{lang}">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<meta name="{ENGINE_META}" content="template:{esc(key)}">\n'
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
