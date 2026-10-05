"""API de administración de LTI 1.3 (solo admin del sistema): plataformas
registradas y datos de la herramienta que hay que pegar en el LMS."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from core.config import settings
from core.database import get_db
from core.openapi_tags import TAG_ADMIN_LTI
from core.rate_limit import limiter
from lti.domain.errors import LtiError
from lti.infrastructure.keys import get_tool_key
from lti.infrastructure.orm import LtiPlatform
from lti.interface.http.router import tool_url

router = APIRouter(prefix="/lti", tags=[TAG_ADMIN_LTI])

_IS_PROD = settings.env.lower() == "production"


def _check_url(value: str) -> str:
    value = value.strip()
    allowed = ("https://",) if _IS_PROD else ("https://", "http://")
    if not value.startswith(allowed) or len(value) > 1024:
        raise ValueError("Debe ser una URL https:// completa.")
    return value


class PlatformIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    issuer: str = Field(min_length=1, max_length=512)
    client_id: str = Field(min_length=1, max_length=255)
    deployment_ids: list[str] = Field(min_length=1, max_length=50)
    auth_login_url: str
    auth_token_url: str
    jwks_url: str
    is_active: bool = True

    @field_validator("issuer", "auth_login_url", "auth_token_url", "jwks_url")
    @classmethod
    def _url(cls, value: str) -> str:
        return _check_url(value)

    @field_validator("deployment_ids")
    @classmethod
    def _deployments(cls, value: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(v.strip() for v in value if v and v.strip()))
        if not cleaned:
            raise ValueError("Indica al menos un deployment_id.")
        if any(len(v) > 255 for v in cleaned):
            raise ValueError("Cada deployment_id admite como máximo 255 caracteres.")
        return cleaned


class PlatformOut(BaseModel):
    id: str
    name: str
    issuer: str
    client_id: str
    deployment_ids: list[str]
    auth_login_url: str
    auth_token_url: str
    jwks_url: str
    is_active: bool


def _out(row: LtiPlatform) -> PlatformOut:
    return PlatformOut(
        id=str(row.id),
        name=row.name,
        issuer=row.issuer,
        client_id=row.client_id,
        deployment_ids=list(row.deployment_ids or []),
        auth_login_url=row.auth_login_url,
        auth_token_url=row.auth_token_url,
        jwks_url=row.jwks_url,
        is_active=bool(row.is_active),
    )


def _get(db: Session, platform_id: str) -> LtiPlatform:
    try:
        key = uuid.UUID(platform_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plataforma no encontrada.") from None
    row = db.get(LtiPlatform, key)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plataforma no encontrada.")
    return row


def _save(db: Session, row: LtiPlatform) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Ya hay una plataforma con ese issuer y client_id."
        ) from None
    db.refresh(row)


Admin = Annotated[None, Depends(require_admin)]


@router.get("/tool", summary="Datos de GenOVA para registrarla en el LMS")
def tool_config(request: Request, _admin: Admin, db: Session = Depends(get_db)):
    base = tool_url(request)
    try:
        key = get_tool_key(db)
    except LtiError as error:
        raise HTTPException(error.status_code, error.message) from None
    return {
        "tool_url": base,
        "login_url": f"{base}/lti/login",
        "launch_url": f"{base}/lti/launch",
        "deep_link_url": f"{base}/lti/launch",
        "jwks_url": f"{base}/lti/jwks",
        "kid": key.kid,
        "public_jwk": key.public_jwk,
        "tool_url_configured": bool(settings.lti_tool_url),
    }


@router.get("/platforms", summary="Listar plataformas LTI", response_model=list[PlatformOut])
def list_platforms(_admin: Admin, db: Session = Depends(get_db)):
    rows = db.query(LtiPlatform).order_by(LtiPlatform.created_at.desc()).all()
    return [_out(r) for r in rows]


@router.post(
    "/platforms",
    summary="Registrar una plataforma LTI",
    response_model=PlatformOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/minute")
def create_platform(
    request: Request, payload: PlatformIn, _admin: Admin, db: Session = Depends(get_db)
):
    row = LtiPlatform(id=uuid.uuid4(), **payload.model_dump())
    db.add(row)
    _save(db, row)
    return _out(row)


@router.put(
    "/platforms/{platform_id}", summary="Editar una plataforma LTI", response_model=PlatformOut
)
@limiter.limit("20/minute")
def update_platform(
    request: Request,
    platform_id: str,
    payload: PlatformIn,
    _admin: Admin,
    db: Session = Depends(get_db),
):
    row = _get(db, platform_id)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    _save(db, row)
    return _out(row)


@router.delete(
    "/platforms/{platform_id}",
    summary="Eliminar una plataforma LTI",
    status_code=status.HTTP_204_NO_CONTENT,
)
@limiter.limit("20/minute")
def delete_platform(
    request: Request, platform_id: str, _admin: Admin, db: Session = Depends(get_db)
):
    row = _get(db, platform_id)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
