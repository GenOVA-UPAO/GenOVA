# Docker and Angular build — GenOVA conventions

**Language:** English (skill reference). Grounded in Docker docs (BuildKit
multi-stage / Angular guide), pnpm Docker docs (`pnpm fetch`, corepack), and
Angular's `@angular/build:application` (esbuild) system.

## Why this exists

Frontend cold starts in Docker were slow when `docker-compose` re-ran
`pnpm install` on every `up`. Production lacked a multi-stage image even though
`package.json` already had `prod:docker` → `docker-compose.prod.yml`.

## Canonical files

| File | Role |
|---|---|
| `frontend/Dockerfile` | **Dev** image: deps layer + `pnpm dev` |
| `frontend/Dockerfile.prod` | **Prod** multi-stage: deps → `pnpm build` → nginx |
| `frontend/nginx.conf` | SPA `try_files` + static asset caching |
| `docker-compose.yml` | Dev: bind-mount source, anonymous `/app/node_modules` |
| `docker-compose.prod.yml` | Prod: no source mounts, nginx on `:80` |

Scripts (repo root `package.json`):
- `pnpm dev:docker` → `docker compose up --build`
- `pnpm prod:docker` → `docker compose -f docker-compose.prod.yml up --build`

## Dev compose rules (hard)

1. **Never** reinstall deps in the service `command`. Deps come from the image
   layer + anonymous volume `/app/node_modules`.
2. Correct pattern:

```yaml
command: pnpm dev --host 0.0.0.0 --port 4200
volumes:
  - ./frontend:/app
  - /app/node_modules
environment:
  - CI=true
  - API_PROXY_TARGET=http://backend:8000
```

3. Prefer host `pnpm dev` for day-to-day HMR when only FE changes; use compose
   when you need the full stack / proxy parity.

## Dockerfile.dev practices

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
COPY package.json pnpm-lock.yaml* ./
# GenOVA-specific: monorepo allowBuilds is outside ./frontend context
RUN printf 'allowBuilds:\n  esbuild: true\n  ...' > pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-frontend,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
COPY . .
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "4200"]
```

### BuildKit cache mounts

- Syntax: `RUN --mount=type=cache,id=<unique>,target=<store-path> …`
- pnpm store default: `/root/.local/share/pnpm/store` (or set `PNPM_HOME`)
- Cache mounts **do not** land in the final image layer; they only speed rebuilds.
- On hosts without BuildKit, builds still work but lose the mount cache.

### pnpm-specific optimizations (from pnpm docs)

Preferred progression when the lockfile is stable:

1. `COPY pnpm-lock.yaml` (+ workspace yaml if needed)
2. `pnpm fetch` (only needs lockfile — best layer cache)
3. `COPY . .` then `pnpm install --offline --frozen-lockfile`

GenOVA currently uses `pnpm install --no-frozen-lockfile` in the frontend image
because the FE build context is a **subset** of the monorepo and may diverge
from root lock semantics. Prefer `--frozen-lockfile` once the frontend lock is
self-contained and CI-proven.

Always pin pnpm via **corepack** (`packageManager` field / `corepack prepare`),
not `npm install -g pnpm` long-term (global install is acceptable only as a
short bridge).

## Dockerfile.prod practices

Official Docker Angular guide pattern adapted to GenOVA:

```dockerfile
FROM node:22-alpine AS deps
# … install with cache mount …

FROM deps AS build
COPY . .
RUN pnpm build

FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-ng/browser /usr/share/nginx/html
```

### Critical path details

- Angular application builder output: `dist/<projectName>/browser`
  (project name in `angular.json` is `frontend-ng`).
- Nginx **must** use SPA fallback:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

- Prefer hashing (`outputHashing: all` in production config) + long cache for
  hashed assets; never long-cache `index.html`.
- Future hardening (optional): `nginxinc/nginx-unprivileged`, non-root `USER`,
  listen on `8080` — aligns with Docker's Angular guide.

## Angular build system (repo reality)

- Builder: `@angular/build:application` (esbuild / Vite-based; not webpack).
- Dev server: `@angular/build:dev-server`.
- Production `ng build` enables AOT, minification, tree-shaking, mangling.
- Do **not** reintroduce `@angular-devkit/build-angular:browser` unless there
  is a documented blocker.

### Speed levers

| Lever | Effect |
|---|---|
| Layer: copy lockfile before source | Rebuilds skip install when deps unchanged |
| BuildKit pnpm store cache | Faster repeated `docker build` |
| No install on compose `up` | Seconds vs minutes on cold start |
| Host `pnpm dev` | Fastest HMR loop |
| CI cache of `.angular/cache` | Faster unit/e2e builds |

## Anti-patterns (do not reintroduce)

- `command: sh -c "pnpm install && pnpm dev …"` in compose.
- Copying the entire monorepo into the frontend image without need.
- Serving Angular with `ng serve` in production.
- Baking secrets (`API` keys) into the frontend image — use runtime config /
  backend only.

## Verification

```powershell
# Dev image builds
docker compose build frontend

# Prod image (smoke — catches wrong dist path)
docker build -f frontend/Dockerfile.prod frontend
```

Document smoke results in audits / plan task files when changing Dockerfiles.
