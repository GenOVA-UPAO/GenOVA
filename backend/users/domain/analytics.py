"""Reglas puras de la analítica de aprendizaje (agregación y formato).

El alcance (admin → plataforma, resto → cohorte de estudiantes vinculados) y
el formato de cada bloque se resuelven aquí; el SQL vive en infrastructure.
Claves y orden de los diccionarios: son los que se pintan en el frontend.
"""

from __future__ import annotations

from dataclasses import dataclass

STATUSES = ("borrador", "generando", "listo", "error")
RECENT_DAYS = 30
TOP_N = 5


@dataclass(frozen=True, slots=True)
class AnalyticsScope:
    """Alcance de la analítica: `owner_ids=None` significa 'todos los usuarios'."""

    scope: str
    owner_ids: list | None
    total_students: int | None


def resolve_analytics_scope(*, is_admin: bool, linked_ids: list) -> AnalyticsScope:
    if is_admin:
        return AnalyticsScope(scope="platform", owner_ids=None, total_students=None)
    return AnalyticsScope(
        scope="linked_students", owner_ids=list(linked_ids), total_students=len(linked_ids)
    )


def build_status_breakdown(rows: list) -> dict:
    """(status, count) → dict con las 4 marcas canónicas siempre presentes."""
    counts = {status: 0 for status in STATUSES}
    for status, n in rows:
        counts[status] = n
    return counts


def build_ovas_per_day(rows: list) -> list[dict]:
    return [
        {"date": d.date().isoformat() if hasattr(d, "date") else str(d), "count": n}
        for d, n in rows
    ]


def build_top_creators(rows: list) -> list[dict]:
    return [
        {"user_id": str(uid), "name": name or "", "email": email, "ova_count": c}
        for uid, name, email, c in rows
    ]


def build_recent_ovas(rows: list) -> list[dict]:
    return [
        {
            "id": str(oid),
            "title": title,
            "status": status,
            "owner_name": name or email,
            "created_at": created.isoformat() if created else None,
        }
        for oid, title, status, created, name, email in rows
    ]
