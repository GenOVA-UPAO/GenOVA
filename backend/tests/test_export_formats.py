"""Unit tests de los formatos de exportación (SCORM 2004, IMS CP, HTML, EPUB 3, eXeLearning).

Puros (sin DB ni red): construyen cada paquete en memoria y validan su estructura.
"""

import base64
import json
import os
import random
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from io import BytesIO
from zipfile import ZIP_STORED, ZipFile

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402
from lxml import etree  # noqa: E402

from scorm import EXPORT_FORMATS, UnknownExportFormat, build_export, get_export_format  # noqa: E402
from scorm.domain.formats.elpx import build_elpx_bytes, cdata  # noqa: E402
from scorm.domain.formats.epub import build_epub_bytes  # noqa: E402
from scorm.domain.formats.xhtml import html_to_xhtml  # noqa: E402
from scorm.domain.templates.scripts import build_scorm_js  # noqa: E402

VIDEO_B64 = base64.b64encode(b"\x00\x00\x00\x18ftypmp42fake-video").decode()

PHASES = [
    {
        "type": "engage",
        "order": 1,
        "title": "Inicio & <bienvenida>",
        "content": (
            "<!doctype html><html lang='es'><head><title>Motivación</title>"
            "<script>if (a < b && c) { window.ok = true }</script></head>"
            "<body><!-- a -- b --><p>Hola<br>mundo &nbsp;"
            '<svg viewBox="0 0 10 10"><linearGradient id="g"></linearGradient></svg>'
            '<div @click="x" :class="y" onclick="z()">clic</div>'
            f'<video controls src="data:video/mp4;base64,{VIDEO_B64}"></video>'
            "</body></html>"
        ),
    },
    {"type": "evaluate", "order": 2, "content": "Texto plano de evaluación"},
]

CP_NS = "http://www.imsglobal.org/xsd/imscp_v1p1"
ODE_NS = "{http://www.intef.es/xsd/ode}"
ODE_ID = re.compile(r"^[0-9]{14}[A-Z0-9]{6}$")


def _zip(format_id: str, phases=PHASES, title="Curso & <ML>") -> ZipFile:
    return ZipFile(BytesIO(build_export(format_id, title, phases)))


# --- registro -----------------------------------------------------------------


def test_registry_has_contract_ids_extensions_and_media_types():
    expected = {
        "scorm12": ("zip", "application/zip"),
        "scorm2004": ("zip", "application/zip"),
        "ims": ("zip", "application/zip"),
        "html": ("zip", "application/zip"),
        "epub": ("epub", "application/epub+zip"),
        "elpx": ("elpx", "application/zip"),
    }
    assert {k: (v.extension, v.media_type) for k, v in EXPORT_FORMATS.items()} == expected


def test_unknown_format_raises():
    assert get_export_format("pdf") is None
    with pytest.raises(UnknownExportFormat, match="no soportado: pdf"):
        build_export("pdf", "x", PHASES)


@pytest.mark.parametrize("format_id", ["scorm12", "scorm2004", "ims", "html"])
def test_shell_formats_share_resources_and_extract_videos(format_id):
    z = _zip(format_id)
    names = set(z.namelist())
    assert {"index.html", "resources/recurso_1.html", "resources/recurso_2.html"} <= names
    info = z.getinfo("resources/media/recurso_1_video_1.mp4")
    assert info.compress_type == ZIP_STORED
    page = z.read("resources/recurso_1.html").decode()
    assert 'src="media/recurso_1_video_1.mp4"' in page
    assert "data:video" not in page


def _manifest_files(z: ZipFile, ns: str) -> set[str]:
    root = ET.fromstring(z.read("imsmanifest.xml"))  # noqa: S314 — trusted
    return {el.get("href") for el in root.iter(f"{{{ns}}}file")}


# --- SCORM 2004 -----------------------------------------------------------------


def test_scorm2004_manifest_is_4th_edition_sco():
    z = _zip("scorm2004")
    xml = z.read("imsmanifest.xml").decode()
    root = ET.fromstring(xml)  # noqa: S314 — trusted
    assert root.tag == f"{{{CP_NS}}}manifest"
    assert root.find(f"{{{CP_NS}}}metadata/{{{CP_NS}}}schemaversion").text == "2004 4th Edition"
    assert root.find(f"{{{CP_NS}}}metadata/{{{CP_NS}}}schema").text == "ADL SCORM"
    resource = root.find(f"{{{CP_NS}}}resources/{{{CP_NS}}}resource")
    assert resource.get("{http://www.adlnet.org/xsd/adlcp_v1p3}scormType") == "sco"
    assert resource.get("href") == "index.html"
    titles = [el.text for el in root.iter(f"{{{CP_NS}}}title")]
    assert "Curso & <ML>" in titles
    assert _manifest_files(z, CP_NS) == set(z.namelist()) - {"imsmanifest.xml"}


def test_scorm2004_runtime_speaks_api_1484_11():
    z = _zip("scorm2004")
    js = z.read("resources/scorm.js").decode()
    assert "const PREFERRED = '2004'" in js
    for token in ("API_1484_11", "Initialize", "Terminate", "Commit", "cmi.completion_status"):
        assert token in js
    assert "SCORM 2004" in z.read("index.html").decode()


def test_scorm12_runtime_still_prefers_api_12():
    js = _zip("scorm12").read("resources/scorm.js").decode()
    assert "const PREFERRED = '1.2'" in js
    assert "LMSInitialize" in js and "LMSFinish" in js


def test_build_scorm_js_rejects_unknown_version():
    with pytest.raises(ValueError):
        build_scorm_js("1.3")


_NODE_HARNESS = r"""
const calls = []
const api2004 = {
  Initialize: () => { calls.push(['Initialize']); return 'true' },
  GetValue: (k) => { calls.push(['GetValue', k]); return 'unknown' },
  SetValue: (k, v) => { calls.push(['SetValue', k, v]); return 'true' },
  Commit: () => { calls.push(['Commit']); return 'true' },
  Terminate: () => { calls.push(['Terminate']); return 'true' },
}
const api12 = {
  LMSInitialize: () => { calls.push(['LMSInitialize']); return 'true' },
}
const parent = { API_1484_11: MODE === 'none' ? undefined : api2004, API: MODE === 'both' ? api12 : undefined }
parent.parent = parent
const window = { parent }
eval(SOURCE)
const s = window.GenovaScorm
const out = { init: s.initialize(), version: s.version(), status: s.getValue('cmi.core.lesson_status') }
s.setValue('cmi.core.lesson_status', 'completed')
s.setValue('cmi.core.score.raw', 80)
s.setValue('cmi.core.session_time', '0001:02:03.50')
s.setValue('cmi.core.exit', '')
s.commit()
s.finish()
out.calls = calls
console.log(JSON.stringify(out))
"""


def _run_scorm_js(version: str, mode: str) -> dict:
    script = (
        f"const MODE = {json.dumps(mode)}\n"
        f"const SOURCE = {json.dumps(build_scorm_js(version))}\n" + _NODE_HARNESS
    )
    result = subprocess.run(  # noqa: S603 — fixed argv, script generated here
        [shutil.which("node"), "-e", script], capture_output=True, text=True, timeout=30, check=True
    )
    return json.loads(result.stdout)


@pytest.mark.skipif(shutil.which("node") is None, reason="node no disponible")
def test_scorm_js_2004_translates_data_model_and_terminates():
    out = _run_scorm_js("2004", "both")
    assert out["init"] is True
    assert out["version"] == "2004"
    assert out["status"] == "not attempted"  # 'unknown' de 2004 → 'not attempted' de 1.2
    sets = {c[1]: c[2] for c in out["calls"] if c[0] == "SetValue"}
    assert sets["cmi.completion_status"] == "completed"
    assert sets["cmi.score.raw"] == "80"
    assert sets["cmi.score.scaled"] == "0.8"
    assert sets["cmi.session_time"] == "PT1H2M3.5S"
    assert sets["cmi.exit"] == "normal"
    assert ["Commit"] in out["calls"]
    assert out["calls"][-1] == ["Terminate"]


@pytest.mark.skipif(shutil.which("node") is None, reason="node no disponible")
def test_scorm_js_12_prefers_api_but_is_noop_without_lms():
    assert _run_scorm_js("1.2", "both")["version"] == "1.2"
    # Un paquete 1.2 lanzado por un LMS que sólo expone API_1484_11 sigue informando.
    assert _run_scorm_js("1.2", "only2004")["version"] == "2004"
    out = _run_scorm_js("2004", "none")
    assert out["init"] is False
    assert out["version"] is None
    assert out["calls"] == []


# --- IMS CP / HTML --------------------------------------------------------------


def test_ims_manifest_has_no_scorm_extensions():
    z = _zip("ims")
    xml = z.read("imsmanifest.xml").decode()
    root = ET.fromstring(xml)  # noqa: S314 — trusted
    assert root.find(f"{{{CP_NS}}}metadata/{{{CP_NS}}}schemaversion").text == "1.1.4"
    assert "adlcp" not in xml and "ADL SCORM" not in xml
    assert "cmi5.xml" not in z.namelist()
    assert _manifest_files(z, CP_NS) == set(z.namelist()) - {"imsmanifest.xml"}


def test_html_export_is_plain_site_with_relative_links():
    z = _zip("html")
    names = set(z.namelist())
    assert "imsmanifest.xml" not in names and "cmi5.xml" not in names
    index = z.read("index.html").decode()
    refs = re.findall(r'(?:src|href|data-src)="([^"#:]+)"', index)
    assert refs, "el índice debe enlazar recursos"
    for ref in refs:
        assert not ref.startswith("/"), ref
        assert ref in names, f"referencia rota en index.html: {ref}"


# --- EPUB 3 ---------------------------------------------------------------------

OPF_NS = "{http://www.idpf.org/2007/opf}"


def _epub() -> ZipFile:
    data = build_epub_bytes(
        "Curso & <ML>",
        "OVA 1",
        PHASES,
        identifier="urn:uuid:00000000-0000-0000-0000-000000000001",
        modified=datetime(2026, 10, 5, 12, 0, tzinfo=UTC),
    )
    return ZipFile(BytesIO(data))


def test_epub_mimetype_is_first_and_stored():
    z = _epub()
    first = z.infolist()[0]
    assert first.filename == "mimetype"
    assert first.compress_type == ZIP_STORED
    assert first.extra == b""
    assert z.read("mimetype") == b"application/epub+zip"
    container = ET.fromstring(z.read("META-INF/container.xml"))  # noqa: S314 — trusted
    rootfile = container.find(".//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile")
    assert rootfile.get("full-path") == "EPUB/package.opf"


def test_epub_opf_manifest_spine_and_metadata():
    z = _epub()
    opf = ET.fromstring(z.read("EPUB/package.opf"))  # noqa: S314 — trusted
    assert opf.get("version") == "3.0"
    md = opf.find(f"{OPF_NS}metadata")
    dc = "{http://purl.org/dc/elements/1.1/}"
    assert md.find(f"{dc}identifier").get("id") == opf.get("unique-identifier")
    assert md.find(f"{dc}title").text == "Curso & <ML>"
    assert md.find(f"{dc}language").text == "es"
    modified = [m for m in md.iter(f"{OPF_NS}meta") if m.get("property") == "dcterms:modified"]
    assert modified[0].text == "2026-10-05T12:00:00Z"

    items = {i.get("id"): i for i in opf.iter(f"{OPF_NS}item")}
    assert items["nav"].get("properties") == "nav"
    assert "scripted" in items["recurso_1"].get("properties", "").split()
    assert "scripted" not in (items["recurso_2"].get("properties") or "")
    assert items["recurso_1_video_1"].get("media-type") == "video/mp4"
    # Todo lo del manifest existe en el zip y todo el contenido está en el manifest.
    hrefs = {f"EPUB/{i.get('href')}" for i in items.values()}
    assert hrefs == {n for n in z.namelist() if n.startswith("EPUB/")} - {"EPUB/package.opf"}
    spine = [i.get("idref") for i in opf.iter(f"{OPF_NS}itemref")]
    assert spine == ["recurso_1", "recurso_2"]


def test_epub_chapters_and_nav_are_wellformed_xhtml():
    z = _epub()
    xhtml = "{http://www.w3.org/1999/xhtml}"
    for name in ("EPUB/nav.xhtml", "EPUB/recurso_1.xhtml", "EPUB/recurso_2.xhtml"):
        root = etree.fromstring(z.read(name))  # XML estricto: falla si no es bien formado
        assert root.tag == f"{xhtml}html"
        assert root.find(f"{xhtml}head/{xhtml}title") is not None
    nav = etree.fromstring(z.read("EPUB/nav.xhtml"))
    toc = nav.find(f".//{xhtml}nav")
    assert toc.get("{http://www.idpf.org/2007/ops}type") == "toc"
    links = [a.get("href") for a in toc.iter(f"{xhtml}a")]
    assert links == ["recurso_1.xhtml", "recurso_2.xhtml"]
    labels = [a.text for a in toc.iter(f"{xhtml}a")]
    assert labels[0] == "Inicio & <bienvenida>"

    chapter = z.read("EPUB/recurso_1.xhtml").decode()
    assert 'src="media/recurso_1_video_1.mp4"' in chapter
    assert "EPUB/media/recurso_1_video_1.mp4" in z.namelist()
    assert "<script>if (a &lt; b &amp;&amp; c)" in chapter  # JS conservado y escapado
    assert "@click" not in chapter and ":class" not in chapter
    assert 'viewBox="0 0 10 10"' in chapter and "<linearGradient" in chapter


def test_html_to_xhtml_handles_fragments_and_invalid_chars():
    page = html_to_xhtml("<p>uno<p>dos\x0b<o:p>tres</o:p>", "Título")
    root = etree.fromstring(page.xhtml.encode())
    assert (
        root.find("{http://www.w3.org/1999/xhtml}head/{http://www.w3.org/1999/xhtml}title").text
        == "Título"
    )
    assert page.scripted is False
    assert page.remote_resources is False
    remote = html_to_xhtml('<script src="https://cdn.example.com/x.js"></script>', "x")
    assert remote.scripted and remote.remote_resources


# --- eXeLearning (.elpx) ----------------------------------------------------------


def _elpx(phases=PHASES) -> tuple[ZipFile, str]:
    data = build_elpx_bytes(
        "Curso & <ML>",
        "OVA 1",
        phases,
        now=datetime(2026, 10, 5, 12, 0, tzinfo=UTC),
        rng=random.Random(7),
    )
    z = ZipFile(BytesIO(data))
    return z, z.read("content.xml").decode("utf-8")


def test_elpx_prolog_root_and_children_order():
    _, xml = _elpx()
    lines = xml.splitlines()
    assert lines[0] == '<?xml version="1.0" encoding="UTF-8"?>'
    assert lines[1] == '<!DOCTYPE ode SYSTEM "content.dtd">'
    assert lines[2] == '<ode xmlns="http://www.intef.es/xsd/ode" version="2.0">'
    root = etree.fromstring(xml.encode())
    assert [etree.QName(c).localname for c in root] == [
        "userPreferences",
        "odeResources",
        "odeProperties",
        "odeNavStructures",
    ]

    def kv(container):
        return {
            el.find(f"{ODE_NS}key").text: el.find(f"{ODE_NS}value").text
            for el in root.find(f"{ODE_NS}{container}")
        }

    assert kv("userPreferences") == {"theme": "base"}
    resources = kv("odeResources")
    assert resources["exe_version"] == "3.0"
    props = kv("odeProperties")
    assert props["pp_title"] == "Curso & <ML>"
    assert props["pp_lang"] == "es"
    assert props["pp_license"] == "creative commons: attribution - share alike 4.0"
    assert props["pp_addExeLink"] == "false"


def test_elpx_ids_match_format_are_unique_and_synchronized():
    _, xml = _elpx()
    root = etree.fromstring(xml.encode())
    resources = {
        el.find(f"{ODE_NS}key").text: el.find(f"{ODE_NS}value").text
        for el in root.find(f"{ODE_NS}odeResources")
    }
    unique_ids = [resources["odeId"], resources["odeVersionId"]]

    pages = root.findall(f"{ODE_NS}odeNavStructures/{ODE_NS}odeNavStructure")
    assert [p.findtext(f"{ODE_NS}pageName") for p in pages] == [
        "Inicio & <bienvenida>",
        "Evaluación",
    ]
    for order, page in enumerate(pages, start=1):
        page_id = page.findtext(f"{ODE_NS}odePageId")
        unique_ids.append(page_id)
        assert page.findtext(f"{ODE_NS}odeParentPageId") == ""
        assert page.findtext(f"{ODE_NS}odeNavStructureOrder") == str(order)
        blocks = page.findall(f"{ODE_NS}odePagStructures/{ODE_NS}odePagStructure")
        for b_order, block in enumerate(blocks, start=1):
            block_id = block.findtext(f"{ODE_NS}odeBlockId")
            unique_ids.append(block_id)
            assert block.findtext(f"{ODE_NS}odePageId") == page_id
            assert block.findtext(f"{ODE_NS}odePagStructureOrder") == str(b_order)
            comps = block.findall(f"{ODE_NS}odeComponents/{ODE_NS}odeComponent")
            assert len(comps) == 1
            for c_order, comp in enumerate(comps, start=1):
                idevice_id = comp.findtext(f"{ODE_NS}odeIdeviceId")
                unique_ids.append(idevice_id)
                assert comp.findtext(f"{ODE_NS}odePageId") == page_id
                assert comp.findtext(f"{ODE_NS}odeBlockId") == block_id
                assert comp.findtext(f"{ODE_NS}odeIdeviceTypeName") == "text"
                assert comp.findtext(f"{ODE_NS}odeComponentsOrder") == str(c_order)
                props = comp.find(f"{ODE_NS}odeComponentsProperties")
                assert props is not None
                assert props.find(f".//{ODE_NS}key").text == "visibility"
                data = json.loads(comp.findtext(f"{ODE_NS}jsonProperties"))
                assert data["ideviceId"] == idevice_id
                assert data["textTextarea"] in comp.findtext(f"{ODE_NS}htmlView")

    assert all(ODE_ID.match(i) for i in unique_ids), unique_ids
    assert len(unique_ids) == len(set(unique_ids))


def test_elpx_pages_carry_the_nav_properties_exe_expects():
    _, xml = _elpx()
    root = etree.fromstring(xml.encode())
    page = root.find(f"{ODE_NS}odeNavStructures/{ODE_NS}odeNavStructure")
    props = {
        el.findtext(f"{ODE_NS}key"): el.findtext(f"{ODE_NS}value") or ""
        for el in page.find(f"{ODE_NS}odeNavStructureProperties")
    }
    assert props["titlePage"] == props["titleNode"] == "Inicio & <bienvenida>"
    assert props["titleHtml"] == "" and props["description"] == ""
    assert props["visibility"] == "true" and props["hidePageTitle"] == "false"


def test_elpx_html_view_and_json_properties_are_cdata():
    _, xml = _elpx()
    assert xml.count("<htmlView><![CDATA[") == 2
    assert xml.count("<jsonProperties><![CDATA[") == 2


def test_cdata_splits_terminator():
    wrapped = cdata("a]]>b]]>c")
    assert wrapped == "<![CDATA[a]]]]><![CDATA[>b]]]]><![CDATA[>c]]>"
    doc = etree.fromstring(f"<x>{wrapped}</x>".encode())
    assert doc.text == "a]]>b]]>c"


def test_elpx_context_paths_resolve_to_files_in_zip():
    z, xml = _elpx()
    names = set(z.namelist())
    refs = re.findall(r"\{\{context_path\}\}/([^\"'\s<>\\]+)", xml)
    assert refs
    for ref in refs:
        assert f"content/resources/{ref}" in names, ref
    page = z.read("content/resources/genova/recurso_1.html").decode()
    assert 'src="media/recurso_1_video_1.mp4"' in page
    assert "content/resources/genova/media/recurso_1_video_1.mp4" in names
    # No se redistribuye nada de eXeLearning (AGPL).
    assert "content.dtd" not in names
    assert not any(n.startswith(("libs/", "theme/", "idevices/")) for n in names)


def test_elpx_escapes_titles_containing_cdata_terminator():
    phases = [{"type": "engage", "order": 1, "content": "<p>x</p>", "title": "a ]]> b"}]
    _, xml = _elpx(phases)
    root = etree.fromstring(xml.encode())  # bien formado pese al `]]>`
    assert root.find(f".//{ODE_NS}pageName").text == "a ]]> b"


def test_manual_completion_without_scored_resources_reports_no_score():
    from scorm.domain.templates.scripts import build_app_js

    js = build_app_js()
    body = js[js.index("function markComplete()") : js.index("function maybeComplete()")]
    assert ": 100" not in body  # antes: sin notas se inventaba un 100
    assert body.index("if (scores.length)") < body.index("cmi.core.score.raw")
