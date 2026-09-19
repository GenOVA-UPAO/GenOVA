"""Adaptadores HTTP para cerrar sesión y consultar la identidad actual."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.container import AuthUseCases, build_auth
from auth.infrastructure.cookies import clear_auth_cookie
from auth.infrastructure.session_adapters import snapshot_authenticated_user
from auth.interface.http.dependencies import get_current_user

_security_scheme = HTTPBearer(auto_error=False)
_COOKIE_NAME = "genova_token"

router = APIRouter(tags=["Autenticación"])


@router.post("/logout", summary="Cerrar sesión y revocar el token actual")
def logout(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_security_scheme),
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    token = request.cookies.get(_COOKIE_NAME)
    if not token and creds:
        token = creds.credentials
    auth.logout_session.execute(token)
    response = JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})
    clear_auth_cookie(response)
    return response


@router.get("/me", summary="Obtener el usuario autenticado")
def get_me(
    current_user=Depends(get_current_user),
    auth: AuthUseCases = Depends(build_auth),
):
    result = auth.get_session_profile.execute(snapshot_authenticated_user(current_user))
    return {
        "id": result.id,
        "email": result.email,
        "full_name": result.full_name,
        "university_id": result.university_id,
        "gender": result.gender,
        "phone_number": result.phone_number,
        "theme_settings": result.theme_settings,
        "role": result.role,
        "permissions": list(result.permissions),
        "created_at": result.created_at,
        "totp_enabled": result.totp_enabled,
    }
