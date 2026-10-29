"""Errores del dominio LTI. El mensaje se muestra al usuario dentro del LMS."""


class LtiError(Exception):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LtiValidationError(LtiError):
    """id_token, state o nonce inválidos: el lanzamiento se rechaza."""

    status_code = 401


class LtiForbidden(LtiError):
    status_code = 403


class LtiNotFound(LtiError):
    status_code = 404


class LtiNotConfigured(LtiError):
    status_code = 503


class LtiPlatformError(LtiError):
    """La plataforma (JWKS, token o AGS) respondió con error o no responde."""

    status_code = 502
