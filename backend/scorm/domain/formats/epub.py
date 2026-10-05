"""Paquete EPUB 3: un capítulo XHTML por fase.

Estructura del contenedor (OCF):

    mimetype                 # primero y sin comprimir
    META-INF/container.xml   # apunta a EPUB/package.opf
    EPUB/package.opf         # metadatos, manifest y spine
    EPUB/nav.xhtml           # índice (properties="nav")
    EPUB/recurso_N.xhtml     # una fase; "scripted" si lleva JS
    EPUB/media/…             # videos extraídos de los recursos
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from html import escape as html_escape
from io import BytesIO
from xml.sax.saxutils import escape as xml_escape
from xml.sax.saxutils import quoteattr
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo

from scorm.domain.formats.xhtml import html_to_xhtml
from scorm.domain.resources import prepare_phase_resources

EPUB_MIMETYPE = "application/epub+zip"
CONTENT_DIR = "EPUB"

_CONTAINER_XML = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


def _nav_xhtml(course_title: str, chapters: list[tuple[str, str]]) -> str:
    items = "\n".join(
        f'        <li><a href="{html_escape(href, quote=True)}">{html_escape(label)}</a></li>'
        for href, label in chapters
    )
    title = html_escape(course_title)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>{title}</h1>
      <ol>
{items}
      </ol>
    </nav>
  </body>
</html>
"""


def _package_opf(
    course_title: str,
    module_title: str,
    identifier: str,
    modified: datetime,
    manifest_items: list[dict],
    spine_ids: list[str],
) -> str:
    items = "\n".join(
        "    <item "
        + " ".join(f"{key}={quoteattr(value)}" for key, value in item.items() if value)
        + " />"
        for item in manifest_items
    )
    spine = "\n".join(f'    <itemref idref="{idref}" />' for idref in spine_ids)
    stamp = modified.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="es">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">{xml_escape(identifier)}</dc:identifier>
    <dc:title>{xml_escape(course_title)}</dc:title>
    <dc:description>{xml_escape(module_title)}</dc:description>
    <dc:creator>GenOVA</dc:creator>
    <dc:language>es</dc:language>
    <meta property="dcterms:modified">{stamp}</meta>
  </metadata>
  <manifest>
{items}
  </manifest>
  <spine>
{spine}
  </spine>
</package>
"""


def build_epub_bytes(
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
    *,
    identifier: str | None = None,
    modified: datetime | None = None,
) -> bytes:
    identifier = identifier or f"urn:uuid:{uuid.uuid4()}"
    modified = modified or datetime.now(UTC)

    manifest_items: list[dict] = [
        {
            "id": "nav",
            "href": "nav.xhtml",
            "media-type": "application/xhtml+xml",
            "properties": "nav",
        }
    ]
    spine_ids: list[str] = []
    chapters: list[tuple[str, str]] = []

    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        # OCF: `mimetype` es la primera entrada, sin comprimir y sin campos extra.
        zip_file.writestr(ZipInfo("mimetype"), EPUB_MIMETYPE, compress_type=ZIP_STORED)
        zip_file.writestr("META-INF/container.xml", _CONTAINER_XML)

        for resource in prepare_phase_resources(phases):
            page = html_to_xhtml(resource.html, resource.label)
            href = f"{resource.basename}.xhtml"
            zip_file.writestr(f"{CONTENT_DIR}/{href}", page.xhtml)
            properties = " ".join(
                prop
                for prop, enabled in (
                    ("scripted", page.scripted),
                    ("remote-resources", page.remote_resources),
                )
                if enabled
            )
            manifest_items.append(
                {
                    "id": resource.basename,
                    "href": href,
                    "media-type": "application/xhtml+xml",
                    "properties": properties,
                }
            )
            spine_ids.append(resource.basename)
            chapters.append((href, resource.label))
            for item in resource.media:
                zip_file.writestr(f"{CONTENT_DIR}/{item.name}", item.data, compress_type=ZIP_STORED)
                manifest_items.append(
                    {
                        "id": item.name.rsplit("/", 1)[-1].rsplit(".", 1)[0],
                        "href": item.name,
                        "media-type": item.media_type,
                    }
                )

        zip_file.writestr(f"{CONTENT_DIR}/nav.xhtml", _nav_xhtml(course_title, chapters))
        zip_file.writestr(
            f"{CONTENT_DIR}/package.opf",
            _package_opf(
                course_title, module_title, identifier, modified, manifest_items, spine_ids
            ),
        )

    return buffer.getvalue()
