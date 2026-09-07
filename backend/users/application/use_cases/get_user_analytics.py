"""Caso de uso: métricas de uso según el rol del solicitante."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import AnalyticsRepository
from users.domain.analytics import (
    build_ovas_per_day,
    build_recent_ovas,
    build_status_breakdown,
    build_top_creators,
    resolve_analytics_scope,
)


@dataclass(frozen=True, slots=True)
class GetUserAnalytics:
    repo: AnalyticsRepository

    def execute(self, user_id) -> dict:
        is_admin = self.repo.is_admin(user_id)
        linked_ids = self.repo.linked_student_ids(user_id) if not is_admin else []
        scope = resolve_analytics_scope(is_admin=is_admin, linked_ids=linked_ids)
        owner_ids = scope.owner_ids

        total_ovas = self.repo.count_ovas(owner_ids)
        total_users = (self.repo.count_users() if is_admin else scope.total_students) or 0

        return {
            "scope": scope.scope,
            "totals": {
                "users": total_users,
                "ovas": total_ovas,
                "students": scope.total_students,
            },
            "ova_by_status": build_status_breakdown(self.repo.ova_status_breakdown(owner_ids)),
            "ovas_per_day": build_ovas_per_day(self.repo.ovas_per_day(owner_ids)),
            "top_creators": build_top_creators(self.repo.top_creators(owner_ids)),
            "recent_ovas": build_recent_ovas(self.repo.recent_ovas(owner_ids)),
        }
