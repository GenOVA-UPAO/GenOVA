"""EN-013 — request validation + response shaping for the jobs router.

Kept apart from the router so the HTTP layer stays thin (router → service →
model, C7) and under 200 lines. Nothing here touches the LLM or the DB beyond
serializing already-loaded ORM rows. Responses expose only `status` + `error_id`
per resource — never `str(e)`, content, tokens or credentials (R8).
"""
from pydantic import BaseModel, Field

from models import OvaJob, OvaJobResource

# A 5E generation produces ENGAGE + EXPLORE resources. The client may request a
# subset of phases; each phase yields one resource row here (HU-022/HU-023 will
# expand to multiple resources per phase). resource_type stays None until the
# concrete generator is wired — the runner resolves a numeric id from it.
_DEFAULT_PHASES = (("engage", 1), ("explore", 2))


class StartJobRequest(BaseModel):
    """Body of POST /api/ova/jobs. All free-text inputs are length-capped (C4)."""

    prompt: str = Field(min_length=1, max_length=4000)
    llm: str | None = Field(default=None, max_length=120)
    upload_ids: list[str] = Field(default_factory=list, max_length=50)
    phases: list[str] = Field(default_factory=list, max_length=20)


def build_resource_plan(payload: StartJobRequest) -> list[dict]:
    """Translate the requested phases into the resource rows to create (R1, R2).

    Falls back to the default ENGAGE+EXPLORE plan when the client omits `phases`.
    """
    requested = [p.strip().lower() for p in payload.phases if p and p.strip()]
    if not requested:
        return [
            {"phase_type": t, "phase_order": o, "resource_type": None, "resource_order": 0}
            for t, o in _DEFAULT_PHASES
        ]
    plan: list[dict] = []
    for order, phase_type in enumerate(requested, start=1):
        plan.append(
            {
                "phase_type": phase_type,
                "phase_order": order,
                "resource_type": None,
                "resource_order": 0,
            }
        )
    return plan


def job_params(payload: StartJobRequest) -> dict:
    """Persist the generation request shape for later replay/resume (R9)."""
    return {
        "llm": payload.llm,
        "upload_ids": list(payload.upload_ids),
        "phases": list(payload.phases),
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
