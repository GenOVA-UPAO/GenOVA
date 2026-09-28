"""Measure resource instructions without shared DS/SCORM/context expansion.

Run from backend: python -m tests.prompt_component_metrics [git-baseline]
The baseline is read-only; no generation or provider calls are made.
"""

import json
import subprocess
import sys
import tomllib
from pathlib import Path
from string import Template

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")
DIRECT = {
    "engage": {6, 10},
    "explore": {1, 6, 10},
    "explain": {2, 3, 5, 8, 10},
    "elaborate": {4, 5, 7, 9},
    "evaluate": {3, 5, 8, 9, 10},
}
DATA = Path(__file__).resolve().parents[1] / "prometheus" / "prompts" / "data"


def render_entry(entry, **extra):
    params = dict(entry.get("defaults", {}))
    for key, value in list(params.items()):
        params[f"{key}_plus1"] = value + 1
        params[f"{key}_plus2"] = value + 2
    return Template(entry["template"]).substitute(
        concept="TEMA", curso="", ds="", scorm="", data_json="{}", **params, **extra
    )


def instruction_size(phase, data):
    """Sum the ten production routes, including text stage where applicable."""
    total = 0
    for n in range(1, 11):
        if phase == "engage" and n == 10:
            total += len(render_entry(data["simulador"]))
        elif n in DIRECT[phase]:
            total += len(render_entry(data["codigo"][str(n)]))
        else:
            total += len(render_entry(data["texto"][str(n)]))
            html = data["html"]
            total += len(render_entry(html, estilo=html["estilos"][str(n)]))
    return total


def measure(baseline="HEAD"):
    result = {}
    for phase in PHASES:
        path = f"backend/prometheus/prompts/data/{phase}.toml"
        before = subprocess.check_output(
            ["git", "show", f"{baseline}:{path}"], cwd=DATA, encoding="utf-8"
        )
        after = (DATA / f"{phase}.toml").read_text(encoding="utf-8")
        result[phase] = {
            "source_before": len(before),
            "source_after": len(after),
            "instructions_before": instruction_size(phase, tomllib.loads(before)),
            "instructions_after": instruction_size(phase, tomllib.loads(after)),
        }
    return result


if __name__ == "__main__":
    print(json.dumps(measure(sys.argv[1] if len(sys.argv) > 1 else "HEAD"), indent=2))
