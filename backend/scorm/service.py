from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from scorm.template_html import (
    build_index_html,
    build_manifest,
    phase_label,
    wrap_resource_html,
)
from scorm.template_scripts import build_app_js, build_scorm_js
from scorm.template_style import build_styles_css

DEFAULT_PHASES = [
    {"type": "engage", "order": 1, "content": "Recurso de la fase ENGAGE no disponible."},
    {"type": "explore", "order": 2, "content": "Recurso de la fase EXPLORE no disponible."},
]


def build_scorm_zip_bytes(
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
) -> bytes:
    """Assemble a SCORM 1.2 package. Each phase becomes its own HTML resource
    file loaded in an iframe by the SCO shell — keeps full HTML documents
    (engage/explore AI output) isolated and renderable."""
    ordered = sorted(phases if phases else DEFAULT_PHASES, key=lambda p: p.get("order", 0))

    resources = []
    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for idx, phase in enumerate(ordered, start=1):
            custom_title = (phase.get("title") or "").strip()
            label = custom_title or phase_label(phase.get("type", ""), idx)
            file_rel = f"resources/recurso_{idx}.html"
            zip_file.writestr(file_rel, wrap_resource_html(phase.get("content", ""), label))
            resources.append({"order": idx, "label": label, "file": file_rel})

        resource_files = [r["file"] for r in resources]
        zip_file.writestr(
            "imsmanifest.xml", build_manifest(course_title, module_title, resource_files)
        )
        zip_file.writestr("index.html", build_index_html(course_title, resources))
        zip_file.writestr("resources/styles.css", build_styles_css())
        zip_file.writestr("resources/scorm.js", build_scorm_js())
        zip_file.writestr("resources/app.js", build_app_js())

    return zip_buffer.getvalue()
