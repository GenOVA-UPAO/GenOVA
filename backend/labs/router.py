"""Labs API router — admin-only model catalog and base-prompt lookup."""

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_admin
from labs.service import AVAILABLE_MODELS, get_base_prompt
from models import User

router = APIRouter()


@router.get("/models")
def list_models(_: User = Depends(require_admin)):
    return {"models": AVAILABLE_MODELS}


@router.get("/prompts/{phase}/{resource_type}")
def get_prompts(
    phase: str,
    resource_type: int,
    _: User = Depends(require_admin),
):
    """Return the base prompt that seeds the Labs editor for a resource."""
    if phase not in ("engage", "explore"):
        raise HTTPException(status_code=400, detail="phase must be 'engage' or 'explore'")
    if resource_type < 1 or resource_type > 10:
        raise HTTPException(status_code=400, detail="resource_type must be 1–10")

    return {
        "phase": phase,
        "resource_type": resource_type,
        "base_prompt": get_base_prompt(phase, resource_type),
    }
