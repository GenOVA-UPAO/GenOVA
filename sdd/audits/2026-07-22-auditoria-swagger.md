# Auditoría de agrupación de Swagger — 2026-07-22

**Fuente**: `http://localhost:8000/openapi.json` + capturas Playwright de `/docs`
(backend local, rama `develop`).
**Capturas**: `scratchpad/swagger-shots/` (antes) y `scratchpad/swagger-shots-after/`
(después), `00-overview-collapsed.png` + una por tag.

## Estado de la remediación (2026-07-22)

| Hallazgo | Estado |
|---|---|
| H1 duplicados por doble tag | Corregido |
| H2 `Users` cajón de sastre | Corregido |
| H3 `OVA` cajón de sastre | Corregido |
| H4 grupo `default` | Corregido |
| H5 health dispersos | Corregido |
| H6 `SCORM` de un solo endpoint | Corregido |
| H7 uploads dentro de `RAG` | Corregido |
| H8 6 grupos para los agentes 5E | Corregido |
| H9 administración repartida | Corregido |
| H10 nomenclatura inconsistente | Corregido |
| H11 sin `openapi_tags` | Corregido |
| H12 `/api/ova` vs `/api/ovas` | Corregido (con alias heredado) |
| H13 summaries en inglés | Corregido (120 `summary=` en español) |
| H14 securityScheme irreal | Corregido (`APIKeyCookie` declarado) |
| H15 menores | Corregido |

Resultado: **18 grupos, 120 operaciones, 0 duplicadas, 0 sin tag**, orden y
descripciones declaradas en `backend/core/openapi_tags.py`.
Verificado con `ruff check` limpio y `pytest tests/step_defs/` (51 passed); el
conjunto de rutas del OpenAPI es idéntico al de antes del cambio.

### Segunda tanda (H12 + H15)

- **H12**: el recurso pasa a ser plural y los trabajos dejan de colgar de él.
  `/api/ova/health|llm-options|save|{id}/scorm` → `/api/ovas/...`;
  `/api/ova/jobs/*` → `/api/jobs/*`. Los prefijos viejos siguen montados con
  `include_in_schema=False` para no romper clientes desplegados; se retiran
  cuando nadie los use. Actualizados los 7 puntos de llamada del frontend, los
  arneses de `tests/` (capturas, e2e, JMeter, Locust), `backend/scripts/ova_e2e`
  y `docs/api.md`.
- **H15.1**: `GET /api/users/` → `GET /api/users`. `list_router` se monta ahora
  desde `main.py` porque FastAPI rechaza prefijo y ruta vacíos en un include
  anidado.
- **H15.2**: `/api/ovas/llm-options` deja de ser público (`Depends(get_current_user)`)
  y se marca `deprecated=True`; ya no expone el catálogo de modelos sin sesión.
- **H15.3**: `operationId` legibles vía `generate_unique_id_function`
  (`core/openapi_ids.py`): `<tag>_<función>`, p. ej. `health_db_health` en vez de
  `db_health_api_db_health_get`. Las 5 funciones `list_recursos` de las fases 5E
  se renombraron (`list_engage_recursos`, …) porque compartían tag y colisionaban.

Desviaciones respecto de la propuesta original:
- `POST /api/ovas/{id}/regenerar` y su `progress` quedaron en `Generación`
  (son trabajos con progreso), no en `OVA · Fases y versiones`.
- `DELETE /api/auth/totp/admin` quedó en `Autenticación · TOTP` en vez de
  `Admin · Usuarios`: es una operación de TOTP, aunque la ejecute un admin.
- `Uploads` y `RAG` acabaron fusionados en `Documentos y RAG` para no dejar un
  grupo de un solo endpoint (el mismo defecto que H6).

## Resumen numérico

| Métrica | Valor |
|---|---|
| Operaciones únicas | 120 |
| Entradas visibles en Swagger | 126 (6 duplicadas por doble tag) |
| Grupos (tags) mostrados | 17 |
| Tags declarados en `FastAPI(openapi_tags=...)` | 0 |
| Operaciones sin `description` | 98 / 120 |
| Operaciones sin `security` | 21 |

Grupos actuales y tamaño:
`default` 4 · `engage` 2 · `explore` 2 · `explain` 2 · `elaborate` 2 · `evaluate` 2 ·
`agents` 1 · `Auth` 13 · `totp` 5 · `RAG` 6 · `Roles` 4 · `SCORM` 1 · `OVA` 35 ·
`Generation` 7 · `Users` 31 · `analytics` 1 · `Admin` 8

## Hallazgos

### H1 — Endpoints duplicados en dos grupos (doble tag)
`main.py` pone `tags=[...]` en el `include_router`, y el router hijo ya trae su propio
`tags=[...]`; FastAPI **suma** ambos, así que la operación se dibuja dos veces.

- 5 endpoints TOTP salen en `Auth` **y** en `totp`
  (`backend/auth/totp_router.py:29`, `backend/auth/totp_login_router.py:23`).
- `GET /api/users/analytics` sale en `Users` **y** en `analytics`
  (`backend/users/analytics/analytics_router.py:13`).

**Arreglo**: quitar `tags=` del `APIRouter` hijo, o quitarlo del `include_router` padre.
Un solo lugar define el tag.

### H2 — `Users` es un cajón de sastre con 4 responsabilidades (31 endpoints)
Mezcla en el mismo grupo:
1. Perfil propio — `/api/users/me*` (17 endpoints: perfil, password, api-keys,
   llm-settings, ova-settings, enabled-models, resource-configs, theme).
2. Administración de usuarios — `GET /api/users/`, `PATCH /api/users/{user_id}`,
   `/{user_id}/role`, `/{user_id}/status`, `/{user_id}/unlock`,
   `/{user_id}/reset-password-email` (6).
3. Vinculaciones docente↔estudiante — `/api/users/me/links*` + `/api/users/links/admin*` (8).
4. Analítica — `/api/users/analytics` (1).

**Arreglo**: separar en `Perfil`, `Ajustes de usuario`, `Vinculaciones`,
`Admin · Usuarios`, `Analítica`.

### H3 — `OVA` es un cajón de sastre con 35 endpoints
Mezcla CRUD, papelera, fases, versiones, chat, exportación y catálogo:
- CRUD/metadata: `/api/ova/save`, `GET /api/ovas`, `PATCH /{id}/metadata`, `GET /{id}/editar`, `DELETE /{id}`
- Papelera: `/api/ovas/papelera`, `/papelera/count`, `/lote/papelera`, `/lote/restaurar`, `/lote/permanente`, `/{id}/restaurar`, `/{id}/permanente`
- Fases/subelementos: `/{id}/fases*` (6)
- Versionado: `/{id}/versiones*`, `/{id}/fases/{fid}/versiones*` (5)
- Chat: `/{id}/chat*` (5)
- Exportación: `/{id}/download`, `/{id}/export-scorm`, `/api/ova/{id}/scorm`
- Catálogo: `/api/ova/llm-options`
- Regeneración: `/{id}/regenerar`, `/{id}/regenerar/{job_id}/progress`

**Arreglo**: subgrupos `OVA · CRUD`, `OVA · Papelera`, `OVA · Fases`, `OVA · Versiones`,
`OVA · Chat`, `OVA · Exportación`.

### H4 — Grupo `default` (sin tag) con 4 endpoints, uno de ellos administrativo
`GET /health`, `GET /api/health`, `GET /api/db/health` y —el peor—
`POST /api/admin/refresh-catalog`, que debería estar en `Admin`.

**Arreglo**: crear tag `Health` (o `Sistema`) y mover `refresh-catalog` a `Admin`.

### H5 — Health checks dispersos en 6 grupos distintos
`/health`, `/api/health`, `/api/db/health` (default), `/api/agents/health` (agents),
`/api/rag/health` (RAG), `/api/uploads/health` (RAG), `/api/scorm/health` (SCORM),
`/api/ova/health` (OVA). Nadie los busca dentro de `OVA` o `RAG`.

**Arreglo**: todos con tag `Health`.

### H6 — `SCORM` tiene 1 solo endpoint y no es SCORM real
`SCORM` = solo `/api/scorm/health`. La exportación SCORM de verdad
(`/api/ova/{id}/scorm`, `/api/ovas/{id}/export-scorm`, `/api/ovas/{id}/download`)
vive dentro de `OVA`. El grupo miente.

**Arreglo**: `SCORM` agrupa la exportación real, o desaparece y su health va a `Health`.

### H7 — `RAG` contiene endpoints de uploads
4 de los 6 endpoints del grupo son `/api/uploads/*`
(`main.py:247` los mete con `tags=["RAG"]`). Subir/borrar archivos temporales no es RAG.

**Arreglo**: tag propio `Uploads` (o `Documentos`), dejando `RAG` con
`/api/rag/chunks/by-upload/{upload_id}`.

### H8 — 6 grupos para los agentes 5E, con 1-2 endpoints cada uno
`engage`, `explore`, `explain`, `elaborate`, `evaluate` (2 cada uno, forma idéntica:
`POST /generate` + `GET /recursos`) y `agents` (1). 11 endpoints ocupan 6 secciones.

**Arreglo**: un solo `Agentes 5E`, o `Agentes` + subtags consistentes. Definido en
`backend/llm/catalog/catalog_router.py:10-17`.

### H9 — Administración repartida en 5 grupos
`Admin` (llm-config, nodes-config, platform-config, registration-mode),
`default` (refresh-catalog), `Users` (gestión de usuarios y links/admin),
`Auth` (`DELETE /api/auth/totp/admin`), `Roles` (completo).
No hay un área "Administración" reconocible en Swagger.

**Arreglo**: prefijo de tag `Admin · <área>`.

### H10 — Nomenclatura de tags inconsistente
Capitalizados: `Auth`, `RAG`, `Roles`, `SCORM`, `OVA`, `Generation`, `Users`, `Admin`.
Minúsculas: `engage`, `explore`, `explain`, `elaborate`, `evaluate`, `agents`, `totp`, `analytics`.
Además mezcla inglés (`Users`, `Generation`) con dominio en español en las rutas
(`/papelera`, `/fases`, `/versiones`, `/regenerar`, `/duplicar`, `/lote`).

**Arreglo**: una sola convención (propuesta: español, Capitalizado).

### H11 — Sin `openapi_tags`: ni orden ni descripciones
`FastAPI(...)` no declara `openapi_tags`, así que Swagger ordena por primera aparición
del router y ningún grupo tiene descripción. Ver `backend/main.py`.

**Arreglo**: declarar `openapi_tags=[{"name": ..., "description": ...}, ...]` en el orden
deseado.

### H12 — Prefijos `/api/ova` y `/api/ovas` conviven para el mismo recurso
Singular: `/api/ova/save`, `/api/ova/health`, `/api/ova/llm-options`, `/api/ova/jobs*`,
`/api/ova/{ova_id}/scorm`.
Plural: todo lo demás (`/api/ovas/...`).
`main.py:235-245`. Esto es defecto de diseño de API, no solo cosmético en Swagger —
arreglarlo rompe el frontend, así que va aparte de la reagrupación.

### H13 — Summaries autogenerados en inglés, sin descripciones
Los 120 summaries salen del nombre de la función ("Get Me", "Put Api Keys",
"Totp Setup"); 98/120 no tienen `description`. La política del proyecto es salida
en español.

**Arreglo**: `summary=` explícito en español + docstring por endpoint.

### H14 — El esquema de seguridad declarado no es el real
`components.securitySchemes` = solo `HTTPBearer`, pero la autenticación real es cookie
httpOnly `genova_token` (ver `CLAUDE.md` §Auth). Con `AUTH_ACCEPT_BEARER=0` en producción
el botón *Authorize* de Swagger no sirve para nada.

**Arreglo**: declarar `APIKeyCookie(name="genova_token")` como esquema (además del bearer
mientras siga aceptándose).

### H15 — Detalles menores
- `GET /api/users/` con barra final; el resto de colecciones no la lleva.
- `GET /api/ova/llm-options` es público (sin `security`): expone el catálogo de modelos
  sin autenticar. Revisar si es intencional.
- `operationId` autogenerados y verbosos (`db_health_api_db_health_get`); afectan a
  cualquier cliente generado desde el OpenAPI.

## Propuesta de agrupación destino (13 grupos)

| Grupo | Contenido |
|---|---|
| Health | `/health`, `/api/health`, `/api/db/health`, `*/health` de cada módulo |
| Auth | login, register, logout, me, verify-email, resend-verification, forgot/reset-password |
| Auth · TOTP | los 5 endpoints TOTP (sin duplicar en `Auth`) |
| Perfil | `/api/users/me` (perfil, password, theme, delete) |
| Ajustes de usuario | api-keys, llm-settings, ova-settings, enabled-models, image-models, resource-configs |
| Vinculaciones | `/api/users/me/links*` |
| Agentes 5E | los 11 de `/api/agents/*` |
| Generación | `/api/ova/jobs*` |
| OVA · CRUD | listar, guardar, editar, metadata, duplicar, borrar |
| OVA · Fases y versiones | fases, subelementos, versiones, revert, regenerar |
| OVA · Chat | `/api/ovas/{id}/chat*` |
| OVA · Papelera | papelera, lote, restaurar, permanente |
| SCORM y descargas | `/{id}/scorm`, `/{id}/export-scorm`, `/{id}/download` |
| Documentos y RAG | `/api/uploads/*`, `/api/rag/chunks/*` |
| Admin · Plataforma | llm-config, nodes-config, platform-config, registration-mode, refresh-catalog |
| Admin · Usuarios | `GET /api/users/`, `{user_id}` role/status/unlock/reset-password-email, links/admin, totp/admin |
| Admin · Roles | `/api/roles*` |
| Analítica | `/api/users/analytics` |

## Orden de arreglo sugerido

1. H1 (duplicados) — cambio de 3 líneas, elimina 6 entradas fantasma.
2. H4 + H5 (tag `Health`, mover `refresh-catalog`).
3. H7 (separar `Uploads` de `RAG`), H8 (unificar agentes), H6 (SCORM real).
4. H2 y H3 (partir `Users` y `OVA`) — el grueso.
5. H11 + H10 (declarar `openapi_tags` con orden, descripciones y nombres consistentes).
6. H14 (cookie en `securitySchemes`), H13 (summaries en español).
7. H12 (`/ova` vs `/ovas`) — aparte, rompe el frontend.
