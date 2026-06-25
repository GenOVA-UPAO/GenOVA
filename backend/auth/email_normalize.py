"""Normalización canónica de correos antes de guardar/comparar.

OWASP (Email Validation Cheat Sheet): definir una estrategia de normalización
consistente evita cuentas duplicadas y confusión de identidad. Aplicamos:
- minúsculas + trim
- quitar subaddressing '+tag' (RFC 5233)
- en Gmail, los puntos del local-part se ignoran -> se eliminan

Se aplica a NUEVOS registros y a las búsquedas de login/forgot. No se migran
filas existentes (decisión de alcance); el caso límite de un usuario Gmail
antiguo que se registró con puntos/+tag es poco probable en el contexto UPAO.
"""

_GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}


def normalize_email(raw: str) -> str:
    email = (raw or "").strip().lower()
    if "@" not in email:
        return email
    local, _, domain = email.partition("@")
    local = local.split("+", 1)[0]
    if domain in _GMAIL_DOMAINS:
        local = local.replace(".", "")
    return f"{local}@{domain}" if local else email
