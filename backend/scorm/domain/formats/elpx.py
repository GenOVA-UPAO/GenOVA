"""Proyecto eXeLearning (.elpx, esquema ODE 2.0) para seguir editando la OVA en eXe.

Reglas del formato (doc oficial de eXeLearning, `doc/elpx-format/ai-generation.md`):

- `content.xml` con prólogo XML + DOCTYPE `content.dtd` y raíz `<ode version="2.0">`;
  hijos en orden: userPreferences, odeResources, odeProperties, odeNavStructures.
- IDs `[0-9]{14}[A-Z0-9]{6}` únicos; `odePageId`/`odeBlockId` repetidos y
  sincronizados en cada bloque/componente; órdenes 1-based.
- `htmlView` y `jsonProperties` siempre en CDATA, partiendo `]]>`.
- Recursos en `content/resources/…`, referenciados como `{{context_path}}/…`.

Cada fase es una página con un bloque y un iDevice:

- Si la fase tiene una actividad editable sincronizada (opción múltiple, completar,
  relacionar, crucigrama, verdadero/falso), el iDevice nativo de eXe equivalente
  (`formats/exe_idevices.py`), que el docente puede seguir editando en eXe.
- Si no, un iDevice `text` que incrusta, en un iframe, el HTML de la fase guardado
  en `content/resources/genova/recurso_N.html` (el JS sigue funcionando aislado,
  como en el SCORM).

No se empaquetan `content.dtd`, temas ni librerías de eXe (licencia AGPL): el
importador de eXe reconstruye el proyecto a partir de `content.xml`.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import UTC, datetime
from html import escape as html_escape
from io import BytesIO
from xml.sax.saxutils import escape as xml_escape
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

from core.educational_metadata import EducationalMetadata
from ova.domain.package_themes import theme_css
from scorm.domain.activities import Activity
from scorm.domain.formats.exe_idevices import native_idevice
from scorm.domain.resources import prepare_phase_resources

ODE_NAMESPACE = "http://www.intef.es/xsd/ode"
EXE_VERSION = "3.0"
RESOURCES_DIR = "content/resources"
GENOVA_FOLDER = "genova"
CONTEXT_PATH = "{{context_path}}"
LICENSE = "creative commons: attribution - share alike 4.0"

_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


class OdeIdFactory:
    """IDs ODE: `YYYYMMDDHHmmss` (UTC) + 6 caracteres de [A-Z0-9], sin repetir."""

    def __init__(self, now: datetime | None = None, rng: random.Random | None = None) -> None:
        self._stamp = (now or datetime.now(UTC)).strftime("%Y%m%d%H%M%S")
        self._rng = rng or random.SystemRandom()
        self._issued: set[str] = set()

    def new(self) -> str:
        while True:
            suffix = "".join(self._rng.choice(_ID_ALPHABET) for _ in range(6))
            candidate = self._stamp + suffix
            if candidate not in self._issued:
                self._issued.add(candidate)
                return candidate


def cdata(text: str) -> str:
    """Envuelve en CDATA partiendo cada `]]>` interno (`]]]]><![CDATA[>`)."""
    return "<![CDATA[" + (text or "").replace("]]>", "]]]]><![CDATA[>") + "]]>"


def _key_values(container: str, item: str, pairs: list[tuple[str, str]], indent: str) -> str:
    rows = "\n".join(
        f"{indent}  <{item}><key>{xml_escape(k)}</key><value>{xml_escape(v)}</value></{item}>"
        for k, v in pairs
    )
    return f"{indent}<{container}>\n{rows}\n{indent}</{container}>"


def _iframe_html(src: str, label: str) -> str:
    safe_src = html_escape(src, quote=True)
    safe_label = html_escape(label, quote=True)
    return (
        f'<p><iframe src="{safe_src}" title="{safe_label}" width="100%" height="720" '
        f'style="width:100%;min-height:720px;border:0;" sandbox="allow-scripts"></iframe></p>'
        f'<p><a href="{safe_src}" target="_blank" rel="noopener">'
        f"Abrir «{html_escape(label)}» en una ventana nueva</a></p>"
    )


@dataclass(frozen=True, slots=True)
class ElpxPage:
    """Una página del proyecto: su recurso HTML (iframe) o su actividad nativa."""

    label: str
    src: str | None = None  # ruta relativa a content/resources (iDevice `text`)
    activity: Activity | None = None


def _component(
    page_id: str,
    block_id: str,
    idevice_id: str,
    type_name: str,
    html_view: str,
    json_properties: dict,
) -> str:
    # Como eXe: `<jsonProperties>` vacío si el iDevice guarda todo en `htmlView`.
    json_view = (
        f"<jsonProperties>{cdata(json.dumps(json_properties, ensure_ascii=False))}</jsonProperties>"
        if json_properties
        else "<jsonProperties></jsonProperties>"
    )
    props = _key_values(
        "odeComponentsProperties",
        "odeComponentsProperty",
        [("visibility", "true"), ("teacherOnly", "false"), ("cssClass", "")],
        "              ",
    )
    return f"""            <odeComponent>
              <odePageId>{page_id}</odePageId>
              <odeBlockId>{block_id}</odeBlockId>
              <odeIdeviceId>{idevice_id}</odeIdeviceId>
              <odeIdeviceTypeName>{type_name}</odeIdeviceTypeName>
              <htmlView>{cdata(html_view)}</htmlView>
              {json_view}
              <odeComponentsOrder>1</odeComponentsOrder>
{props}
            </odeComponent>"""


def _text_idevice(ids: OdeIdFactory, page_id: str, block_id: str, src: str, label: str) -> str:
    idevice_id = ids.new()
    inner = _iframe_html(src, label)
    html_view = (
        '<div class="exe-text-template"><div class="textIdeviceContent">'
        f'<div class="exe-text-activity"><div>{inner}</div></div></div></div>'
    )
    json_properties = {
        "ideviceId": idevice_id,
        "textTextarea": inner,
        "textFeedbackInput": "Mostrar retroalimentación",
        "textFeedbackTextarea": "",
        "textInfoDurationInput": "",
        "textInfoDurationTextInput": "Duración",
        "textInfoParticipantsInput": "",
        "textInfoParticipantsTextInput": "Agrupamiento",
    }
    return _component(page_id, block_id, idevice_id, "text", html_view, json_properties)


def _native_idevice(ids: OdeIdFactory, page_id: str, block_id: str, activity: Activity) -> str:
    idevice_id = ids.new()
    native = native_idevice(activity, idevice_id)
    return _component(
        page_id, block_id, idevice_id, native.type_name, native.html_view, native.json_properties
    )


def _nav_structure(ids: OdeIdFactory, order: int, page: ElpxPage) -> str:
    label = page.label
    page_id = ids.new()
    block_id = ids.new()
    safe_label = xml_escape(label)
    block_props = _key_values(
        "odePagStructureProperties",
        "odePagStructureProperty",
        [
            ("visibility", "true"),
            ("teacherOnly", "false"),
            ("allowToggle", "true"),
            ("minimized", "false"),
        ],
        "        ",
    )
    # Mismo juego de claves que escribe eXe: sin titleHtml/description su editor avisa.
    nav_props = _key_values(
        "odeNavStructureProperties",
        "odeNavStructureProperty",
        [
            ("titlePage", label),
            ("visibility", "true"),
            ("highlight", "false"),
            ("hidePageTitle", "false"),
            ("editableInPage", "false"),
            ("titleNode", label),
            ("titleHtml", ""),
            ("description", ""),
        ],
        "    ",
    )
    if page.activity is not None:
        component = _native_idevice(ids, page_id, block_id, page.activity)
    else:
        component = _text_idevice(ids, page_id, block_id, f"{CONTEXT_PATH}/{page.src}", label)
    return f"""  <odeNavStructure>
    <odePageId>{page_id}</odePageId>
    <odeParentPageId></odeParentPageId>
    <pageName>{safe_label}</pageName>
    <odeNavStructureOrder>{order}</odeNavStructureOrder>
{nav_props}
    <odePagStructures>
      <odePagStructure>
        <odePageId>{page_id}</odePageId>
        <odeBlockId>{block_id}</odeBlockId>
        <blockName>{safe_label}</blockName>
        <iconName></iconName>
        <odePagStructureOrder>1</odePagStructureOrder>
{block_props}
        <odeComponents>
{component}
        </odeComponents>
      </odePagStructure>
    </odePagStructures>
  </odeNavStructure>"""


def build_content_xml(
    course_title: str, module_title: str, pages: list[ElpxPage], ids: OdeIdFactory,
    metadata: EducationalMetadata | None = None,
    theme: str = "upao",
) -> str:
    meta = metadata or EducationalMetadata(description=module_title)
    properties = [
        ("pp_title", course_title),
        ("pp_description", meta.description or ""),
        ("pp_lang", meta.language),
        ("pp_author", meta.author),
        ("pp_keywords", ", ".join(meta.keywords)),
        ("pp_license", meta.exe_license),
        ("pp_licenseUrl", meta.license_url),
        ("pp_category", meta.educational_level),
        ("pp_extraHeadContent",
         f'<meta name="audience" content="{html_escape(meta.audience, quote=True)}" />'
         f'<meta name="typical-learning-time" content="{html_escape(meta.typical_learning_time, quote=True)}" />'
         f'<style id="genova-package-theme">{theme_css(theme)}</style>'),
        ("pp_theme", "base"),
        ("pp_addExeLink", "false"),
        ("pp_addPagination", "true"),
        ("pp_addSearchBox", "false"),
        ("pp_addAccessibilityToolbar", "false"),
        ("pp_addMathJax", "false"),
        ("exportSource", "true"),
    ]
    resources = [("odeId", ids.new()), ("odeVersionId", ids.new()), ("exe_version", EXE_VERSION)]
    nav = "\n".join(_nav_structure(ids, order, page) for order, page in enumerate(pages, start=1))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ode SYSTEM "content.dtd">
<ode xmlns="{ODE_NAMESPACE}" version="2.0">
{_key_values("userPreferences", "userPreference", [("theme", "base")], "")}
{_key_values("odeResources", "odeResource", resources, "")}
{_key_values("odeProperties", "odeProperty", properties, "")}
<odeNavStructures>
{nav}
</odeNavStructures>
</ode>
"""


def build_elpx_bytes(
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
    *,
    metadata: EducationalMetadata | None = None,
    theme: str = "upao",
    now: datetime | None = None,
    rng: random.Random | None = None,
) -> bytes:
    ids = OdeIdFactory(now, rng)
    pages: list[ElpxPage] = []
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for resource in prepare_phase_resources(phases, theme):
            if resource.activity is not None:
                pages.append(ElpxPage(resource.label, activity=resource.activity))
                continue
            rel = f"{GENOVA_FOLDER}/{resource.basename}.html"
            zip_file.writestr(f"{RESOURCES_DIR}/{rel}", resource.html)
            for item in resource.media:
                zip_file.writestr(
                    f"{RESOURCES_DIR}/{GENOVA_FOLDER}/{item.name}",
                    item.data,
                    compress_type=ZIP_STORED,
                )
            pages.append(ElpxPage(resource.label, src=rel))
        zip_file.writestr("content.xml", build_content_xml(course_title, module_title, pages, ids, metadata, theme))
    return buffer.getvalue()
