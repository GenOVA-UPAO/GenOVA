# Runbook — Levantar GenOVA (backend en Render, frontend en Vercel)

> Estado a 2026-09-07: el backend en Railway **ya no existe** (404) y el proyecto
> Supabase `tdwezncaxegjtgdsunhe` **no resuelve en DNS** (pausado o borrado). Este
> runbook lleva la app de vuelta a producción **sin Redis ni worker**: solo
> backend (Render) + frontend (Vercel) + BD (Supabase).

## Topología objetivo

```
navegador ──▶ Vercel (frontend Angular, estático)
                 │  XHR /api/*  (cookie httpOnly genova_token)
                 ▼
            Render  ── genova-backend (FastAPI, Docker, plan free, región oregon)
                 │
                 ▼
            Supabase ── PostgreSQL + pgvector (Transaction pooler :6543)
                        Storage: bucket privado scorm-packages
```

Sin `REDIS_URL`, la generación de OVA corre en un hilo dentro del proceso web
(`backend/generation/jobs/jobs_router_helpers.py:27`). Único costo: si Render
reinicia el servicio a mitad de una generación, ese job se pierde (hay un barrido
que recupera jobs `queued`/`running` colgados en el siguiente arranque).

---

## Paso 0 — Base de datos Supabase (Vía B: proyecto nuevo) — HECHO

Proyecto nuevo creado: ref **`qsvffnbadvnxhmudwfur`**, región **West US (North
California)**, plan Free. Bucket `scorm-packages` (privado) creado.

Ya se corrieron las **41 migraciones** contra esa BD desde local: `vector` (pgvector)
instalado, 20 tablas públicas, BD escribible y vacía de datos. Cuando Render arranque,
verá las migraciones aplicadas y solo ejecutará `seed_db()` (roles + cuentas
`admin@genova.ai` / `user@genova.ai`).

**El frontend NO toca Supabase.** El Angular actual no tiene ninguna referencia a
Supabase (las `VITE_SUPABASE_*` de `frontend/.env` son código muerto del frontend
React viejo). Del frontend solo cambia `GENOVA_API_BASE_*` → URL de Render (Paso 2).

### Valores finales (ya puestos en `backend/.env` local; falta ponerlos en Render)

```
DATABASE_URL=postgresql+psycopg://postgres.qsvffnbadvnxhmudwfur:soportegenovaupao@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://qsvffnbadvnxhmudwfur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key service_role del proyecto — NO la anon>
SUPABASE_STORAGE_BUCKET=scorm-packages
```

> Notas:
> - `SUPABASE_URL` es la **Project URL** a secas — sin `/rest/v1/` (supabase-py añade
>   `/storage/v1/...` solo).
> - El host es `aws-0-us-west-1` (así lo da el dashboard), puerto **6543** (Transaction
>   pooler). El backend añade `+psycopg` solo; el `?sslmode=require` lo pones tú.
> - Si algún día reseteas la contraseña de la BD, actualiza `DATABASE_URL` en los dos
>   sitios (`backend/.env` y Render).

---

## Paso 1 — Backend en Render

Ya existe `render.yaml` en la raíz del repo (Blueprint). Define el servicio Docker,
región `oregon`, plan `free`, health check `/health` y todas las variables.

1. https://dashboard.render.com → **New → Blueprint**.
2. Conecta la cuenta de GitHub y elige el repo **GenOVA-UPAO/GenOVA**, rama `develop`.
3. Render detecta `render.yaml` y muestra el servicio `genova-backend`. **Apply**.
4. Rellena las 10 variables marcadas `sync: false` en `render.yaml`. Todas salen
   **tal cual de tu `backend/.env` local** (ya actualizado con la BD nueva):

   | Variable | Nota |
   |---|---|
   | `DATABASE_URL` | Paso 0 — puerto 6543 |
   | `SUPABASE_URL` | Paso 0 — sin `/rest/v1/` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Paso 0 — la `service_role`, no la `anon` |
   | `GROQ_API_KEY` | de `backend/.env` |
   | `OPENROUTER_API_KEY` | de `backend/.env` |
   | `OPENCODE_API_KEY` | de `backend/.env` |
   | `GEMINI_API_KEY` | de `backend/.env` (requerido por RAG) |
   | `HF_TOKEN` | de `backend/.env` (opcional, imágenes) |
   | `SMTP_USER` / `SMTP_PASSWORD` | de `backend/.env` (opcional, reset de contraseña) |

   `JWT_SECRET` lo genera Render solo (`generateValue: true`). El resto
   (`ENV=production`, `CORS_ORIGINS`, `COOKIE_SAMESITE=none`…) ya van fijadas en `render.yaml`.

5. **Apply / Create**. El primer build tarda ~5-10 min (imagen Docker + `uv pip install`).
6. En los logs debe verse: `Migraciones completadas` (todas skipped, ya aplicadas) →
   `Siembra completada` → `Uvicorn running on http://0.0.0.0:10000`.
7. Anota la URL pública real: `https://genova-backend.onrender.com` (o con sufijo si
   el nombre está tomado). **Si no es exactamente esa, corrige el Paso 2 y `CORS_ORIGINS`.**

### Verificación
```bash
curl https://genova-backend.onrender.com/health
# {"status":"ok"}
curl https://genova-backend.onrender.com/api/db/health
# {"status":"ok","scope":"db"}   ← confirma que la BD responde
```

> Plan free de Render: el servicio **duerme tras 15 min sin tráfico**; el primer
> request tras dormir tarda ~30-50 s. Aceptable para este entorno.

---

## Paso 2 — Repuntar el frontend (Vercel) al backend de Render

El frontend Angular resuelve la URL del backend en build desde
`GENOVA_API_BASE_PROD` (`frontend/src/core/lib/http.ts`).

1. https://vercel.com → proyecto del frontend → **Settings → Environment Variables**.
2. Edita (o crea) para **Production** y **Preview**:
   - `GENOVA_API_BASE_PROD` = `https://genova-backend.onrender.com`
   - `GENOVA_API_BASE_DEVELOP` = `https://genova-backend.onrender.com`
   (borra cualquier valor viejo `*.up.railway.app`)
3. **Deployments → … → Redeploy** el último de Production (sin cache).

---

## Paso 3 — Cuadrar CORS

`CORS_ORIGINS` en Render debe listar el/los origen(es) exactos del frontend:
- `https://gen-ova-frontend.vercel.app` (producción)
- añade el dominio de preview de develop si lo usas, separado por coma

Cambiar una env var en Render redeploya el servicio solo.

---

## Paso 4 — Smoke test end-to-end

1. Abre `https://gen-ova-frontend.vercel.app` → carga el login sin errores en consola (F12).
2. Login con `admin@genova.ai` / `admin1234password` → redirige a `/dashboard`.
3. `GET /api/ovas` responde (lista, aunque esté vacía).
4. Logout → las rutas protegidas redirigen a `/login`.

---

## Notas

- `.railway/railway.ts` queda **obsoleto** (referencia histórica). El despliegue
  vivo es `render.yaml`.
- No se despliega `backend/Dockerfile.worker` ni Redis.
- `ENV=production` desactiva `/docs`, `/redoc` y `/openapi.json` a propósito.
- Cuentas seed (`admin@genova.ai` / `user@genova.ai`) son públicas — cámbialas si
  el entorno deja de ser académico.
- BD nueva y limpia → ya no aplica el problema de cuota del proyecto anterior. Para
  no repetirlo: no correr pruebas de carga contra esta BD (usar `LLM_FAKE=1` +
  `RATE_LIMIT_ENABLED=0` y, si se puede, una BD aparte para carga).
- El proyecto Supabase viejo (`tdwezncaxegjtgdsunhe`) puede borrarse cuando confirmes
  que el nuevo funciona.
