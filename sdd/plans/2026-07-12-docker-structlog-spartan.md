# Plan — Docker, structlog, LangSmith y Spartan

## Context

Acelerar Docker frontend, estructurar logs con structlog, conectar LangGraph↔LangSmith (opt-in), pulir chrome Spartan, verify + auditoría. Sin specs. Modelos: Grok / Composer.

## Scope

- In: Docker dev+prod, structlog+R8, LangSmith opt-in, typography Helm + dark UPAO, verify, audit
- Out: specs nuevas, commit sin aprobación, rediseño features densas

## Task table

| ID | Description | Model | Depends | State | Task file |
|----|-------------|-------|---------|-------|-----------|
| T1 | Docker frontend + compose.prod | Composer | — | done | `tasks/T1.md` |
| T2 | structlog + redaction + main≤200 | Grok | — | done | `tasks/T2.md` |
| T3 | LangSmith opt-in | Grok | — | done | `tasks/T3.md` |
| T4 | Spartan typography + dark UPAO | Composer | — | done | `tasks/T4.md` |
| T5 | verify.ps1 -Quick | Composer | T1–T4 | done | `tasks/T5.md` |
| T6 | auditoría genova-audit | Grok | T5 | done | `tasks/T6.md` |

## Execution order

- Level 0 (parallel): T1, T2, T3, T4
- Level 1: T5
- Level 2: T6

## Close-out

- [ ] All tasks `done`
- [ ] verify verde
- [ ] Commit propuesto (no ejecutado)
