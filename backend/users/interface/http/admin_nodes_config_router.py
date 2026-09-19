"""Admin endpoints for Prometheus node configuration flags.

Adaptador HTTP del tuning de nodos: la validación de flags vive en
`users.domain.nodes_config` y el edge sancionado users -> prometheus (motor)
se resuelve aquí, en interface.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import require_admin
from core.database import get_db
from core.rate_limit import limiter
from models import PlatformConfig
from users.domain.errors import NodesConfigNotSaved
from users.domain.nodes_config import validate_node_updates
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Admin · Plataforma"])
logger = structlog.get_logger(__name__)


@router.get("/nodes-config", summary="Obtener la configuración de nodos del motor")
def get_nodes_config_endpoint(
    _admin: None = Depends(require_admin),
    db=Depends(get_db),
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


@router.put("/nodes-config", summary="Actualizar la configuración de nodos del motor")
@limiter.limit("10/minute")
def put_nodes_config_endpoint(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db=Depends(get_db),
):
    """Save configurable node flags (admin-only)."""
    from prometheus.config.nodes_config import CAPABILITIES, NODES, save_nodes_config

    try:
        updates = validate_node_updates(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        config = save_nodes_config(updates, db)
    except Exception:
        logger.exception("nodes config write failed")
        raise to_http_exception(NodesConfigNotSaved()) from None

    video_configured = bool(db.get(PlatformConfig, "video_api_key"))
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "video_api_key_configured": video_configured,
    }
