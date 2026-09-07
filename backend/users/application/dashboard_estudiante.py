"""Servicios específicos del dashboard del estudiante.

Provee funciones para obtener OVAs compartidos y contenido
explorable para la vista de dashboard del rol estudiante.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session


def get_estudiante_stats(db: Session, user_id) -> dict:
    """Retorna estadísticas del estudiante: OVAs compartidos con él."""
    from models import UserLink

    total_shared = (
        db.scalar(
            select(func.count())
            .select_from(UserLink)
            .where(
                UserLink.linked_user_id == user_id,
                UserLink.status == "accepted",
            )
        )
        or 0
    )

    return {
        "total_shared_ovas": total_shared,
    }
