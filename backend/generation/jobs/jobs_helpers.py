"""EN-013 — request validation + response shaping for the jobs router.

Kept apart from the router so the HTTP layer stays thin (router → service →
model, C7) and under 200 lines. Nothing here touches the LLM or the DB beyond
serializing already-loaded ORM rows. Responses expose only `status` + `error_id`
per resource — never `str(e)`, content, tokens or credentials (R8).
"""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from models import OvaJob, OvaJobResource

# HU-022/B1: a 5E generation produces one resource row per chosen resource. The
# client picks N resources by (phase_type, resource_type); `resource_type` is the
# id/name the runner resolves to a numeric ENGAGE/EXPLORE generator id (1-10) via
# RECURSOS_META. When the client omits `resources` we fall back to one generic
# ENGAGE + one generic EXPLORE resource (legacy "phases" shape, back-compat).
_DEFAULT_PLAN = (("engage", 1), ("explore", 2), ("explain", 3), ("elaborate", 4), ("evaluate", 5))
_PHASE_ORDER = {"engage": 1, "explore": 2, "explain": 3, "elaborate": 4, "evaluate": 5}


class ResourceRequest(BaseModel):
    """One chosen resource: which 5E phase and which resource type (id 1-10 or name)."""

    phase_type: str = Field(min_length=1, max_length=30)
    resource_type: str = Field(min_length=1, max_length=40)


class ResumeRequest(BaseModel):
    """Optional body of POST /jobs/{id}/resume — restrict resume to these resources (B4)."""

    resource_ids: list[str] = Field(default_factory=list, max_length=50)


class ThemeRequest(BaseModel):
    """OVA content theme: two independent axes, both defaulting to the UPAO brand.

    color  — "upao" (azul/naranja/blanco fijo) | "free" (the LLM picks a palette).
    design — "upao" (plantilla estructurada) | "free" (the LLM picks the layout).
    """

    color: Literal["upao", "free"] = "upao"
    design: Literal["upao", "free"] = "upao"


class StartJobRequest(BaseModel):
    """Body of POST /api/ova/jobs. All free-text inputs are length-capped (C4)."""

    prompt: str = Field(min_length=1, max_length=4000)
    upload_ids: list[str] = Field(default_factory=list, max_length=50)
    # B1: the real plan — one entry per chosen resource. `phases` (list of phase
    # names) is accepted for back-compat only when `resources` is empty.
    resources: list[ResourceRequest] = Field(default_factory=list, max_length=50)
    phases: list[str] = Field(default_factory=list, max_length=20)
    # OVA content theme (color × design). Defaults to UPAO brand when omitted.
    theme: ThemeRequest = Field(default_factory=ThemeRequest)

    @model_validator(mode="after")
    def require_at_least_two_phases(self) -> "StartJobRequest":
        if not self.resources:
            return self
        phases = {r.phase_type.strip().lower() for r in self.resources}
        if len(phases) < 2:
            raise ValueError("Se requieren recursos de al menos 2 fases 5E distintas.")
        return self


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
            plan.append(
                {
                    "phase_type": phase,
                    "phase_order": _PHASE_ORDER.get(phase, 99),
                    "resource_type": r.resource_type.strip(),
                    "resource_order": order,
                }
            )
        return plan
    return _legacy_phase_plan(payload.phases)


def _legacy_phase_plan(phases: list[str]) -> list[dict]:
    """Back-compat: one default resource per requested phase.

    Each phase gets its `_DEFAULT_PLAN` resource_type id (not None): a row with
    resource_type=None materializes into an OvaPhase with no resource_type_id/
    title, which regen can't map back to a generator and silently skips
    ("unknown resource_type"). phase_order comes from `_PHASE_ORDER`, never from
    the resource id.
    """
    default_rt = dict(_DEFAULT_PLAN)
    requested = [p.strip().lower() for p in phases if p and p.strip()]
    phase_list = requested or [p for p, _ in _DEFAULT_PLAN]
    return [
        {
            "phase_type": t,
            "phase_order": _PHASE_ORDER.get(t, 99),
            "resource_type": str(default_rt.get(t, 1)),
            "resource_order": 0,
        }
        for t in phase_list
    ]


def job_params(
    payload: StartJobRequest,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
    image_settings: dict | None = None,
) -> dict:
    """Persist the generation request shape for later replay/resume (R9).

    `llm_config` is the OVA owner's per-type model/timeout config, snapshotted
    into the job so the background runner uses the user's choices without a DB
    lookup (and a later settings change doesn't mutate an in-flight job).
    `enabled_models` is the user's enabled model allowlist — snapshotted so
    the runner can enforce it.
    `image_settings` carries {max_images, provider, api_key} resolved at
    job-creation time so the runner doesn't need a DB lookup.
    """
    return {
        "upload_ids": list(payload.upload_ids),
        "phases": list(payload.phases),
        "resources": [r.model_dump() for r in payload.resources],
        "theme": payload.theme.model_dump(),
        "llm_config": llm_config or {},
        "enabled_models": enabled_models or [],
        "image_settings": image_settings or {},
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
