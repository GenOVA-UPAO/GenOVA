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


def wrap_resource_html(content: str, title: str) -> str:
    """Return a standalone HTML document for one OVA resource.

    Full HTML documents (engage/explore AI output) pass through verbatim so their
    own styles and scripts stay isolated. Plain text is wrapped in a minimal page.
    """
    if _is_full_document(content):
        return content

    body = (content or "").strip() or "Recurso sin contenido."
    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <style>
      body {{
        margin: 0;
        padding: 24px;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #f8fafc;
        line-height: 1.6;
      }}
      h2 {{ color: #1d4ed8; }}
    </style>
  </head>
  <body>
    <h2>{title}</h2>
    <p>{body}</p>
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
      <title>{course_title}</title>
      <item identifier="ITEM-INDEX" identifierref="RES-INDEX" isvisible="true">
        <title>{module_title}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="RES-INDEX" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="resources/styles.css" />
      <file href="resources/scorm.js" />
      <file href="resources/app.js" />
{file_tags}
    </resource>
  </resources>
</manifest>
"""


def build_index_html(course_title: str, resources: list[dict]) -> str:
    """SCO shell: side nav of resources + iframe. One SCO for the whole OVA."""
    nav_buttons = "\n".join(
        f'        <button type="button" class="res-link" data-src="{r["file"]}">'
        f"{r['label']}</button>"
        for r in resources
    )
    first_src = resources[0]["file"] if resources else ""
    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{course_title}</title>
    <link rel="stylesheet" href="resources/styles.css" />
  </head>
  <body>
    <main class="container">
      <header>
        <h1>{course_title}</h1>
        <p>Objeto Virtual de Aprendizaje · GenOVA · SCORM 1.2</p>
      </header>

      <nav class="res-nav">
{nav_buttons}
      </nav>

      <iframe id="res-frame" title="Recurso del OVA" src="{first_src}"></iframe>

      <section class="card">
        <p id="scorm-status">Pendiente de inicialización...</p>
        <button id="complete-btn" type="button">Marcar OVA como completado</button>
      </section>
    </main>

    <script src="resources/scorm.js"></script>
    <script src="resources/app.js"></script>
  </body>
</html>
"""
