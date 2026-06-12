"""Shared state for the OVA generation LangGraph (Prometheus BDI beliefs layer).

TypedDict ensures nodes read/write a well-known shape; LangGraph's StateGraph
merges partial return dicts from each node into the running state automatically.
"""

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class OvaGenerationState(TypedDict, total=False):
    prompt: str
    upload_ids: list[str]
    llm_config: dict
    enabled_models: list[dict]
    theme: dict  # {"color": "upao"|"free", "design": "upao"|"free"}
    job_id: str  # used by Fase 2 for incremental per-resource persistence

    phases: dict  # {phase_type: [{"resource_type": int, "resource_order": int}, ...]}
    phase_order: list[str]  # ["engage", "explore", "explain", "elaborate", "evaluate"]

    current_phase_idx: int
    current_resource_idx: int
    total_resources: int
    progress: int

    rag_context: str

    results: Annotated[list[dict], add_messages]  # [{phase, html, resource_type, ..}]
    errors: Annotated[list[dict], add_messages]  # [{phase, resource_type, error}]

    # SCORM assembly
    scorm_zip_path: str
    ova_status: str  # "listo" | "borrador" | "error"
