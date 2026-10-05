from hashlib import sha256
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

from core.educational_metadata import EducationalMetadata
from scorm.domain.resources import DEFAULT_PHASES, prepare_phase_resources
from scorm.domain.templates.html import build_index_html, build_manifest
from scorm.domain.templates.manifests import build_ims_manifest, build_manifest_2004
from scorm.domain.templates.scripts import build_app_js, build_scorm_js
from scorm.domain.templates.style import build_styles_css
from scorm.domain.templates.xapi import build_cmi5_xml, build_xapi_js

__all__ = ["DEFAULT_PHASES", "SHELL_FLAVORS", "build_scorm_zip_bytes", "build_shell_zip_bytes"]

# Paquetes que comparten el shell `index.html` + iframe por recurso. Difieren en
# el manifiesto, en la API SCORM preferida por scorm.js y en el rótulo del shell.
#   flavor: (manifest builder | None, versión SCORM preferida, rótulo, incluye cmi5.xml)
SHELL_FLAVORS = {
    "scorm12": (build_manifest, "1.2", "SCORM 1.2", True),
    "scorm2004": (build_manifest_2004, "2004", "SCORM 2004", True),
    "ims": (build_ims_manifest, "1.2", "IMS Content Package", False),
    "html": (None, "1.2", "Web", False),
}


def build_shell_zip_bytes(
    flavor: str,
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
    *, metadata: EducationalMetadata | None = None,
) -> bytes:
    """Zip con el shell `index.html` y un recurso HTML por fase en `resources/`.

    Cada fase es su propio documento cargado en un iframe del shell: mantiene
    aislados los documentos completos (con su JS) generados por la IA. IMS y
    HTML guardan el progreso local; SCORM informa al aula virtual si hay API.
    """
    manifest_builder, scorm_version, package_label, with_cmi5 = SHELL_FLAVORS[flavor]

    resources = []
    progress_digest = sha256(f"{flavor}\0{course_title}\0{module_title}".encode())
    media: list[str] = []
    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for resource in prepare_phase_resources(phases):
            file_rel = f"resources/{resource.basename}.html"
            progress_digest.update(
                f"\0{file_rel}\0{resource.label}\0{resource.html}".encode()
            )
            zip_file.writestr(file_rel, resource.html)
            for item in resource.media:
                # Un video ya está comprimido: deflate no gana nada y cuesta CPU.
                zip_file.writestr(f"resources/{item.name}", item.data, compress_type=ZIP_STORED)
                media.append(f"resources/{item.name}")
            resources.append({"order": resource.order, "label": resource.label, "file": file_rel})

        if manifest_builder is not None:
            resource_files = [r["file"] for r in resources] + media
            zip_file.writestr(
                "imsmanifest.xml", manifest_builder(course_title, module_title, resource_files, metadata)
            )
        zip_file.writestr(
            "index.html",
            build_index_html(
                course_title, resources, package_label, metadata,
                package_format=flavor, progress_key=progress_digest.hexdigest(),
            ),
        )
        zip_file.writestr("resources/styles.css", build_styles_css())
        zip_file.writestr("resources/scorm.js", build_scorm_js(scorm_version))
        zip_file.writestr("resources/xapi.js", build_xapi_js())
        zip_file.writestr("resources/app.js", build_app_js())
        if with_cmi5:
            # cmi5 course structure so the same package imports into xAPI/cmi5 LMSs.
            # The xapi.js runtime is a no-op unless launched with cmi5 parameters.
            zip_file.writestr("cmi5.xml", build_cmi5_xml(course_title, module_title))

    return zip_buffer.getvalue()


def build_scorm_zip_bytes(
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
    *, metadata: EducationalMetadata | None = None,
) -> bytes:
    """Assemble a SCORM 1.2 package. Each phase becomes its own HTML resource
    file loaded in an iframe by the SCO shell — keeps full HTML documents
    (engage/explore AI output) isolated and renderable."""
    return build_shell_zip_bytes("scorm12", course_title, module_title, phases, metadata=metadata)
