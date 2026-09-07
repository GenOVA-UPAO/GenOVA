"""Caso de uso: cambiar la contraseña propia."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import ChangePasswordInput
from users.application.ports import PasswordHasher, UserAccountRepository
from users.domain.errors import (
    IncorrectCurrentPassword,
    PasswordConfirmationMismatch,
    WeakNewPassword,
)


@dataclass(frozen=True, slots=True)
class ChangePassword:
    accounts: UserAccountRepository
    passwords: PasswordHasher

    def execute(self, data: ChangePasswordInput) -> None:
        # Mismo orden de checks que el router original: confirmación,
        # complejidad y contraseña actual.
        if data.new_password != data.confirm_password:
            raise PasswordConfirmationMismatch()

        if not (
            any(c.isalpha() for c in data.new_password) and any(c.isdigit() for c in data.new_password)
        ):
            raise WeakNewPassword()

        account = self.accounts.get(data.user_id)
        if account is None or not self.passwords.verify(
            data.current_password, account.password_hash
        ):
            raise IncorrectCurrentPassword()

        self.accounts.update_password(data.user_id, self.passwords.hash(data.new_password))
