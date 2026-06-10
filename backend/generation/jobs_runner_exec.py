"""EN-013 — per-resource generation with retries + timeout.

Isolated from `jobs_runner.py` so the orchestration loop and the LLM-calling
code each stay well under the 200-line cap (C3) and so tests can monkeypatch the
single agent call (`regen_agents.regenerate_phase_content`) without touching the
job loop. No DB access here — the caller persists the result.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout

from generation import regen_agents

logger = logging.getLogger(__name__)

_RESOURCE_NAME_TO_ID: dict[str, int] = {}


def _resource_type_id(resource) -> int | None:
    """Map a job resource to the numeric ENGAGE/EXPLORE id the agents expect.

    Resources persist the resource_type *name* (e.g. "Lectura Interactiva"); the
    agents key off the numeric id. We build the reverse lookup lazily from the
    same RECURSOS_META the generators use, so the two never drift.
    """
    global _RESOURCE_NAME_TO_ID
    if not _RESOURCE_NAME_TO_ID:
        from prometheus.prompts.engage_prompts import RECURSOS_META as ENGAGE_META
        from prometheus.prompts.explore_prompts import RECURSOS_META as EXPLORE_META

        _RESOURCE_NAME_TO_ID = {
            **{v["tipo"]: k for k, v in ENGAGE_META.items()},
            **{v["tipo"]: k for k, v in EXPLORE_META.items()},
        }
    name = (resource.resource_type or "").strip()
    if name.isdigit():
        return int(name)
    return _RESOURCE_NAME_TO_ID.get(name)


def _call_agent_with_timeout(
    phase_type: str,
    rtype: int,
    concept: str,
    timeout_s: float,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str | None:
    """Run one agent call, capping wall time so a stuck provider can't hang the thread."""
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            regen_agents.regenerate_phase_content,
            phase_type,
            rtype,
            concept,
            llm_config,
            enabled_models,
        )
        try:
            return future.result(timeout=timeout_s)
        except FutureTimeout as exc:
            future.cancel()
            raise TimeoutError(f"resource generation exceeded {timeout_s:.0f}s") from exc


def generate_resource_html(
    resource,
    concept: str,
    max_attempts: int,
    timeout_s: float,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> tuple[str | None, str | None]:
    """Generate HTML for one resource. Returns (html, error_message).

    Retries up to `max_attempts` honoring `timeout_s` per attempt (R6). On
    success returns (html, None); on exhaustion returns (None, sanitized-by-caller
    error string). Never raises — the caller decides how to persist the outcome.
    """
    rtype = _resource_type_id(resource)
    if rtype is None:
        return None, (
            f"unknown resource_type {resource.resource_type!r} for phase {resource.phase_type}"
        )

    last_err = "generation failed"
    for attempt in range(1, max_attempts + 1):
        try:
            html = _call_agent_with_timeout(
                resource.phase_type,
                rtype,
                concept,
                timeout_s,
                llm_config,
                enabled_models,
            )
            if html and html.strip():
                return html, None
            last_err = "model returned empty content"
        except Exception as exc:  # noqa: BLE001 — contained per R6
            last_err = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "Resource %s/%s attempt %d/%d failed: %s",
                resource.phase_type,
                rtype,
                attempt,
                max_attempts,
                type(exc).__name__,
            )
    return None, f"{last_err} after {max_attempts} attempts"
