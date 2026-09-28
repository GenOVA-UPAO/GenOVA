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
    from prometheus.config.nodes_config import get_nodes_config

    return _payload(get_nodes_config(), db)


@router.put("/nodes-config", summary="Actualizar la configuración de nodos del motor")
@limiter.limit("10/minute")
def put_nodes_config_endpoint(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db=Depends(get_db),
):
    """Save configurable node flags (admin-only)."""
    from prometheus.config.nodes_config import save_nodes_config

    try:
        updates = validate_node_updates(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        config = save_nodes_config(updates, db)
    except Exception:
        logger.exception("nodes config write failed")
        raise to_http_exception(NodesConfigNotSaved()) from None

    return _payload(config, db)


def _payload(config: dict, db) -> dict:
    """Nodos, capacidades, flags y el estado REAL de imagen y video.

    Imagen y video se encienden en /models (tareas Imagen y Video), no aquí:
    `media_status` dice si se generan de verdad (interruptor, modelo y clave).
    `video_api_key_configured` se mantiene por compatibilidad y ahora refleja si
    hay clave de plataforma para la cadena de video (antes leía una clave
    `video_api_key` que ningún código usaba).
    """
    from prometheus.config.nodes_config import CAPABILITIES, NODES

    media = _safe_media_status(db)
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "media_status": media,
        "video_api_key_configured": bool((media.get("video") or {}).get("has_key")),
    }


def _safe_media_status(db) -> dict:
    from llm.images.media_status import media_status

    try:
        return media_status(db)
    except Exception:
        logger.exception("media status failed")
        return {}
