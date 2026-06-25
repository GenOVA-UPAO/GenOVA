"""Analytics endpoint. Role-scoped: admin sees the whole platform, profesor
sees the cohort of students linked to them."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from core.database import get_db
from core.rate_limit import limiter
from models import User
from users.analytics.analytics_service import get_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
@limiter.limit("30/minute")
def analytics(
    request: Request,
    current_user: User = Depends(require_permission("view_analytics")),
    db: Session = Depends(get_db),
) -> dict:
    return get_analytics(db, current_user.id)
