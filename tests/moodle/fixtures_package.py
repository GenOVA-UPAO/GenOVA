"""Exportación real de GenOVA (sin DB ni LLM) para el smoke de Moodle."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from ova_engine.pipeline import render_resource  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402
from scorm import build_scorm_zip_bytes  # noqa: E402


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


if __name__ == "__main__":
    main()
