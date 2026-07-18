# HTTP and cookie auth — GenOVA frontend

**Language:** English (skill reference). Complements Angular zoneless + TanStack
Query. Cookie auth is backend-issued JWT in httpOnly `genova_token`.

## Single entrypoint

All app API traffic goes through `frontend/src/core/lib/http.ts` → `apiFetch`.

- Always `credentials: 'include'` so the browser sends the httpOnly cookie.
- Default timeout (~15s); callers may override for long generation polls.
- 401 on protected routes → `AuthExpiredBus` (redirect / re-login UX). Never
  invent a second fetch wrapper in a feature.

### Do not

- Call `fetch` / `apiFetch` from a **page** component — pages call
  `features/<domain>/services/*` or TanStack `queryFn` that call services.
- Use Angular `HttpClient` for normal CRUD (reserved for point integrations
  like Sentry). Prefer `apiFetch` + Promises in services.
- Read the JWT from JavaScript (`document.cookie` / localStorage) — cookie is
  httpOnly by design.

## API base resolution

URLs come from `.env` / Vercel (`GENOVA_API_BASE_PROD`, `GENOVA_API_BASE_DEVELOP`,
optional `GENOVA_API_BASE_URL`) via `scripts/run-with-api-env.mjs` (`ng --define`).
Never hardcode Railway hosts in `http.ts`.

`resolveApiBase()` in `http.ts`:

| Context | Base |
|---|---|
| `localhost` / `127.0.0.1` | `location.origin` (dev proxy) |
| Vercel preview `*-git-develop-*` | `API_BASE_DEVELOP` from env |
| Production | `API_BASE_PROD` from env |
| Override | `window.__GENOVA_API_BASE__` |

Local proxy: `frontend/proxy.conf.json` + `API_PROXY_TARGET` in Docker compose.

## Auth contract (with backend)

- Login/register set `Set-Cookie: genova_token=...; HttpOnly; Secure; SameSite=...`
- Production may set `AUTH_ACCEPT_BEARER=0` — do not rely on `Authorization: Bearer`
  in new frontend code.
- CORS: production requires explicit `CORS_ORIGINS`; credentials need matching
  origins (no `*`).

## Error shape

`apiFetch` throws a typed/HTTP-aware error (status + message safe for UI).
Never surface raw stack traces or provider API keys from failed LLM calls to
the user — map to Spanish product copy in the feature layer.

## Zoneless interaction

After `apiFetch` resolves, update **signals** or let TanStack Query's signal
results drive the template. Do not expect Zone.js to patch async completion.

## Related

- [tanstack-query.md](tanstack-query.md)
- Backend cookies / rate limits: `genova-fastapi/references/security.md`
