"""Exportación real de GenOVA (sin DB ni LLM) para el smoke de Moodle."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from ova_engine.pipeline import render_resource  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402
from scorm import build_export, build_scorm_zip_bytes  # noqa: E402


def main():
    out = ROOT / "tests" / ".ova-rendered"
    out.mkdir(parents=True, exist_ok=True)
    phases = []
    for order, name in enumerate(["engage_01", "elaborate_04", "evaluate_01"], 1):
        phase, rt = name.split("_")
        spec = all_specs()[f"{phase}:{int(rt)}"]
        fixture = json.loads((ROOT / "backend/tests/fixtures/ova_engine" / f"{name}.json").read_text())
        html = render_resource(spec, fixture["data"], fixture["concept"], fixture["params"])
        phases.append({"type": phase, "order": order, "title": name, "content": html})
    package = out / "genova-scorm.zip"
    package.write_bytes(build_scorm_zip_bytes(
        course_title="GenOVA SCORM CI", module_title="GenOVA tres recursos", phases=phases,
    ))
    print(package)
    # Mismo contenido como SCORM 2004 4.ª edición (runtime API_1484_11).
    package2004 = out / "genova-scorm2004.zip"
    package2004.write_bytes(build_export(
        "scorm2004", "GenOVA SCORM 2004 CI", phases, module_title="GenOVA tres recursos 2004",
    ))
    print(package2004)
    # H5P: las plantillas de evaluación con equivalente editable, con sus datos
    # estructurados como los deja ExportPackage (`phase["activity"]`).
    h5p_phases = []
    for order, name in enumerate(["evaluate_01", "evaluate_05", "evaluate_06", "evaluate_07"], 1):
        phase, rt = name.split("_")
        spec = all_specs()[f"{phase}:{int(rt)}"]
        fixture = json.loads((ROOT / "backend/tests/fixtures/ova_engine" / f"{name}.json").read_text())
        h5p_phases.append({
            "type": phase, "order": order, "title": spec.title,
            "content": render_resource(spec, fixture["data"], fixture["concept"], fixture["params"]),
            "activity": {"template": spec.key, "data": fixture["data"], "params": fixture["params"]},
        })
    package_h5p = out / "genova.h5p"
    package_h5p.write_bytes(build_export("h5p", "GenOVA H5P CI", h5p_phases))
    print(package_h5p)


if __name__ == "__main__":
    main()
