"""Unit tests del empaquetado SCORM 1.2 + xAPI/cmi5 + accesibilidad.

Puros (sin DB ni red): construyen el ZIP en memoria y validan su estructura,
los recursos de accesibilidad (WCAG 2.2) del shell y la presencia del runtime
xAPI y la estructura cmi5.
"""

from io import BytesIO
from zipfile import ZipFile

from scorm.service import build_scorm_zip_bytes


def _zip():
    return ZipFile(BytesIO(build_scorm_zip_bytes(course_title="Curso ML", module_title="OVA 1")))


def test_package_contains_core_files():
    names = set(_zip().namelist())
    assert "imsmanifest.xml" in names
    assert "index.html" in names
    assert "cmi5.xml" in names
    assert "resources/styles.css" in names
    assert "resources/scorm.js" in names
    assert "resources/xapi.js" in names
    assert "resources/app.js" in names


def test_phases_become_resource_files():
    phases = [
        {"type": "engage", "order": 1, "content": "<p>Motivación</p>", "title": "Inicio"},
        {"type": "evaluate", "order": 2, "content": "Texto plano de evaluación"},
    ]
    z = ZipFile(BytesIO(build_scorm_zip_bytes(phases=phases)))
    names = set(z.namelist())
    assert "resources/recurso_1.html" in names
    assert "resources/recurso_2.html" in names


def test_index_has_accessibility_landmarks():
    index = _zip().read("index.html").decode("utf-8")
    assert 'lang="es"' in index
    assert 'class="skip-link"' in index
    assert 'role="tablist"' in index
    assert 'role="tab"' in index
    assert 'role="tabpanel"' in index
    assert 'aria-live="polite"' in index
    assert "<main" in index


def test_styles_have_visible_focus_and_target_size():
    css = _zip().read("resources/styles.css").decode("utf-8")
    assert ":focus-visible" in css
    assert "min-height: 44px" in css
    assert "prefers-reduced-motion" in css


def test_xapi_runtime_is_noop_without_launch_params():
    js = _zip().read("resources/xapi.js").decode("utf-8")
    # Sólo se activa con endpoint + actor + (auth|fetch).
    assert "GenovaXapi" in js
    assert "endpoint" in js
    assert "X-Experience-API-Version" in js


def test_cmi5_xml_is_well_formed_course_structure():
    import xml.etree.ElementTree as ET

    xml = _zip().read("cmi5.xml").decode("utf-8")
    root = ET.fromstring(xml)  # noqa: S314 — our own generated, trusted content
    assert root.tag.endswith("courseStructure")
    assert "Curso ML" in xml
    assert "index.html" in xml


def test_plain_text_resource_is_wrapped_as_document():
    phases = [{"type": "engage", "order": 1, "content": "solo texto"}]
    z = ZipFile(BytesIO(build_scorm_zip_bytes(phases=phases)))
    res = z.read("resources/recurso_1.html").decode("utf-8")
    assert res.lstrip().lower().startswith("<!doctype")
    assert "solo texto" in res


def test_full_document_resource_passes_through():
    doc = "<!doctype html><html lang='es'><body><h1>X</h1></body></html>"
    phases = [{"type": "engage", "order": 1, "content": doc}]
    z = ZipFile(BytesIO(build_scorm_zip_bytes(phases=phases)))
    res = z.read("resources/recurso_1.html").decode("utf-8")
    assert res == doc
