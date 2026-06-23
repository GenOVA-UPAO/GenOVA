"""Admin endpoints for Prometheus node configuration flags."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from core.database import get_db
from core.rate_limit import limiter
from models import PlatformConfig

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/nodes-config")
def get_nodes_config_endpoint(
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return node definitions + current configurable flags (admin-only)."""
    from prometheus.config.nodes_config import CAPABILITIES, NODES, get_nodes_config

    config = get_nodes_config()
    video_configured = bool(db.get(PlatformConfig, "video_api_key"))
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "video_api_key_configured": video_configured,
    }


@router.put("/nodes-config")
@limiter.limit("10/minute")
def put_nodes_config_endpoint(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save configurable node flags (admin-only)."""
    from prometheus.config.nodes_config import CAPABILITIES, NODES, save_nodes_config

    VALID_FLAGS = {"ova_refine", "ova_critic", "ova_editor"}
    VALID_BOOL = {"0", "1"}
    updates: dict = {}
    for k, v in payload.items():
        if k in VALID_FLAGS:
            if str(v) not in VALID_BOOL:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Flag '{k}' debe ser '0' o '1'",
                )
            updates[k] = str(v)
        elif k == "ova_reflection_rounds":
            try:
                rounds = int(v)
                if not (0 <= rounds <= 3):
                    raise ValueError
                updates[k] = rounds
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ova_reflection_rounds debe ser entero 0-3",
                ) from None
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload vacío o sin flags reconocidos",
        )
    try:
        config = save_nodes_config(updates, db)
    except Exception:
        logger.exception("Nodes config write failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de nodos.",
        ) from None
    video_configured = bool(db.get(PlatformConfig, "video_api_key"))
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "video_api_key_configured": video_configured,
    }
