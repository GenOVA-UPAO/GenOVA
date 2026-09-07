"""Metadatos de los grupos que Swagger muestra en /docs.

El orden de esta lista es el orden de las secciones en la UI; FastAPI ordena
por primera aparición del router si no se declara nada. Cada endpoint lleva su
tag en el router hoja (o en el decorador cuando el router mezcla grupos), nunca
en el `include_router` del padre: los tags del padre se SUMAN a los del hijo y
el endpoint aparecería duplicado.
"""

TAG_HEALTH = "Health"
TAG_AUTH = "Autenticación"
TAG_TOTP = "Autenticación · TOTP"
TAG_PERFIL = "Perfil"
TAG_AJUSTES = "Ajustes de usuario"
TAG_VINCULACIONES = "Vinculaciones"
TAG_AGENTES = "Agentes 5E"
TAG_GENERACION = "Generación"
TAG_OVA_CRUD = "OVA · CRUD"
TAG_OVA_FASES = "OVA · Fases y versiones"
TAG_OVA_CHAT = "OVA · Chat"
TAG_OVA_PAPELERA = "OVA · Papelera"
TAG_SCORM = "SCORM y descargas"
TAG_DOCUMENTOS = "Documentos y RAG"
TAG_ANALITICA = "Analítica"
TAG_ADMIN_USUARIOS = "Admin · Usuarios"
TAG_ADMIN_ROLES = "Admin · Roles"
TAG_ADMIN_PLATAFORMA = "Admin · Plataforma"

OPENAPI_TAGS: list[dict[str, str]] = [
    {
        "name": TAG_HEALTH,
        "description": "Sondas de vida del servicio y de cada módulo. Públicas y cacheadas 10 s.",
    },
    {
        "name": TAG_AUTH,
        "description": (
            "Registro, inicio y cierre de sesión, verificación de correo y recuperación de "
            "contraseña. El JWT viaja en la cookie httpOnly `genova_token`."
        ),
    },
    {
        "name": TAG_TOTP,
        "description": "Segundo factor: alta, confirmación, verificación y baja del TOTP.",
    },
    {
        "name": TAG_PERFIL,
        "description": "Datos de la cuenta propia: perfil, contraseña, tema y baja de cuenta.",
    },
    {
        "name": TAG_AJUSTES,
        "description": (
            "Preferencias del usuario autenticado: claves de API, modelos habilitados, "
            "ajustes de LLM, de OVA y de recursos."
        ),
    },
    {
        "name": TAG_VINCULACIONES,
        "description": "Vínculos docente↔estudiante: códigos, invitaciones y aceptación.",
    },
    {
        "name": TAG_AGENTES,
        "description": "Agentes por fase del modelo 5E: catálogo de recursos y generación puntual.",
    },
    {
        "name": TAG_GENERACION,
        "description": (
            "Trabajos de generación de OVA: alta, consulta, streaming SSE, cancelación, "
            "reanudación y regeneración."
        ),
    },
    {
        "name": TAG_OVA_CRUD,
        "description": "Alta, listado, edición de metadatos, duplicado y borrado de OVA.",
    },
    {
        "name": TAG_OVA_FASES,
        "description": "Fases y subelementos de una OVA, su historial de versiones y reversión.",
    },
    {
        "name": TAG_OVA_CHAT,
        "description": "Conversación de asistencia asociada a una OVA.",
    },
    {
        "name": TAG_OVA_PAPELERA,
        "description": "Borrado lógico: papelera, restauración y borrado permanente (individual y por lote).",
    },
    {
        "name": TAG_SCORM,
        "description": "Exportación y descarga del paquete SCORM 1.2 de una OVA.",
    },
    {
        "name": TAG_DOCUMENTOS,
        "description": "Subida de documentos de apoyo y consulta de los chunks indexados para RAG.",
    },
    {
        "name": TAG_ANALITICA,
        "description": "Métricas agregadas de uso del usuario autenticado.",
    },
    {
        "name": TAG_ADMIN_USUARIOS,
        "description": (
            "Gestión de usuarios por administrador: listado, perfil, rol, estado, desbloqueo "
            "y vínculos de cualquier usuario."
        ),
    },
    {
        "name": TAG_ADMIN_ROLES,
        "description": "Roles y permisos de la plataforma.",
    },
    {
        "name": TAG_ADMIN_PLATAFORMA,
        "description": (
            "Configuración global: modelos LLM, nodos del motor, modo de registro y refresco "
            "del catálogo."
        ),
    },
]
