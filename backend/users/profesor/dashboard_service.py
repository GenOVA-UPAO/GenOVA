"""Servicios específicos del dashboard del profesor.

Provee funciones para obtener estadísticas y datos relevantes
para la vista de dashboard del rol profesor (docente).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session


def get_profesor_stats(db: Session, user_id) -> dict:
    """Retorna estadísticas del profesor: OVAs creados, exportados, vinculados."""
    from models import UserLink
    from ova.models import Ova

    total_ovas = (
        db.scalar(
            select(func.count())
            .select_from(Ova)
            .where(
                Ova.owner_id == user_id,
                Ova.deleted_at.is_(None),
            )
        )
        or 0
    )

    total_links = (
        db.scalar(
            select(func.count())
            .select_from(UserLink)
            .where(
                UserLink.owner_user_id == user_id,
                UserLink.status == "accepted",
            )
        )
        or 0
    )

    return {
        "total_ovas": total_ovas,
        "total_linked_students": total_links,
    }
