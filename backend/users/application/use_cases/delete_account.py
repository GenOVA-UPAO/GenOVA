"""Caso de uso: eliminar (desactivar) la cuenta propia."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import DeleteAccountInput
from users.application.ports import PasswordHasher, UserAccountRepository
from users.domain.errors import IncorrectAccountPassword


@dataclass(frozen=True, slots=True)
class DeleteAccount:
    accounts: UserAccountRepository
    passwords: PasswordHasher

    def execute(self, data: DeleteAccountInput) -> None:
        account = self.accounts.get(data.user_id)
        if account is None or not self.passwords.verify(data.password, account.password_hash):
            raise IncorrectAccountPassword()

        # El bloqueo de único-admin corre DESPUÉS de verificar la contraseña,
        # igual que en el router original.
        self.accounts.assert_not_sole_admin(data.user_id)
        self.accounts.deactivate_and_anonymize(data.user_id)
