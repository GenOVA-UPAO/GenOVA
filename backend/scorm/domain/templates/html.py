import re
from html import escape as html_escape
from xml.sax.saxutils import escape as xml_escape

PHASE_LABELS = {
    "motivacion": "Motivación",
    "contenido": "Contenido",
    "explicacion": "Explicación",
    "actividad": "Actividad",
    "evaluacion": "Evaluación",
    "engage":    "Motivación",
    "explore":   "Exploración",
    "explain":   "Explicación",
    "elaborate": "Elaboración",
    "evaluate":  "Evaluación",
}


def phase_label(phase_type: str, order: int) -> str:
    return PHASE_LABELS.get((phase_type or "").strip().lower(), f"Recurso {order}")


def _is_full_document(content: str) -> bool:
    head = (content or "").lstrip().lower()
    return head.startswith("<!doctype") or head.startswith("<html")


_DOCUMENT_START = re.compile(r"<!doctype html|<html[\s>]", re.IGNORECASE)


def _extract_embedded_document(content: str) -> str:
    """Extract the full HTML document embedded in LLM chatter or Markdown fences.

    Some stored resources arrive as "Here is… ```html <!doctype html>…</html> ```"
    and the browser preview renders the embedded document. The SCORM file must be
    a standalone document too, so surrounding prose/fences are dropped.
    """
    text = content or ""
    match = _DOCUMENT_START.search(text)
    if not match:
        return ""
    end = text.lower().rfind("</html>")
    if end == -1:
        return text[match.start():]
    return text[match.start(): end + len("</html>")]


def wrap_resource_html(content: str, title: str) -> str:
    """Return a standalone HTML document for one OVA resource.

    Full HTML documents (engage/explore AI output) pass through verbatim so their
    own styles and scripts stay isolated. Documents embedded in prose/fences are
    unwrapped. Plain text is wrapped in a minimal page.
    """
    if _is_full_document(content):
        return content

    embedded = _extract_embedded_document(content)
    if embedded:
        return embedded

    body = (content or "").strip() or "Recurso sin contenido."
    safe_title = html_escape(title)
    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_title}</title>
    <style>
      body {{
        margin: 0;
        padding: 24px;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #ffffff;
        line-height: 1.6;
      }}
      h1 {{ color: #1746c0; font-size: 1.5rem; }}
      :focus-visible {{ outline: 3px solid #1746c0; outline-offset: 2px; }}
    </style>
  </head>
  <body>
    <main>
      <h1>{safe_title}</h1>
      <p>{body}</p>
    </main>
  </body>
</html>
"""


def build_manifest(course_title: str, module_title: str, resource_files: list[str]) -> str:
    file_tags = "\n".join(f'      <file href="{f}" />' for f in resource_files)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest
  identifier="GENOVA-SCORM-EXPORT"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
  http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default="ORG-DEFAULT">
    <organization identifier="ORG-DEFAULT">
      <title>{xml_escape(course_title)}</title>
      <item identifier="ITEM-INDEX" identifierref="RES-INDEX" isvisible="true">
        <title>{xml_escape(module_title)}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="RES-INDEX" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="resources/styles.css" />
      <file href="resources/scorm.js" />
      <file href="resources/xapi.js" />
      <file href="resources/app.js" />
{file_tags}
      <file href="cmi5.xml" />
    </resource>
  </resources>
</manifest>
"""


def build_index_html(course_title: str, resources: list[dict]) -> str:
    """SCO shell: tablist of resources + iframe panel. One SCO for the whole OVA.

    Accessibility (WCAG 2.2 AA): skip link, semantic landmarks, an ARIA tablist
    with roving tabindex + arrow-key navigation (wired in app.js), an
    aria-live status region, and accessible names on the iframe panel.
    """
    nav_buttons = "\n".join(
        f'          <button type="button" role="tab" class="res-link" '
        f'id="tab-{r["order"]}" data-src="{html_escape(r["file"], quote=True)}" '
        f'aria-controls="res-frame" aria-selected="false" tabindex="-1">'
        f"{html_escape(r['label'])}</button>"
        for r in resources
    )
    first_src = html_escape(resources[0]["file"], quote=True) if resources else ""
    safe_course_title = html_escape(course_title)
    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_course_title}</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="resources/styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#res-frame">Saltar al contenido</a>
    <main class="container">
      <header>
        <h1>{safe_course_title}</h1>
        <p>Objeto Virtual de Aprendizaje · GenOVA · SCORM 1.2</p>
      </header>

      <nav class="res-nav" aria-label="Recursos del OVA">
        <div role="tablist" aria-label="Secciones del OVA" aria-orientation="horizontal">
{nav_buttons}
        </div>
      </nav>

      <iframe
        id="res-frame"
        role="tabpanel"
        title="Contenido del recurso seleccionado"
        aria-label="Contenido del recurso seleccionado"
        src="{first_src}"
      ></iframe>

      <section class="card" aria-labelledby="estado-titulo">
        <h2 id="estado-titulo" class="visually-hidden">Estado de progreso</h2>
        <p id="scorm-status" role="status" aria-live="polite">
          Pendiente de inicialización...
        </p>
        <button id="complete-btn" type="button">Marcar OVA como completado</button>
      </section>
    </main>

    <script src="resources/scorm.js"></script>
    <script src="resources/xapi.js"></script>
    <script src="resources/app.js"></script>
  </body>
</html>
"""
