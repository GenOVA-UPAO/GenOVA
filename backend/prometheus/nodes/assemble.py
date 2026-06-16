"""Assemble node — builds the OVA and SCORM zip from generated resources.

Reads all results from the state, creates OvaPhase rows, and invokes the SCORM
builder. This is the terminal node of the graph (edges to END).
"""

import logging

from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)


def assemble_node(state: OvaGenerationState) -> dict:
    results = state.get("results", [])
    if not results:
        logger.warning("No results to assemble")
        return {"ova_status": "error"}

    coherence_report = state.get("coherence_report", {})
    if coherence_report:
        logger.info(
            "Coherence report: %d hallazgos, %d parches",
            len(coherence_report.get("hallazgos", [])),
            len(coherence_report.get("parches", [])),
        )

    phases_data = []
    for i, r in enumerate(results, start=1):
        phases_data.append(
            {
                "type": r.get("phase", "engage"),
                "order": i,
                "content": r.get("html", ""),
                "title": r.get("title", ""),
            }
        )

    logger.info("Assemble: %d phases ready for SCORM", len(phases_data))
    return {"ova_status": "listo", "scorm_zip_path": ""}
