"""Adaptador del runtime UPAO para el editor visual.

El compositor visual solo produce el fragmento autorado (`<div class="ova-container">`
con `upao-*`). Guardarlo tal cual dejaba el recurso sin hoja base ni librería de
componentes: las etiquetas `upao-*` quedaban sin definir en la vista previa, las
exportaciones y el reproductor LTI. Aquí se arma un documento completo y se le
inyecta el runtime con el mismo tema que ya tenía el recurso.
"""

from __future__ import annotations

from llm.utils.ova_runtime import inject_runtime, runtime_palette, strip_runtime, theme_of

_DOCUMENT = (
    '<!doctype html><html lang="es"><head><meta charset="UTF-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    "</head><body>{body}</body></html>"
)


class OvaRuntimeAdapter:
    """Implementa `OvaRuntimePort` con `llm.utils.ova_runtime`."""

    def finalize(self, fragment: str, previous_html: str | None) -> str:
        previous = previous_html or ""
        _, had_css, had_components = strip_runtime(previous)
        # Un recurso sin runtime (antiguo o plano) recibe la hoja UPAO; si ya lo tenía,
        # se respeta su tema (colores «libres» = sin hoja base). Los componentes van
        # siempre: los bloques del compositor se renderizan como `upao-*`.
        css = theme_of(previous)["color"] != "free" if (had_css or had_components) else True
        document = _DOCUMENT.format(body=fragment)
        return inject_runtime(document, css=css, components=True, palette=runtime_palette(previous))
