# TA-001: Configuración de repositorios y ramas

> Metadata:

| Campo | Valor |
|---|---|
| ID | TA-001 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP2: Plataforma Web y Autenticación |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 2 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-06-16 |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Objetivo

Inicializar GitHub, configurar ramas y entornos de desarrollo, crear la
estructura `frontend/` `backend/` `docs/`, definir convención de commits y
dejar todo listo para clonar y trabajar.

## Contexto

Esta tarea se ejecutó de facto al inicio del proyecto. El repositorio
`GenOVA` existe en GitHub con la estructura de monorepo, `.gitignore`,
convención de commits (conventional commits) y permisos configurados.
La spec se redacta post-facto para formalizar y cerrar.

## Alcance

### Incluye
- Repositorio GitHub con branches: `main` (protegida) y `develop`.
- `.gitignore` con `node_modules`, `.env`, `dist`, `__pycache__`, etc.
- Estructura de carpetas: `frontend/`, `backend/`, `docs/`, `sdd/`.
- README inicial con instrucciones de setup.
- Convención de commits: conventional commits.

### No incluye
- CI/CD pipeline (→ EN-002, TA-006, TA-007).
- Configuración de protección de ramas en GitHub (branch rules).

## Dependencias

Ninguna.

## Criterios de aceptación

- Repositorio GitHub accesible con rama `main` y `develop`.
- `.gitignore` excluye archivos sensibles y de build.
- Estructura `frontend/`, `backend/`, `docs/`, `sdd/` presente.
- README con instrucciones de setup.
- Convención de commits definida y en uso.

## Estado actual

**Ya implementado.** El repositorio existe y está en uso activo desde
Sprint 1. Esta spec se redacta para formalizar el cierre.
