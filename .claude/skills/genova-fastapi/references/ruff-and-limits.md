# Ruff + line limit — backend

Real config: `backend/pyproject.toml` `[tool.ruff]`.

## Ruff

- `line-length = 100`, `target-version = "py311"`.
- Excludes: `migrations`, `scorm_output`, `uploads`, `venv`, `.venv`.
- **Selected rulesets**: `E` (pycodestyle), `F` (pyflakes), `W`, `I` (isort),
  `B` (bugbear), `UP` (pyupgrade), `S` (bandit security), `SIM` (simplify).
- **Globally ignored**: `E501` (the formatter already handles line length),
  `B008` (allows `Depends()` as a FastAPI default — intentional pattern, not a
  bug), `S101` (asserts allowed in tests), `S104` (binding to `0.0.0.0` in dev),
  `S110` (try/except/pass allowed in cleanup).
- **Per-file ignores**: `tests/**` relaxes `S,E`; `seed.py` relaxes `S105,S106`
  (hardcoded seed credentials, intentional); `main.py` and
  `ova/history_router.py` relax `E402`.
- Format: double quotes, space indentation (`ruff format .`).

Run before closing any backend task: `ruff check .` (or
`uv run ruff check .`). Must come out clean — checkpoint C2.

## 200-line limit (convention, NOT enforced by ruff)

`CLAUDE.md`/`CHECKPOINTS.md` C3 set **≤200 lines per backend file** as a
review convention — there's no `max-lines`/`PLR` rule in ruff's rule
selection, so `ruff check` will **not** fail because of this. It's the
`reviewer` (or this skill) that verifies it manually/by line count.

**Exemptions** (same as C3): tests (`backend/tests/**`, `test_*.py`,
`*_test.py`), SQL migrations (`backend/migrations/*.sql`).

When a file approaches the limit: split following the
`<resource>_router.py` pattern (see `layered-architecture.md`), or extract helpers to a
dedicated module within the same package — never into a generic
kitchen-sink `utils.py`/`helpers.py` (checkpoint C9/C10).
