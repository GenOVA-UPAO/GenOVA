"""Clasificación estable de credenciales; no contiene claves ni mensajes del SDK."""


def is_provider_auth_error(exc: Exception) -> bool:
    status = getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)
    return status in (401, 403) or type(exc).__name__ in (
        "AuthenticationError", "PermissionDeniedError", "ProviderAuthError"
    )


class ProviderAuthError(RuntimeError):
    def __init__(self, provider: str, *, personal: bool = False):
        self.provider = provider
        self.personal = personal
        super().__init__("provider_auth_personal" if personal else "provider_auth")
