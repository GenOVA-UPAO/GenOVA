#!/usr/bin/env python3
"""Genera docs/matriz-trazabilidad.md: requisito ↔ capas de test que lo cubren.

Fuentes (solo stdlib, sin dependencias):
  - feature_list.json                      → id, título, status de cada requisito
  - tests/features/**/*.feature            → escenarios por ID (ID en el nombre de archivo)
  - tests/cucumber.unit.config.mjs         → features que corren en la capa unit
  - tests/playwright.config.js             → features que corren en la capa e2e (con globs)
  - backend/tests/step_defs/*.py           → features referenciadas por pytest-bdd
  - tests/load/                            → cobertura de RN-001/RN-004 (Locust)

Uso:  python scripts/gen_traceability.py        (desde la raíz del repo)
"""

import glob
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEATURES_DIR = ROOT / "tests" / "features"
OUT = ROOT / "docs" / "matriz-trazabilidad.md"

# Sin \b final: en "HU-008_login" el guion bajo es carácter de palabra y \b no matchea.
ID_RE = re.compile(r"\b((?:HU|EN|BU|RN|TA|SP|DO|EP)-\d{3})(?!\d)")
SCENARIO_RE = re.compile(r"^\s*(Scenario|Scenario Outline|Escenario)\s*:", re.MULTILINE)

# Cobertura fuera de las 3 capas BDD (mantener a mano; es corta y explícita).
EXTRA_COVERAGE = {
    "RN-001": "carga (tests/load, gate P90 ≤ 278 ms)",
    "RN-004": "carga (tests/load) + backend/tests/test_latency.py",
}
# Tipos que no son testeables como requisito ejecutable.
NON_TESTABLE = {"EP": "épica (agrupa HUs)", "SP": "spike", "DO": "documentación"}


def feature_id(path: Path) -> str | None:
    m = ID_RE.search(path.name)
    return m.group(1) if m else None


def scan_features() -> tuple[dict, dict]:
    """→ (escenarios por ID, paths de features por ID)."""
    scenarios, paths = defaultdict(int), defaultdict(list)
    for f in sorted(FEATURES_DIR.rglob("*.feature")):
        fid = feature_id(f)
        if not fid:
            continue
        scenarios[fid] += len(SCENARIO_RE.findall(f.read_text(encoding="utf-8")))
        paths[fid].append(f.relative_to(ROOT).as_posix())
    return scenarios, paths


def _ids_from_feature_names(names: list[str]) -> set[str]:
    return {m.group(1) for n in names for m in [ID_RE.search(Path(n).name)] if m}


def unit_ids() -> set[str]:
    cfg = (ROOT / "tests" / "cucumber.unit.config.mjs").read_text(encoding="utf-8")
    active = [
        line for line in cfg.splitlines() if ".feature" in line and not line.strip().startswith("//")
    ]
    return _ids_from_feature_names(active)


def e2e_ids() -> set[str]:
    cfg = (ROOT / "tests" / "playwright.config.js").read_text(encoding="utf-8")
    entries = re.findall(r"'(features/[^']+)'", cfg)
    names: list[str] = []
    for e in entries:
        if "*" in e:
            names += glob.glob(str(ROOT / "tests" / e))
        else:
            names.append(e)
    return _ids_from_feature_names(names)


def backend_ids() -> set[str]:
    ids: set[str] = set()
    for py in (ROOT / "backend" / "tests").rglob("*.py"):
        text = py.read_text(encoding="utf-8", errors="ignore")
        for line in text.splitlines():
            if ".feature" in line:
                ids |= {m.group(1) for m in ID_RE.finditer(line)}
    return ids


def load_backlog() -> list[dict]:
    data = json.loads((ROOT / "feature_list.json").read_text(encoding="utf-8"))
    return data.get("features", [])


def main() -> None:
    scenarios, paths = scan_features()
    unit, e2e, backend = unit_ids(), e2e_ids(), backend_ids()
    backlog = load_backlog()
    backlog_ids = {f["id"] for f in backlog}
    all_ids = sorted(backlog_ids | set(scenarios), key=lambda i: (i.split("-")[0], i))

    check = lambda ok: "✅" if ok else "—"  # noqa: E731
    rows, gaps = [], []
    for fid in all_ids:
        meta = next((f for f in backlog if f["id"] == fid), {})
        title = meta.get("title", "")
        status = meta.get("status", "")
        kind = fid.split("-")[0]
        extra = EXTRA_COVERAGE.get(fid, "")
        covered = fid in unit or fid in e2e or fid in backend or bool(extra)
        if kind in NON_TESTABLE:
            note = f"N/A — {NON_TESTABLE[kind]}"
            rows.append((fid, title, status, "—", "—", "—", "—", note))
            continue
        if not covered and status == "done":
            gaps.append(fid)
        rows.append(
            (
                fid,
                title,
                status,
                str(scenarios.get(fid, 0)),
                check(fid in unit),
                check(fid in backend),
                check(fid in e2e),
                extra or ("⚠️ sin cobertura" if not covered else ""),
            )
        )

    lines = [
        "# Matriz de trazabilidad requisito ↔ test",
        "",
        f"> Generado por `scripts/gen_traceability.py` el {date.today().isoformat()} — **no editar a mano**.",
        "> Capas: **unit** (cucumber-js), **backend** (pytest-bdd), **e2e** (playwright-bdd).",
        "> Los `.feature` verbatim de specs cuentan escenarios aunque su capa ejecutable sea otra.",
        "",
        "| ID | Título | Status | Escenarios | Unit | Backend | E2E | Notas |",
        "|---|---|---|---:|:-:|:-:|:-:|---|",
    ]
    lines += ["| " + " | ".join(r) + " |" for r in rows]

    testable = [r for r in rows if not r[7].startswith("N/A")]
    covered_n = sum(1 for r in testable if "✅" in (r[4], r[5], r[6]) or r[7].startswith("carga"))
    lines += [
        "",
        "## Resumen",
        "",
        f"- Requisitos testeables: **{len(testable)}** · con cobertura en ≥1 capa: **{covered_n}**",
        f"- Escenarios Gherkin totales: **{sum(scenarios.values())}** en {sum(len(p) for p in paths.values())} archivos `.feature`",
        f"- Capa unit: {len(unit)} IDs · backend: {len(backend)} IDs · e2e: {len(e2e)} IDs",
    ]
    if gaps:
        lines += [
            "",
            "## ⚠️ Requisitos `done` sin cobertura de test",
            "",
        ] + [f"- {g}" for g in gaps]

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"OK → {OUT.relative_to(ROOT)} ({len(rows)} filas, {len(gaps)} huecos en done)")


if __name__ == "__main__":
    main()
