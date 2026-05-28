# CHECKPOINTS — Criterios objetivos de calidad de GenOVA

> El reviewer verifica estos checkpoints al aprobar cualquier feature.
> Puede agregar nuevos criterios (documentando el cambio en su veredicto).

## C1 — Tests verdes
- [ ] `pnpm test:unit` pasa al 100% (cucumber-js)
- [ ] `pytest tests/step_defs/ -v --tb=short` pasa al 100%
- [ ] No hay tests en `[ ]` sin justificación documentada en `progress/impl_*.md`

## C2 — Lint limpio
- [ ] `pnpm lint` sale con exit 0 (ESLint max-lines: 200, sin errores)
- [ ] `ruff check backend/` sale con exit 0 (E, F, W, I, B, UP, S, SIM)

## C3 — Límite de líneas respetado
- [ ] Ningún archivo en `frontend/src/` supera 200 líneas
- [ ] Ningún archivo en `backend/` supera 200 líneas (excepción: `backend/tools/prompt_lab.py`)

## C4 — Seguridad básica
- [ ] No hay tokens, API keys, passwords, ni OTPs en respuestas HTTP
- [ ] Nuevos endpoints con input externo tienen rate-limit (`@limiter.limit`)
- [ ] Nuevos endpoints auth-adjacentes usan Pydantic con `Field(max_length=…)`
- [ ] Errores de BD nunca se filtran al cliente (usar `commit_or_500()` helpers)

## C5 — Trazabilidad specs ↔ tests
- [ ] Cada `R<n>` del spec de la feature tiene al menos un test concreto
- [ ] El mapa `R<n> → test` está documentado en `progress/impl_<name>.md`

## C6 — Estado del repo limpio
- [ ] `verify.ps1` termina sin errores (PASA en todas las secciones)
- [ ] `progress/current.md` refleja estado actualizado
- [ ] No hay archivos temporales, `print()` de debug, ni TODOs sin contexto

## C7 — Arquitectura GenOVA respetada
- [ ] Frontend sigue patrón services → hooks → pages (sin fetch en pages/hooks)
- [ ] Backend sigue patrón router → service → model (sin lógica de negocio en routers)
- [ ] Nuevas features siguen flujo SDD completo si tienen `"sdd": true` en feature_list.json
