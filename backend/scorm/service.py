from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from scorm.template_html import build_content_html, build_index_html, build_manifest
from scorm.template_scripts import build_app_js, build_scorm_js
from scorm.template_style import build_styles_css


def build_scorm_zip_bytes(
    course_title: str = "OVA ML UPAO - Demo SCORM",
    module_title: str = "Módulo de prueba",
) -> bytes:
    zip_buffer = BytesIO()

    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        zip_file.writestr("imsmanifest.xml", build_manifest(course_title, module_title))
        zip_file.writestr("index.html", build_index_html(course_title))
        zip_file.writestr("resources/content.html", build_content_html())
        zip_file.writestr("resources/styles.css", build_styles_css())
        zip_file.writestr("resources/scorm.js", build_scorm_js())
        zip_file.writestr("resources/app.js", build_app_js())

    return zip_buffer.getvalue()
