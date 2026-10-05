"""imsmanifest.xml para SCORM 2004 (4.ª edición) e IMS Content Packaging 1.1.4.

El manifiesto de SCORM 1.2 vive en `html.build_manifest` (histórico). Los tres
describen el mismo paquete: un único recurso (el shell `index.html`) que declara
todos los archivos del zip.
"""

from xml.sax.saxutils import escape as xml_escape

# Archivos del shell comunes a todos los paquetes basados en `index.html`.
SHELL_FILES = (
    "index.html",
    "resources/styles.css",
    "resources/scorm.js",
    "resources/xapi.js",
    "resources/app.js",
)


def _file_tags(files: list[str]) -> str:
    return "\n".join(f'      <file href="{xml_escape(f, {chr(34): "&quot;"})}" />' for f in files)


def build_manifest_2004(course_title: str, module_title: str, resource_files: list[str]) -> str:
    """Manifiesto SCORM 2004 4th Edition: un SCO (`adlcp:scormType="sco"`)."""
    files = _file_tags([*SHELL_FILES, *resource_files, "cmi5.xml"])
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest
  identifier="GENOVA-SCORM2004-EXPORT"
  version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
  http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
  http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
  http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
  http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
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
    <resource identifier="RES-INDEX" type="webcontent" adlcp:scormType="sco" href="index.html">
{files}
    </resource>
  </resources>
</manifest>
"""


def build_ims_manifest(course_title: str, module_title: str, resource_files: list[str]) -> str:
    """Manifiesto IMS Content Packaging 1.1.4, sin extensiones ADL/SCORM."""
    files = _file_tags([*SHELL_FILES, *resource_files])
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest
  identifier="GENOVA-IMSCP-EXPORT"
  version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd">

  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.4</schemaversion>
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
    <resource identifier="RES-INDEX" type="webcontent" href="index.html">
{files}
    </resource>
  </resources>
</manifest>
"""
