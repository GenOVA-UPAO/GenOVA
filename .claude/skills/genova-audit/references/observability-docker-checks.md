# Audit extras — observability, Docker, design tokens

**Language:** English (skill reference). Extend the executable checklist in
[audit-checklist.md](audit-checklist.md) when auditing infra / chrome / logs.

## When to apply this reference

- User asked for `/genova-audit` after Docker, logging, LangSmith, or Spartan work.
- Diff touches `Dockerfile*`, `docker-compose*.yml`, `core/logging_setup.py`,
  `core/observability.py`, `core/log_redaction.py`, `styles.css`, `libs/ui/`.

## C4 — secrets & logging (extra greps)

```bash
# Server-only keys must not appear in frontend
rg -n "LANGSMITH_API_KEY|LOGFIRE_TOKEN|SENTRY_DSN|GROQ_API_KEY" frontend/src || true

# Logging must not interpolate secrets
rg -n "logger\.(info|debug|warning|error|exception).*api_key|password|otp|Bearer" backend --glob '*.py'

# LangSmith metadata must not include PII fields
rg -n "metadata.*=.*email|prompt|password" backend/prometheus backend/core
```

Findings if:

- Frontend reads LangSmith/Logfire/Sentry secrets.
- `init_langsmith` logs the API key value.
- Graph `metadata`/`tags` include user content or emails.

## C12 — declared frameworks in use

GenOVA **declares** these; audits should flag bypasses:

| Declared | Bypass smell |
|---|---|
| structlog + `configure_logging` | New `logging.basicConfig` in app code |
| Spartan helm + tokens in `styles.css` | Hardcoded hex/slate on chrome pages |
| `@angular/build:application` | Reintroducing webpack browser builder |
| Opt-in LangSmith/Logfire/Sentry | Always-on network calls without settings gate |

## Docker / compose checklist

- [ ] `package.json` `prod:docker` → file `docker-compose.prod.yml` **exists**
- [ ] Dev frontend `command` does **not** run `pnpm install`
- [ ] Prod frontend is multi-stage and serves `dist/frontend-ng/browser` (or current
      `angular.json` project name)
- [ ] `nginx.conf` has SPA `try_files … /index.html`
- [ ] No secrets in compose YAML; only `env_file`
- [ ] Backend prod Dockerfile context matches Railway (repo root) if applicable

Optional smoke (mark C1 partial if skipped, note in report):

```powershell
docker build -f frontend/Dockerfile.prod frontend
```

## Design system / chrome (C13 + C12)

- Tokens live in `frontend/src/styles.css` (`:root` + `.dark`), not scattered
  component hex values.
- Chrome palette = Editorial Académico UPAO (warm paper / UPAO blue / orange).
  Dark mode should keep a warm navy tint + blue→orange charts (not generic gray
  chart tokens).
- Typography: prefer `@spartan-ng/helm/typography` (`hlmH1`, `hlmLead`, …) on
  chrome titles; `font-display` for H1 brand voice.
- OVA **content** colors stay in `backend/llm/themes.py` — do not mix into chrome.

## Line limits after middleware extractions

If `main.py` grows again past 200 lines → High (C3). Prefer extracting routers
already included, or more middleware/helpers into `core/`.

## Severity hints for infra findings

| Finding | Typical severity |
|---|---|
| Secret in frontend bundle / logged key | Critical (C4) |
| `prod:docker` script broken (missing compose file) | High |
| Reintroduced `pnpm install` on every compose up | Medium (perf debt) |
| Dark charts still grayscale / ad-hoc chrome colors | Low–Medium (C12) |
| structlog not used in one Prometheus node | Low (gradual C12) |

## Report section suggestion

Add under Hallazgos when relevant:

```markdown
## Infra / observabilidad
- Docker: …
- Logs/LangSmith: …
- Design tokens: …
```
