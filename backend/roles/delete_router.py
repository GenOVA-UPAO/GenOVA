import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from core.database import commit_or_500, get_db
from models import Role, UserRole

router = APIRouter()
logger = logging.getLogger(__name__)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    id: str,
    reassign_to_id: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado (ID inválido).",
        ) from None

    # 1. Look up role
    role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado.")

    # 2. Block system roles deletion
    if role.name in ["administrador", "usuario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden eliminar los roles del sistema (administrador, usuario).",
        )

    # 3. Query current users count linked to this role
    user_count = (
        db.execute(
            select(func.count(UserRole.user_id)).where(UserRole.role_id == role_uuid)
        ).scalar()
        or 0
    )

    # 4. Handle reassignment logic if user_count > 0
    if user_count > 0:
        if not reassign_to_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El rol tiene {user_count} usuario(s) asignado(s) y no se especificó un rol de reasignación.",
            )

        try:
            target_uuid = UUID(reassign_to_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ID de reasignación es inválido.",
            ) from None

        if target_uuid == role_uuid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede reasignar al mismo rol que se está eliminando.",
            )

        # Look up target role
        target_role = db.execute(select(Role).where(Role.id == target_uuid)).scalar_one_or_none()
        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El rol de reasignación especificado no existe.",
            )

        try:
            relations = (
                db.execute(select(UserRole).where(UserRole.role_id == role_uuid)).scalars().all()
            )
            for rel in relations:
                has_target = (
                    db.execute(
                        select(UserRole).where(
                            UserRole.user_id == rel.user_id, UserRole.role_id == target_uuid
                        )
                    )
                    .scalars()
                    .first()
                )
                if has_target:
                    db.delete(rel)
                else:
                    user_id_val = rel.user_id
                    db.delete(rel)
                    db.flush()
                    db.add(UserRole(user_id=user_id_val, role_id=target_uuid))
            db.flush()
        except Exception:
            db.rollback()
            logger.exception("Reassignment failed during delete_role")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo reasignar a los usuarios. Intenta de nuevo.",
            ) from None

    db.delete(role)
    commit_or_500(db, "delete_role")
    return
