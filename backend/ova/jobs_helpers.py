"""EN-013 — request validation + response shaping for the jobs router.

Kept apart from the router so the HTTP layer stays thin (router → service →
model, C7) and under 200 lines. Nothing here touches the LLM or the DB beyond
serializing already-loaded ORM rows. Responses expose only `status` + `error_id`
per resource — never `str(e)`, content, tokens or credentials (R8).
"""
from pydantic import BaseModel, Field

from models import OvaJob, OvaJobResource

# HU-022/B1: a 5E generation produces one resource row per chosen resource. The
# client picks N resources by (phase_type, resource_type); `resource_type` is the
# id/name the runner resolves to a numeric ENGAGE/EXPLORE generator id (1-10) via
# RECURSOS_META. When the client omits `resources` we fall back to one generic
# ENGAGE + one generic EXPLORE resource (legacy "phases" shape, back-compat).
_DEFAULT_PLAN = (("engage", 1), ("explore", 2))
_PHASE_ORDER = {"engage": 1, "explore": 2}


class ResourceRequest(BaseModel):
    """One chosen resource: which 5E phase and which resource type (id 1-10 or name)."""

    phase_type: str = Field(min_length=1, max_length=30)
    resource_type: str = Field(min_length=1, max_length=40)


class ResumeRequest(BaseModel):
    """Optional body of POST /jobs/{id}/resume — restrict resume to these resources (B4)."""

    resource_ids: list[str] = Field(default_factory=list, max_length=50)


class StartJobRequest(BaseModel):
    """Body of POST /api/ova/jobs. All free-text inputs are length-capped (C4)."""

    prompt: str = Field(min_length=1, max_length=4000)
    llm: str | None = Field(default=None, max_length=120)
    upload_ids: list[str] = Field(default_factory=list, max_length=50)
    # B1: the real plan — one entry per chosen resource. `phases` (list of phase
    # names) is accepted for back-compat only when `resources` is empty.
    resources: list[ResourceRequest] = Field(default_factory=list, max_length=50)
    phases: list[str] = Field(default_factory=list, max_length=20)


def build_resource_plan(payload: StartJobRequest) -> list[dict]:
    """Translate the chosen resources into the rows to create — one per resource (R1, R2).

    Each `resources` entry becomes its own `ova_job_resources` row, keyed in
    (phase_order, resource_order) so the runner walks ENGAGE before EXPLORE and
    preserves the client's order within a phase. Falls back to the legacy phase
    plan (1 generic resource per phase) when `resources` is omitted.
    """
    if payload.resources:
        plan: list[dict] = []
        seq: dict[str, int] = {}
        for r in payload.resources:
            phase = r.phase_type.strip().lower()
            order = seq.get(phase, 0)
            seq[phase] = order + 1
            plan.append({
                "phase_type": phase,
                "phase_order": _PHASE_ORDER.get(phase, 99),
                "resource_type": r.resource_type.strip(),
                "resource_order": order,
            })
        return plan
    return _legacy_phase_plan(payload.phases)


def _legacy_phase_plan(phases: list[str]) -> list[dict]:
    """Back-compat: one generic resource per requested phase (resource_type None)."""
    requested = [p.strip().lower() for p in phases if p and p.strip()]
    rows = (
        list(enumerate(requested, start=1)) if requested else None
    )
    pairs = [(t, o) for o, t in rows] if rows else list(_DEFAULT_PLAN)
    return [
        {"phase_type": t, "phase_order": o, "resource_type": None, "resource_order": 0}
        for t, o in pairs
    ]


def job_params(payload: StartJobRequest) -> dict:
    """Persist the generation request shape for later replay/resume (R9)."""
    return {
        "llm": payload.llm,
        "upload_ids": list(payload.upload_ids),
        "phases": list(payload.phases),
        "resources": [r.model_dump() for r in payload.resources],
    }


def resource_to_dict(resource: OvaJobResource) -> dict:
    """Safe per-resource view: status + error_id only, never content/secrets (R8)."""
    return {
        "id": str(resource.id),
        "phase_type": resource.phase_type,
        "phase_order": resource.phase_order,
        "resource_type": resource.resource_type,
        "resource_order": resource.resource_order,
        "status": resource.status,
        "attempts": resource.attempts,
        "error_id": str(resource.error_id) if resource.error_id else None,
    }


def job_to_dict(job: OvaJob, resources: list[OvaJobResource]) -> dict:
    """Safe job view for polling (R5). No prompt/content leakage beyond the prompt
    the caller already owns; never echoes provider exception messages."""
    return {
        "job_id": str(job.id),
        "ova_id": str(job.ova_id) if job.ova_id else None,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "resources": [resource_to_dict(r) for r in resources],
    }
