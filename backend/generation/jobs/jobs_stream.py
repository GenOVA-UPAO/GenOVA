"""B1 — SSE live progress stream for generation jobs.

Pushes the same `job_to_dict` snapshot the polling endpoint returns, but over a
single long-lived Server-Sent Events connection, so the workspace reflects phase/
resource progress in near real time instead of hammering GET /jobs/{id}. Read-only
and owner-scoped; reuses `resource_to_dict` so it never leaks content/secrets (R8).
"""

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from auth.dependencies import get_current_user
from core.database import SessionLocal
from generation.jobs import jobs_service
from generation.jobs.jobs_helpers import job_to_dict
from models import User

router = APIRouter()

_TERMINAL = {"done", "error", "canceled"}
_POLL_SECONDS = 1.5
_MAX_TICKS = 1200  # ~30 min safety cap (1200 * 1.5s) so a stuck job can't hold a conn forever


def _read_snapshot(job_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
    """Fresh session per read: the runner writes from another thread/session, so a
    long-lived session here would never observe its committed progress."""
    db = SessionLocal()
    try:
        job = jobs_service.get_job(db, job_id, user_id)
        if job is None:
            return None
        resources = jobs_service.list_resources(db, job.id)
        return job_to_dict(job, resources)
    finally:
        db.close()


@router.get("/{job_id}/stream")
async def stream_job(
    job_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """SSE: emit a `progress` event whenever the snapshot changes, then a final
    `done` event on a terminal status (done/error/canceled). 404 → one `error`."""
    try:
        parsed: uuid.UUID | None = uuid.UUID(job_id)
    except (ValueError, TypeError):
        parsed = None

    async def event_stream():
        if parsed is None:
            yield {"event": "error", "data": json.dumps({"error": "job_not_found"})}
            return
        last = None
        for _ in range(_MAX_TICKS):
            if await request.is_disconnected():
                break
            snapshot = await run_in_threadpool(_read_snapshot, parsed, current_user.id)
            if snapshot is None:
                yield {"event": "error", "data": json.dumps({"error": "job_not_found"})}
                return
            payload = json.dumps(snapshot)
            if payload != last:
                yield {"event": "progress", "data": payload}
                last = payload
            if snapshot["status"] in _TERMINAL:
                yield {"event": "done", "data": payload}
                return
            await asyncio.sleep(_POLL_SECONDS)

    return EventSourceResponse(event_stream(), headers={"Cache-Control": "no-cache"})
