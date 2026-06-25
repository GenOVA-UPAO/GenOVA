"""Escribe la carpeta de resultados navegable (HTML por fase + SCORM extraido)
y el ``report.md`` indice agregado.
"""

import io
import json
import re
import zipfile
from pathlib import Path

from scripts.ova_e2e.flow import FlowResult

_MARK = {True: "OK", False: "FAIL", None: "skip"}


def _safe(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", s or "x")[:40]


def write_profile(
    out_dir: Path,
    profile,
    flow: FlowResult,
    checks: list[dict],
    requested: list[dict],
    rag: dict | None,
    rag_file: tuple[str, bytes] | None,
) -> dict:
    """Vuelca todo lo de un perfil. Devuelve un resumen para el indice."""
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "job.json").write_text(json.dumps(flow.job, indent=2, ensure_ascii=False), "utf-8")

    n_phases = _dump_phases(out_dir / "phases", flow.editar)
    _dump_scorm(out_dir, flow.scorm_bytes)
    _dump_rag(out_dir / "rag", rag, rag_file)

    report = {
        "profile": profile.name,
        "applied_settings": profile.settings,
        "applied_enabled": profile.enabled,
        "warnings": profile.warnings,
        "requested_resources": requested,
        "elapsed_s": round(flow.elapsed_s, 1),
        "hung": flow.hung,
        "job_status": (flow.job or {}).get("status"),
        "ova_id": flow.ova_id,
        "rag": rag,
        "checks": checks,
        "phases_written": n_phases,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), "utf-8")

    passed = sum(1 for c in checks if c["ok"] is True)
    total = sum(1 for c in checks if c["ok"] is not None)
    return {
        "profile": profile.name,
        "checks": checks,
        "passed": passed,
        "total": total,
        "report": report,
    }


def _dump_phases(phases_dir: Path, editar: dict | None) -> int:
    if not editar:
        return 0
    phases = (editar.get("current_version") or {}).get("phases") or []
    if not phases:
        return 0
    phases_dir.mkdir(parents=True, exist_ok=True)
    for p in sorted(phases, key=lambda x: x.get("phase_order", 0)):
        order = p.get("phase_order", 0)
        rt = p.get("resource_type_id") or p.get("title") or "x"
        name = f"{order}_{_safe(p.get('phase_type', ''))}_{_safe(str(rt))}.html"
        (phases_dir / name).write_text(p.get("content") or "", "utf-8")
    return len(phases)


def _dump_scorm(out_dir: Path, data: bytes | None) -> None:
    if not data:
        return
    (out_dir / "scorm.zip").write_bytes(data)
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except Exception:  # noqa: BLE001
        return
    dest = out_dir / "scorm"
    dest.mkdir(parents=True, exist_ok=True)
    zf.extractall(dest)


def _dump_rag(rag_dir: Path, rag: dict | None, rag_file: tuple[str, bytes] | None) -> None:
    if rag is None and rag_file is None:
        return
    rag_dir.mkdir(parents=True, exist_ok=True)
    if rag_file:
        rag_dir.joinpath(_safe(rag_file[0])).write_bytes(rag_file[1])
    if rag is not None:
        rag_dir.joinpath("chunks.json").write_text(
            json.dumps(rag, indent=2, ensure_ascii=False), "utf-8"
        )


def write_index(out_root: Path, prompt: str, summaries: list[dict]) -> None:
    lines = [f"# OVA E2E — `{prompt}`", ""]
    for s in summaries:
        r = s["report"]
        lines.append(f"## Perfil: {s['profile']}  ({s['passed']}/{s['total']} aserciones)")
        lines.append(
            f"- job: **{r['job_status']}**  hung={r['hung']}  "
            f"{r['elapsed_s']}s  ova_id={r['ova_id']}"
        )
        if r["applied_settings"]:
            asign = ", ".join(
                f"{k}={v.get('provider')}/{v.get('model_id')}"
                for k, v in r["applied_settings"].items()
            )
            lines.append(f"- modelos: {asign}")
        if r["warnings"]:
            lines.append(f"- ⚠ {'; '.join(r['warnings'])}")
        for c in s["checks"]:
            lines.append(f"  - [{_MARK[c['ok']]}] {c['name']}: {c['detail']}")
        lines.append(f"- artefactos: `{s['profile']}/scorm/index.html`, `{s['profile']}/phases/`")
        lines.append("")
    (out_root / "report.md").write_text("\n".join(lines), "utf-8")
