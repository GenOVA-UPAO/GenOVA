import base64
import binascii
import re
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

from scorm.domain.templates.html import (
    build_index_html,
    build_manifest,
    phase_label,
    wrap_resource_html,
)
from scorm.domain.templates.scripts import build_app_js, build_scorm_js
from scorm.domain.templates.style import build_styles_css
from scorm.domain.templates.xapi import build_cmi5_xml, build_xapi_js

DEFAULT_PHASES = [
    {"type": "engage", "order": 1, "content": "Recurso de la fase ENGAGE no disponible."},
    {"type": "explore", "order": 2, "content": "Recurso de la fase EXPLORE no disponible."},
]


# Video generado incrustado como data URI en el HTML de un recurso. En el paquete
# va como archivo aparte: el base64 pesa un 33 % más y obliga al LMS a cargar el
# video entero para pintar la página.
_VIDEO_DATA_URI = re.compile(
    r"""(?P<attr>\bsrc\s*=\s*)(?P<q>["'])data:video/(?P<ext>mp4|webm);base64,(?P<b64>[A-Za-z0-9+/=]+)(?P=q)"""
)


def _extract_videos(html: str, idx: int, zip_file: ZipFile, media: list[str]) -> str:
    """Saca cada video `data:` a `resources/media/` y deja la ruta relativa.
    Añade a `media` la ruta de cada archivo (para el manifiesto)."""
    counter = 0

    def replace(match: re.Match) -> str:
        nonlocal counter
        try:
            data = base64.b64decode(match.group("b64"), validate=True)
        except (binascii.Error, ValueError):
            return match.group(0)
        counter += 1
        name = f"media/recurso_{idx}_video_{counter}.{match.group('ext')}"
        # Un video ya está comprimido: deflate no gana nada y cuesta CPU.
        zip_file.writestr(f"resources/{name}", data, compress_type=ZIP_STORED)
        media.append(f"resources/{name}")
        q = match.group("q")
        return f"{match.group('attr')}{q}{name}{q}"

    return _VIDEO_DATA_URI.sub(replace, html)


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
    media: list[str] = []
    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for idx, phase in enumerate(ordered, start=1):
            custom_title = (phase.get("title") or "").strip()
            label = custom_title or phase_label(phase.get("type", ""), idx)
            file_rel = f"resources/recurso_{idx}.html"
            page = wrap_resource_html(phase.get("content", ""), label)
            zip_file.writestr(file_rel, _extract_videos(page, idx, zip_file, media))
            resources.append({"order": idx, "label": label, "file": file_rel})

        resource_files = [r["file"] for r in resources] + media
        zip_file.writestr(
            "imsmanifest.xml", build_manifest(course_title, module_title, resource_files)
        )
        zip_file.writestr("index.html", build_index_html(course_title, resources))
        zip_file.writestr("resources/styles.css", build_styles_css())
        zip_file.writestr("resources/scorm.js", build_scorm_js())
        zip_file.writestr("resources/xapi.js", build_xapi_js())
        zip_file.writestr("resources/app.js", build_app_js())
        # cmi5 course structure so the same package imports into xAPI/cmi5 LMSs.
        # The xapi.js runtime is a no-op unless launched with cmi5 parameters.
        zip_file.writestr("cmi5.xml", build_cmi5_xml(course_title, module_title))

    return zip_buffer.getvalue()
