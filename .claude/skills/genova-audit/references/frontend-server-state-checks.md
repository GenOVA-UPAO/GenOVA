# Audit extras — frontend server state & HTTP

**Language:** English (skill reference). Use with
[observability-docker-checks.md](observability-docker-checks.md) and
[audit-checklist.md](audit-checklist.md).

## C12 — TanStack Query / http

Grep smells:

```bash
# Pages calling fetch/apiFetch directly (should go through services)
rg -n "apiFetch\(|fetch\(" frontend/src/features --glob '*page*.ts'

# Manual server caches instead of injectQuery
rg -n "new Map\(|cache\s*=\s*signal" frontend/src/features

# HttpClient for normal CRUD (usually wrong in GenOVA)
rg -n "HttpClient" frontend/src/features
```

Findings when:

- A page uses `apiFetch` directly (layer violation).
- New list/detail screens use ad-hoc caching instead of `injectQuery`.
- Mutations that change lists never `invalidateQueries`.

Severity: usually **Medium** (C9/C12); **High** if auth cookies are mishandled
(missing `credentials`, storing JWT in localStorage).

## Cookie auth

```bash
rg -n "localStorage.*token|document\.cookie" frontend/src
rg -n "Authorization:\s*Bearer" frontend/src
```

- Storing JWT in `localStorage` → **Critical** (C4) if introduced in new code.
- Bearer header in new FE code while cookie auth is canonical → **Medium/High**
  (breaks when `AUTH_ACCEPT_BEARER=0`).

## Signal Forms

New forms using `FormGroup` / `FormControl` / `ngModel` instead of Signal Forms
→ **Medium** (C12). See `genova-angular/references/signal-forms.md`.

## Related skill refs

- `genova-angular/references/tanstack-query.md`
- `genova-angular/references/http-and-cookies.md`
