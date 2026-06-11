"""Shared phase runtime — bounded-parallel resource generation + live persistence.

Fase 2 (velocidad): a phase's resources are independent, so each phase node
generates them concurrently with a bounded pool (env OVA_GEN_CONCURRENCY, default
4) instead of one-at-a-time. As each resource finishes we persist it immediately
to its OvaJobResource row, so the job's progress polling reflects real progress
instead of jumping 0→100 at the end. The runner's end-of-run _persist_results
stays as a reconciliation pass (it skips rows already marked "done").
"""

import contextlib
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy import select

from database import SessionLocal
from models import OvaJobResource

logger = logging.getLogger(__name__)

DEFAULT_CONCURRENCY = 4


def _concurrency() -> int:
    try:
        return max(1, int(os.getenv("OVA_GEN_CONCURRENCY", str(DEFAULT_CONCURRENCY))))
    except ValueError:
        return DEFAULT_CONCURRENCY


def run_phase(state: dict, phase: str, dispatch, meta: dict) -> dict:
    """Generate every resource of `phase` in parallel and advance the phase index.

    `dispatch(rt, concept, llm_config, enabled_models, theme) -> html` is the
    per-resource generator supplied by each phase node. `meta` is the phase's
    RECURSOS_META (for resource titles). Returns a LangGraph partial-state dict.
    """
    resources = state.get("phases", {}).get(phase, [])
    advance = {"current_phase_idx": state.get("current_phase_idx", 0) + 1}
    if not resources:
        return advance

    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])
    theme = state.get("theme", {})
    job_id = state.get("job_id")
    workers = min(_concurrency(), len(resources))

    def _work(item: dict):
        rt = item["resource_type"]
        try:
            return item, dispatch(rt, concept, llm_config, enabled_models, theme), None
        except Exception as exc:  # noqa: BLE001 — isolate one resource's failure
            logger.exception("%s resource %s failed", phase, rt)
            return item, None, str(exc)

    results, errors = [], []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_work, it) for it in resources]
        for fut in as_completed(futures):
            item, html, err = fut.result()
            rt = item["resource_type"]
            if html is not None:
                title = (meta.get(rt) or {}).get("tipo", "")
                results.append({"phase": phase, "html": html, "resource_type": rt, "title": title})
                _persist_done(job_id, phase, rt, html)
            else:
                # Failures stay in the errors list; the runner's end reconciliation
                # (_persist_results) owns retry/error bookkeeping, unchanged.
                errors.append({"phase": phase, "resource_type": rt, "error": err})

    return {
        **advance,
        "results": results,
        "errors": errors,
        "progress": state.get("progress", 0) + len(resources),
    }


def _persist_done(job_id, phase: str, rt, html: str) -> None:
    """Mark the matching OvaJobResource row `done` the moment it succeeds.

    Matches the same (phase, resource_type) key the end reconciliation uses, so an
    incrementally-persisted row is later skipped by _persist_results (status==done).
    Only successes are written here; failures are left to end reconciliation so its
    retry/error bookkeeping stays the single owner of that path. Best-effort: a
    persistence failure never aborts generation.
    """
    if not job_id:
        return
    db = SessionLocal()
    try:
        rows = list(
            db.execute(
                select(OvaJobResource)
                .where(
                    OvaJobResource.job_id == uuid.UUID(str(job_id)),
                    OvaJobResource.phase_type == phase,
                    OvaJobResource.status != "done",
                )
                .order_by(OvaJobResource.resource_order)
            )
            .scalars()
            .all()
        )
        target = next((r for r in rows if r.resource_type is not None and str(r.resource_type) == str(rt)), None)
        if target is None:
            target = next((r for r in rows if r.resource_type is None), None)
        if target is None:
            return

        target.content = html
        target.status = "done"
        target.attempts = (target.attempts or 0) + 1
        db.commit()
    except Exception:  # noqa: BLE001 — incremental persist is best-effort
        logger.exception("incremental persist failed for %s/%s", phase, rt)
        with contextlib.suppress(Exception):
            db.rollback()
    finally:
        db.close()
