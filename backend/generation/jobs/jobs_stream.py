"""B1 — SSE live progress stream for generation jobs.

Pushes the same `job_to_dict` snapshot the polling endpoint returns, but over a
single long-lived Server-Sent Events connection, so the workspace reflects phase/
resource progress in near real time instead of hammering GET /jobs/{id}. Read-only
and owner-scoped; reuses `resource_to_dict` so it never leaks content/secrets (R8).
"""

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, Query, Request
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from auth.dependencies import get_current_user
from generation.application.use_cases.get_job_status import GetJobStatus
from generation.container import build_generation_stream, build_resource_content_reader
from generation.domain.errors import GenerationError, JobNotFound
from generation.domain.lifecycle import is_stream_terminal
from models import User

router = APIRouter(tags=["Generación"])
_POLL_SECONDS = 1.5
_MAX_TICKS = 1200  # ~30 min safety cap (1200 * 1.5s) so a stuck job can't hold a conn forever


def _read_snapshot(read_status: GetJobStatus, job_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
    """Fresh session per read: the runner writes from another thread/session, so a
    long-lived session here would never observe its committed progress."""
    try:
        return read_status.execute(job_id, user_id).as_dict()
    except JobNotFound:
        return None


def _read_content(reader, job_id: uuid.UUID, resource_id: str, user_id: uuid.UUID) -> str | None:
    try:
        return reader.execute(job_id, uuid.UUID(resource_id), user_id).content
    except (GenerationError, ValueError):
        return None


def _resource_changes(snapshot: dict, seen: dict[str, str]) -> list[dict]:
    """Recursos cuyo estado cambió desde el último evento (el primero emite todos)."""
    changed = []
    for res in snapshot.get("resources", []):
        if seen.get(res["id"]) != res["status"]:
            seen[res["id"]] = res["status"]
            changed.append(res)
    return changed


@router.get("/{job_id}/stream", summary="Seguir el progreso del trabajo por SSE")
async def stream_job(
    job_id: str,
    request: Request,
    include: str = Query(
        "", description="`content`: el evento `resource` de un recurso listo trae su HTML"
    ),
    current_user: User = Depends(get_current_user),
    read_status: GetJobStatus = Depends(build_generation_stream),
    content_reader=Depends(build_resource_content_reader),
):
    """SSE: emit a `progress` event whenever the snapshot changes, un evento `resource`
    por cada recurso que cambia de estado (con su HTML si `include=content` y está
    listo, para abrir la vista previa sin esperar al resto), then a final `done`
    event on a terminal status (done/error/canceled). 404 → one `error`."""
    try:
        parsed: uuid.UUID | None = uuid.UUID(job_id)
    except (ValueError, TypeError):
        parsed = None

    async def event_stream():
        if parsed is None:
            yield {"event": "error", "data": json.dumps({"error": "job_not_found"})}
            return
        last = None
        seen: dict[str, str] = {}
        for _ in range(_MAX_TICKS):
            if await request.is_disconnected():
                break
            snapshot = await run_in_threadpool(_read_snapshot, read_status, parsed, current_user.id)
            if snapshot is None:
                yield {"event": "error", "data": json.dumps({"error": "job_not_found"})}
                return
            payload = json.dumps(snapshot)
            if payload != last:
                for res in _resource_changes(snapshot, seen):
                    event = dict(res)
                    if include == "content" and res["status"] in ("done", "degraded"):
                        event["content"] = await run_in_threadpool(
                            _read_content, content_reader, parsed, res["id"], current_user.id
                        )
                    yield {"event": "resource", "data": json.dumps(event)}
                yield {"event": "progress", "data": payload}
                last = payload
            if is_stream_terminal(snapshot["status"]):
                yield {"event": "done", "data": payload}
                return
            await asyncio.sleep(_POLL_SECONDS)

    return EventSourceResponse(event_stream(), headers={"Cache-Control": "no-cache"})
