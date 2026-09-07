"""Estados y transiciones válidas del ciclo de vida de un job.

Fuente única para service, runner, stream y casos de uso. Los valores son los
mismos tuples/frozensets que vivían junto al ORM en `jobs_model`.
"""

from __future__ import annotations

JOB_STATUSES = ("queued", "running", "done", "error", "interrupted", "canceled")
RESOURCE_STATUSES = ("pending", "running", "done", "error")
# Jobs in these states cannot be canceled or produce new results.
JOB_TERMINAL = frozenset({"done", "error", "canceled", "interrupted"})
# SSE stream closes when job reaches one of these (interrupted stays open until timeout).
JOB_STREAM_TERMINAL = frozenset({"done", "error", "canceled"})


def can_cancel(status: str) -> bool:
    """Solo se cancela un job que aún no alcanzó un estado terminal."""
    return status not in JOB_TERMINAL


def is_stream_terminal(status: str) -> bool:
    """El SSE se cierra en done/error/canceled; interrupted sigue abierto."""
    return status in JOB_STREAM_TERMINAL
