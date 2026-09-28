"""Analytics endpoint. Role-scoped: admin sees the whole platform, profesor
sees the cohort of students linked to them."""

from fastapi import APIRouter, Depends, Request

from auth.dependencies import require_permission
from core.rate_limit import limiter
from models import User
from users.container import UsersUseCases, build_users

router = APIRouter(prefix="/analytics", tags=["Analítica"])


@router.get("", summary="Obtener las métricas de uso del usuario")
@limiter.limit("30/minute")
def analytics(
    request: Request,
    current_user: User = Depends(require_permission("view_analytics")),
    users: UsersUseCases = Depends(build_users),
) -> dict:
    return users.get_user_analytics.execute(current_user.id)
