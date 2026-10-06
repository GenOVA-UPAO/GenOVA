"""Catálogo de presentación compartido por selector y vista previa."""

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from core.package_themes import theme_catalog

router = APIRouter(tags=["OVA · CRUD"])


@router.get("/package-themes/catalog", summary="Temas visuales disponibles para la OVA")
def list_package_themes(current_user=Depends(get_current_user)):
    return {"themes": theme_catalog()}
