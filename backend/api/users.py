"""Users & Roles domain — profiles, admin management, LLM settings, model allowlist, roles.

Prefixes (set in main.py):
  /api/users  → router (profile, admin, LLM settings, enabled models)
  /api/roles  → roles_router (list, create, update, delete)
"""
from roles.router import router as roles_router
from users.router import router as router  # noqa: F401

__all__ = ["router", "roles_router"]
