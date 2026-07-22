"""Admin user-management router. Mounts the profile and account sub-routers.
Each sub-module stays focused so files stay under the 200-line ceiling enforced
project-wide.

`list_router` no se monta aquí: su ruta es "" (la colección `/api/users`) y
FastAPI rechaza prefijo y ruta vacíos a la vez, así que cuelga directamente de
`main.py`, que sí aporta el prefijo."""

from fastapi import APIRouter

from users.admin.account_router import router as account_router
from users.admin.profile_router import router as profile_router

router = APIRouter(tags=["Admin · Usuarios"])
router.include_router(profile_router)
router.include_router(account_router)
