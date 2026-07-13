# pnpm monorepo — GenOVA

**Language:** English (skill reference). Sources: pnpm docs (workspaces,
`pnpm fetch`, frozen lockfile, Docker) + repo root `package.json` /
`pnpm-workspace.yaml`.

## Layout

- Root workspace orchestrates `frontend` (and scripts like `dev:docker`).
- Frontend package: `frontend/package.json` with `"packageManager": "pnpm@…"`.
- Prefer **corepack** to pin pnpm version (`corepack enable` /
  `corepack prepare pnpm@<ver>`).

## Daily commands (from repo root)

| Command | Purpose |
|---|---|
| `pnpm install` | Install workspace |
| `pnpm dev` | Frontend ng serve |
| `pnpm lint` / `pnpm test:unit` | FE quality |
| `pnpm build` | Production Angular build |
| `pnpm dev:docker` / `pnpm prod:docker` | Compose stacks |

Filter when needed: `pnpm --filter frontend <script>`.

## Lockfile discipline

- Commit the root `pnpm-lock.yaml`.
- CI / Docker: prefer `pnpm install --frozen-lockfile` when the lock matches
  the package manifests.
- Frontend Docker context is `./frontend` and may synthesize a minimal
  `pnpm-workspace.yaml` for `allowBuilds` (esbuild, etc.) — see
  `genova-angular/references/docker-and-build.md`.

### Docker cache patterns (pnpm docs)

Best layer cache:

1. Copy lockfile (+ workspace yaml)
2. `pnpm fetch` (only needs lockfile)
3. Copy sources
4. `pnpm install --offline --frozen-lockfile`

GenOVA may use BuildKit cache mounts on the pnpm store when `fetch` is not yet
wired — both are valid; prefer `fetch` when the lockfile is self-contained in
the build context.

## Anti-patterns

- Mixing `npm install` / `yarn` in the same tree.
- Committing `node_modules`.
- Re-running `pnpm install` on every `docker compose up` (defeats image layer).
- Upgrading pnpm globally without updating `packageManager` + corepack prepare.

## Related

- [docker-compose-workflow.md](docker-compose-workflow.md)
- [docker-and-build.md](../../genova-angular/references/docker-and-build.md)
