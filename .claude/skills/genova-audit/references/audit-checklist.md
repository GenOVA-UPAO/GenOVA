# Executable checklist — mapped to CHECKPOINTS.md C1-C14

Source of truth: `CHECKPOINTS.md`. Note: numbering skips C8 (doesn't exist).

## C1 — Green tests

```powershell
pnpm test:unit
```
```bash
cd backend && pytest tests/step_defs/ -v --tb=short
```
Mark red if any test fails without justification documented in
`sdd/progress/implementados/impl_*.md`.

## C2 — Clean lint

```powershell
pnpm lint
```
```bash
cd backend && ruff check .
```
Both must come out at 0.

## C3 — Line limit

```bash
# frontend .ts (excludes .spec.ts)
find frontend/src -name "*.ts" ! -name "*.spec.ts" | xargs wc -l | awk '$1>250'
# backend .py (excludes tests)
find backend -name "*.py" ! -path "*/tests/*" ! -name "test_*.py" ! -name "*_test.py" ! -path "*/migrations/*" ! -path "*/.venv/*" | xargs wc -l | awk '$1>200'
```
Any listed file is a finding (severity per how much it exceeds, see
`severity-rubric.md`).

## C4 — Basic security

- Grep endpoints (`@router.(get|post|put|delete|patch)`) without
  `@limiter.limit` on the immediately preceding line.
- Grep `HTTPException` built with `str(e)` or direct exception variables in
  `detail=`.
- Grep `logger.\(info\|debug\|error\|warning\)` calls that include variables
  named `password`, `token`, `otp`, `api_key`, `secret`.
- Grep responses (`return {...}` or Pydantic response models) that include
  `reset_token`, `otp`, `token` fields without being the legitimate login
  endpoint.

## C5 — Spec↔test traceability

For every spec in `sdd/specs/*.md` with `R<n>` criteria: verify at least one
associated test exists (search the ID in `backend/tests/` or frontend specs)
and that the mapping is documented in the spec's "Trazabilidad" section or in
`impl_<name>.md`.

## C6 — Clean repo state

```powershell
./verify.ps1
```
Check `sdd/progress/current.md` is up to date; look for temp files,
debug `print(`, ownerless/contextless TODOs (`grep -rn "TODO" --include=*.py --include=*.ts`).

## C7 — Screaming architecture

See `genova-angular/references/screaming-architecture.md` and
`genova-fastapi/references/layered-architecture.md`. Verify:
- Frontend: `features/<domain-kebab>/{pages,components,lib,services}`, none of
  `features/views/` or `features/http/`.
- Backend: packages per domain, not per technical layer.
- Pages don't `fetch` directly; routers don't import `models.*` without `service.py`.

## C9 — Anti-spaghetti / unidirectional dependencies

```bash
npx madge --circular frontend/src
```
Look for `helpers.ts`/`utils.ts`/`misc.py` files that mix ≥2 unrelated
domains (kitchen-sink). Count imports per file (>15 runtime deps is a
signal). Verify layer direction (frontend: page never imports page;
backend: router never imports models without a service).

## C10 — Modularize repetition (DRY)

Look for literal or near-literal duplicated logic in ≥2 files (repeated
validations, hardcoded UI constants instead of tokens, the same fetch pattern
copied instead of a shared service).

## C11 — Audited dead code

```powershell
pnpm lint       # 0 no-unused-imports/no-unused-vars
```
```bash
ruff check .    # 0 F401/F841
grep -rn "print(" backend --include=*.py | grep -v tests/
grep -rniE "TODO|FIXME|XXX" frontend/src backend --include=*.ts --include=*.py
```
Also look for commented-out code (`//` or `#` blocks that are code, not
explanation) and unused barrel exports.

## C12 — Adoption of declared frameworks

Verify new code uses the already-adopted frameworks (TanStack Query,
Signal Forms, SpartanUI on frontend; arq+Redis, langgraph, slowapi, **structlog**,
opt-in Sentry/Logfire/LangSmith on backend) instead of reinventing equivalent
mechanisms.

When the audit scope includes Docker, logging, LangSmith, or design tokens,
also execute [observability-docker-checks.md](observability-docker-checks.md)
(extra greps + compose/Dockerfile checklist).

## C13 — Frontend responsive

Grep Tailwind classes with only fixed values and no responsive variants in
layout components; tables without `overflow-x-auto`; modals without a mobile variant.

## C14 — ORM aligned with DDL on deletes

```bash
cd backend && pytest tests/test_c14_orm_delete_cascade.py -v
```
Review every `relationship()` with `cascade=` — verify it matches the
actual FK in the corresponding SQL migration (`ON DELETE CASCADE` vs `SET NULL`).

## Extra — commit hygiene (local rule, not in CHECKPOINTS.md)

```bash
grep -rn "Co-Authored-By" $(git log --oneline -20 --format=%H)
```
If it shows up, flag it as a process finding (the project's commit policy
prohibits it, see `genova-dev/references/commit-rules.md`).
