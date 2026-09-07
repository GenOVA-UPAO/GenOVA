from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Role, User, UserRole


def _is_admin(user: User, db: Session) -> bool:
    """El rol ya viene resuelto por `get_current_user` en su consulta única; se
    reutiliza esa bandera para no repetir el JOIN en cada uno de los 14 llamadores
    (un round-trip menos por petición contra el pooler remoto, RN-001)."""
    cached = getattr(user, "admin_flag_cached", None)
    if cached is not None:
        return bool(cached)
    result = db.execute(
        select(UserRole).join(Role).where(UserRole.user_id == user.id, Role.name == "administrador")
    ).scalar_one_or_none()
    return result is not None
