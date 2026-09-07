from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from users.application.dto import UpdateProfileInput, UpdateThemeInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception
from users.interface.http.settings_account_router import router as account_router

router = APIRouter(tags=["Perfil"])
# Account-security endpoints (change password, delete) live in account_router;
# included here so they keep the same /me prefix.
router.include_router(account_router)


class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    university_id: int | None = Field(default=None, ge=1)
    gender: str | None = Field(default=None, max_length=20)
    phone_number: str | None = Field(default=None, max_length=20)


@router.patch("/me", summary="Actualizar el perfil propio")
@limiter.limit("20/minute")
def update_profile(
    request: Request,
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        profile = users.update_profile.execute(
            UpdateProfileInput(
                user_id=current_user.id,
                full_name=payload.full_name,
                email=str(payload.email),
                university_id=payload.university_id,
                gender=payload.gender,
                phone_number=payload.phone_number,
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {
        "id": profile.id,
        "email": profile.email,
        "full_name": profile.full_name or "",
        "university_id": profile.university_id,
        "gender": profile.gender or "",
        "phone_number": profile.phone_number or "",
        "theme_settings": profile.theme_settings,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


class UserThemeUpdate(BaseModel):
    colorMode: str
    designMode: str
    palette: dict | None = None


@router.patch("/me/theme", summary="Actualizar el tema de la interfaz")
@limiter.limit("30/minute")
def update_theme(
    request: Request,
    payload: UserThemeUpdate,
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    theme_settings = users.update_theme.execute(
        UpdateThemeInput(
            user_id=current_user.id,
            color_mode=payload.colorMode,
            design_mode=payload.designMode,
            palette=payload.palette,
        )
    )
    return {"message": "Tema actualizado", "theme_settings": theme_settings}
