"""Shared state for the OVA generation LangGraph.

Single source of truth passed between nodes. Implements the BDI component of
the Prometheus/Rao & Georgeff agent cycle: ``beliefs``, ``desires``, and
``intentions`` are populated by the concierge (liberador BDI) and revised by
the runtime after each phase. TypedDict ensures nodes read/write a well-known
shape; LangGraph's StateGraph merges partial return dicts from each node.
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

    # Phase → Critic handoff (overwritten each phase; not accumulated)
    current_phase_results: list[dict]  # raw HTML from last phase, read by critic_node
    current_phase_errors: list[dict]   # errors from last phase, read by critic_node
    last_phase: str                     # phase that just completed

    coherence_report: dict  # Editor 5E output (EN-016); empty in EN-015

    # BDI — ciclo Prometheus (Rao & Georgeff / Padgham & Winikoff)
    beliefs: dict          # {rag_quality, topic_complexity, model_capability, ...}
    desires: list[dict]    # [{phase, resource_type, resource_order, priority}]
    intentions: list[dict] # [{phase, resource_type, plan_type, viability, committed}]

    # SCORM assembly
    scorm_zip_path: str
    ova_status: str  # "listo" | "borrador" | "error"
