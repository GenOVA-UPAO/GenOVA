# Docker Compose & verification workflow — GenOVA

**Language:** English (skill reference). For frontend image details see
`genova-angular/references/docker-and-build.md`. For logging/LangSmith see
`genova-fastapi/references/observability.md`.

## Compose inventory

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local full-stack **dev** (hot reload) |
| `docker-compose.prod.yml` | Local/staging **prod-like** images (no bind mounts) |
| `docker-compose.e2e.yml` | E2E harness (when used by Playwright pipeline) |

Root scripts:

```json
"dev:docker": "docker compose up --build",
"prod:docker": "docker compose -f docker-compose.prod.yml up --build"
```

`prod:docker` **requires** `docker-compose.prod.yml` to exist (restored 2026-07-12).

## Dev vs prod differences

| Aspect | Dev | Prod compose |
|---|---|---|
| Frontend Dockerfile | `frontend/Dockerfile` | `frontend/Dockerfile.prod` |
| Backend Dockerfile | `backend/Dockerfile` (reload) | `backend/Dockerfile.prod` (context = repo root) |
| Source mounts | Yes (`./frontend`, `./backend`) | No |
| Frontend command | `pnpm dev` (no install) | nginx serves static |
| Ports | `4200`, `8000` | `80`, `8000` |
| Healthchecks | wget/python health | same idea |

### Backend Dockerfile.prod context

Railway / prod compose build from **repo root**:

```yaml
build:
  context: .
  dockerfile: backend/Dockerfile.prod
```

Paths inside that Dockerfile are `backend/requirements.txt`, `backend/…`.
Do not "fix" them to match the dev Dockerfile (`context: ./backend`) without
updating Railway.

### Backend install speed

Dev/prod backend images use **uv** (`uv pip install --system -r requirements.txt`).
Prefer cache mounts for `/root/.cache/uv` in **dev** Dockerfile. Prod Dockerfile
may omit a fixed cache `id` on Railway Metal when the same file serves multiple
services with different cache namespaces (documented in `Dockerfile.prod`).

## Verify harness

```powershell
./verify.ps1        # lint + unit + backend BDD if API up
./verify.ps1 -Quick # lint + unit only (no backend required)
```

### When to use which

| Situation | Command |
|---|---|
| Closing a FE-only or docs/skills task | `-Quick` |
| Closing a backend feature / plan batch | full `verify.ps1` |
| After Docker-only changes | `-Quick` + optional `docker build` smoke |

`RESULTADO FINAL: PASA` is a literal protocol token — never translate it.

## Plan-ledger + Docker/observability tasks

For large infra plans (Docker + logging + design tokens):

1. Size = **Large** → plan mode + ledger under `sdd/plans/`.
2. Parallelize independent tasks (Docker ∥ structlog ∥ Spartan).
3. Assign models per [model-tiers.md](model-tiers.md) (includes Cursor
   Composer / Grok mapping).
4. Each task writes `tasks/T<n>.md` with evidence (verify snippet, pytest).
5. Audit with `genova-audit` after green verify when the user asks.

## Env documentation

Any new opt-in secret or flag → `backend/.env.example` with a short comment.
Never commit real keys. Compose uses `env_file: ./backend/.env` — do not
hardcode secrets in YAML.

## Anti-patterns

- Documenting `prod:docker` without shipping `docker-compose.prod.yml`.
- Reinstalling pnpm deps on every compose `up`.
- Running production Angular via `ng serve` inside Docker.
- Claiming verify green without pasting `RESULTADO FINAL: PASA` (or storing it
  in the task file).
