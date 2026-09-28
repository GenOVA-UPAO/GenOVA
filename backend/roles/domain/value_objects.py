"""Value objects del dominio de roles."""

from __future__ import annotations

from dataclasses import dataclass

from roles.domain.errors import InvalidRoleName

_MAX_NAME_LEN = 64


@dataclass(frozen=True, slots=True)
class RoleName:
    """Nombre de rol normalizado: sin espacios sobrantes, en minúsculas, 1..64 chars."""

    value: str

    def __post_init__(self) -> None:
        normalized = self.value.strip().lower()
        if not normalized:
            raise InvalidRoleName("El nombre del rol es obligatorio.")
        if len(normalized) > _MAX_NAME_LEN:
            raise InvalidRoleName(f"El nombre del rol no puede superar {_MAX_NAME_LEN} caracteres.")
        object.__setattr__(self, "value", normalized)

    def __str__(self) -> str:
        return self.value
