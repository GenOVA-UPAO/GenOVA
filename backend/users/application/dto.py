"""DTOs de entrada/salida de los casos de uso de usuarios (sin pydantic)."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from users.domain.links import LinkParticipant, LinkSnapshot


@dataclass(frozen=True, slots=True)
class UpdateProfileInput:
    user_id: UUID
    full_name: str
    email: str
    university_id: int | None
    gender: str | None
    phone_number: str | None


@dataclass(frozen=True, slots=True)
class UpdateThemeInput:
    user_id: UUID
    color_mode: str
    design_mode: str
    palette: dict | None


@dataclass(frozen=True, slots=True)
class ChangePasswordInput:
    user_id: UUID
    current_password: str
    new_password: str
    confirm_password: str


@dataclass(frozen=True, slots=True)
class DeleteAccountInput:
    user_id: UUID
    password: str


@dataclass(frozen=True, slots=True)
class SaveResourceConfigsInput:
    user_id: UUID
    configs: dict


@dataclass(frozen=True, slots=True)
class ListUsersInput:
    page: int
    limit: int


@dataclass(frozen=True, slots=True)
class AdminUserPage:
    """Salida del listado administrativo: meta de página + filas."""

    total_items: int
    users: list = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class AdminUpdateProfileInput:
    caller_id: UUID
    user_id: str
    full_name: str
    email: str
    university_id: int | None
    gender: str | None
    phone_number: str | None


@dataclass(frozen=True, slots=True)
class AdminUpdateRoleInput:
    caller_id: UUID
    user_id: str
    role_id: str


@dataclass(frozen=True, slots=True)
class AdminUpdateStatusInput:
    caller_id: UUID
    user_id: str
    is_active: bool


@dataclass(frozen=True, slots=True)
class AdminUnlockAccountInput:
    caller_id: UUID
    user_id: str


@dataclass(frozen=True, slots=True)
class AdminSendResetEmailInput:
    caller_id: UUID
    user_id: str


@dataclass(frozen=True, slots=True)
class AdminResetEmailInfo:
    """Datos para encolar el correo de reset (el token NUNCA va a la respuesta)."""

    email: str
    full_name: str | None
    token: str


@dataclass(frozen=True, slots=True)
class AdminStatusResult:
    """Salida de activar/desactivar: id normalizado + estado persistido."""

    id: str
    is_active: bool


@dataclass(frozen=True, slots=True)
class CreateLinkInput:
    owner_id: UUID
    invite_email: str | None


@dataclass(frozen=True, slots=True)
class AcceptLinkInput:
    user_id: UUID
    email: str
    code: str


@dataclass(frozen=True, slots=True)
class LinkCreationResult:
    link: LinkSnapshot
    code: str


@dataclass(frozen=True, slots=True)
class LinkListResult:
    links: list[LinkSnapshot]
    linked_map: dict[str, LinkParticipant]


@dataclass(frozen=True, slots=True)
class AcceptLinkResult:
    link: LinkSnapshot
    owner: LinkParticipant | None


@dataclass(frozen=True, slots=True)
class LinkAdminListResult:
    links: list[LinkSnapshot]
    participants: dict[str, LinkParticipant]


@dataclass(frozen=True, slots=True)
class SaveApiKeysInput:
    user_id: UUID
    payload: dict
    providers: list


@dataclass(frozen=True, slots=True)
class SaveEnabledModelsInput:
    user_id: UUID
    models: list


@dataclass(frozen=True, slots=True)
class SaveOvaSettingsInput:
    user_id: UUID
    settings: dict


@dataclass(frozen=True, slots=True)
class SaveLlmSettingsInput:
    user_id: UUID
    settings: dict


@dataclass(frozen=True, slots=True)
class SavePlatformKeysInput:
    payload: dict
    providers: list


@dataclass(frozen=True, slots=True)
class SaveRegistrationModeInput:
    role_name: str
