"""Aserciones del flujo Prometheus sobre lo recolectado por ``flow.run_flow``.

Cada asercion es ``{"name", "ok"(bool|None), "detail"}``. ``ok=None`` = omitida.
"""

import io
import zipfile
from collections import Counter

from scripts.ova_e2e.flow import FlowResult

_CANON = ["engage", "explore", "explain", "elaborate", "evaluate"]


def _phase_sequence(editar: dict | None) -> list[str]:
    if not editar:
        return []
    phases = (editar.get("current_version") or {}).get("phases") or []
    phases = sorted(phases, key=lambda p: p.get("phase_order", 0))
    return [p.get("phase_type", "") for p in phases]


def _is_canonical_order(seq: list[str]) -> bool:
    """Las fases distintas aparecen en el orden canonico 5E (subsecuencia)."""
    distinct = list(dict.fromkeys(seq))
    idx = [_CANON.index(p) for p in distinct if p in _CANON]
    return idx == sorted(idx)


def verify(
    flow: FlowResult,
    requested: list[dict],
    rag_summary: dict | None,
    backend_log: str | None = None,
) -> list[dict]:
    checks: list[dict] = []

    # (a) RAG
    if rag_summary is None:
        checks.append({"name": "rag_ingesta", "ok": None, "detail": "omitido (--no-rag)"})
    else:
        n = rag_summary.get("chunks", 0)
        checks.append(
            {"name": "rag_ingesta", "ok": n > 0, "detail": f"{n} chunks persistidos"}
        )

    # (b) terminal dentro del timeout
    status = (flow.job or {}).get("status")
    checks.append(
        {
            "name": "job_terminal",
            "ok": (not flow.hung) and status in {"done", "error", "interrupted", "canceled"},
            "detail": f"status={status} hung={flow.hung} ({flow.elapsed_s:.0f}s)",
        }
    )

    # (c) orden de fases 5E
    seq = _phase_sequence(flow.editar)
    checks.append(
        {
            "name": "orden_5e",
            "ok": _is_canonical_order(seq) if seq else None,
            "detail": "→".join(dict.fromkeys(seq)) or "sin fases materializadas",
        }
    )

    # (d) recursos en estado terminal
    res = (flow.job or {}).get("resources", [])
    c = Counter(r.get("status") for r in res)
    pending = c.get("pending", 0) + c.get("running", 0)
    checks.append(
        {
            "name": "recursos_terminal",
            "ok": len(res) > 0 and pending == 0,
            "detail": f"pedidos={len(requested)} done={c.get('done', 0)} "
            f"error={c.get('error', 0)} pending={pending}",
        }
    )

    # (e) SCORM valido
    checks.append(_check_scorm(flow))

    # (f) concierge corrio (best-effort sobre backend.log)
    if backend_log:
        ran = "Concierge plan:" in backend_log
        checks.append({"name": "concierge_corrio", "ok": ran, "detail": _concierge_line(backend_log)})
    else:
        checks.append({"name": "concierge_corrio", "ok": None, "detail": "sin backend.log"})

    return checks


def _check_scorm(flow: FlowResult) -> dict:
    if not flow.scorm_bytes:
        return {"name": "scorm", "ok": False, "detail": flow.scorm_error or "no descargado"}
    try:
        zf = zipfile.ZipFile(io.BytesIO(flow.scorm_bytes))
        names = zf.namelist()
    except Exception as exc:  # noqa: BLE001
        return {"name": "scorm", "ok": False, "detail": f"zip invalido: {exc}"}
    has_index = "index.html" in names
    has_res = any(n.startswith("resources/recurso_") for n in names)
    return {
        "name": "scorm",
        "ok": has_index and has_res,
        "detail": f"{len(names)} entradas, index={has_index} recursos={has_res}",
    }


def _concierge_line(log: str) -> str:
    for line in log.splitlines():
        if "Concierge plan:" in line:
            return line.split("Concierge plan:")[-1].strip()[:80]
    return "no encontrado"
