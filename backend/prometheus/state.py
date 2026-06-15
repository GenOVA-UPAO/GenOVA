"""Shared state for the OVA generation LangGraph.

Single source of truth passed between nodes — the shared memory of the
orchestrator-workers pipeline. In the Prometheus/BDI *design* layer this plays the
"beliefs" role, but at runtime there is no belief-revision logic; it is just merged
state (see docs/prometheus.md: design vs. runtime). TypedDict ensures nodes
read/write a well-known shape; LangGraph's StateGraph merges partial return dicts
from each node automatically.
"""

import operator
from typing import Annotated, TypedDict


class OvaGenerationState(TypedDict, total=False):
    prompt: str
    upload_ids: list[str]
    llm_config: dict
    enabled_models: list[dict]
    theme: dict  # {"color": "upao"|"free", "design": "upao"|"free"}
    image_settings: dict  # {max_images, provider, api_key}
    job_id: str  # used by Fase 2 for incremental per-resource persistence

    phases: dict  # {phase_type: [{"resource_type": int, "resource_order": int}, ...]}
    phase_order: list[str]  # ["engage", "explore", "explain", "elaborate", "evaluate"]

    current_phase_idx: int
    current_resource_idx: int
    total_resources: int
    progress: int

    rag_context: str

    results: Annotated[list[dict], operator.add]  # [{phase, html, resource_type, ..}]
    errors: Annotated[list[dict], operator.add]  # [{phase, resource_type, error}]

    # SCORM assembly
    scorm_zip_path: str
    ova_status: str  # "listo" | "borrador" | "error"
