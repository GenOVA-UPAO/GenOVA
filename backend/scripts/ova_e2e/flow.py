"""Orquesta un OVA de punta a punta vía HTTP: start job → poll → recolectar.

El poll tiene **timeout duro**: si el job no llega a un estado terminal a tiempo,
se marca ``hung`` (el bug de carga infinita) y se devuelve lo que haya, para que
el reporte + ``backend.log`` muestren dónde se quedó.
"""

import time
from collections import Counter
from dataclasses import dataclass, field

from scripts.ova_e2e.client import ApiClient

_PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")
_TERMINAL = {"done", "error", "interrupted", "canceled"}
_POLL_S = 5


@dataclass
class FlowResult:
    job: dict = field(default_factory=dict)
    elapsed_s: float = 0.0
    hung: bool = False
    ova_id: str | None = None
    editar: dict | None = None
    scorm_bytes: bytes | None = None
    scorm_error: str | None = None


def default_resources(spec: str | None) -> list[dict]:
    if not spec:
        return [{"phase_type": p, "resource_type": "1"} for p in _PHASES]
    out: list[dict] = []
    for tok in spec.split(","):
        tok = tok.strip()
        if not tok:
            continue
        phase, _, rt = tok.partition(":")
        out.append({"phase_type": phase.strip().lower(), "resource_type": rt.strip() or "1"})
    return out


def _counts(resources: list[dict]) -> str:
    c = Counter(r.get("status") for r in resources)
    return " ".join(f"{k}={c[k]}" for k in ("done", "running", "pending", "error") if c[k])


def run_flow(
    client: ApiClient,
    prompt: str,
    resources: list[dict],
    theme: dict,
    upload_ids: list[str],
    timeout_s: float,
    log_cb=print,
) -> FlowResult:
    body = {
        "prompt": prompt,
        "resources": resources,
        "theme": theme,
        "upload_ids": upload_ids,
    }
    started = client.post("/api/ova/jobs", body)
    job_id = started["job_id"]
    log_cb(f"[job] {job_id[:8]}.. {started.get('status')} → POST ok")

    t0 = time.monotonic()
    res = FlowResult()
    job: dict = {}
    while True:
        job = client.get(f"/api/ova/jobs/{job_id}")
        elapsed = time.monotonic() - t0
        log_cb(f"[poll] {job['status']:<11} {_counts(job.get('resources', []))}  ({elapsed:.0f}s)")
        if job["status"] in _TERMINAL:
            break
        if elapsed > timeout_s:
            res.hung = True
            log_cb(f"[poll] HUNG — sin estado terminal tras {timeout_s:.0f}s")
            break
        time.sleep(_POLL_S)

    res.job = job
    res.elapsed_s = time.monotonic() - t0
    res.ova_id = job.get("ova_id")
    if res.ova_id and not res.hung:
        _collect_artifacts(client, res, log_cb)
    return res


def _collect_artifacts(client: ApiClient, res: FlowResult, log_cb) -> None:
    try:
        res.editar = client.get(f"/api/ovas/{res.ova_id}/editar")
    except Exception as exc:  # noqa: BLE001 — 409/404 si no materializó
        log_cb(f"[ova] editar no disponible: {exc}")
    try:
        res.scorm_bytes = client.download(f"/api/ova/{res.ova_id}/scorm")
        log_cb(f"[scorm] descargado {len(res.scorm_bytes) / 1024:.0f} KB ok")
    except Exception as exc:  # noqa: BLE001 — sin SCORM si 0 recursos done
        res.scorm_error = str(exc)
        log_cb(f"[scorm] no disponible: {exc}")
