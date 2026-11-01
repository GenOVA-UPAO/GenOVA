"""Guard de los endpoints que cambian o prueban los modelos/claves propios.

Replica el gate del frontend (`can-access-models.ts`): sin `ai:models:self` ni
`ai:models:platform` (p. ej. el rol `usuarios_prueba` de la tesis) no se pueden
guardar ajustes, favoritos ni claves propias. Las lecturas (GET) siguen abiertas:
el diálogo de ajustes de IA las usa con cualquier rol.
"""

from auth.dependencies import require_any_permission

MODELS_PERMISSIONS = ("ai:models:self", "ai:models:platform")

require_models_access = require_any_permission(*MODELS_PERMISSIONS)
