# HU-024: Carga de archivos contextuales estilo chat

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-024 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-007 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero subir archivos de contexto con
un ícono junto al cuadro del prompt (estilo chat de LLM), para adjuntar mi material
de forma simple, sin un panel separado.

## Contexto

HU-007 ya implementa la carga de archivos de contexto (PDF/DOCX/PPTX/audio) con
backend `POST /api/uploads/temp`, hook `frontend/src/hooks/useOvaUploads.js`,
servicio `services/uploadService.js` y validación MIME en
`backend/ova/uploads_service.py:19`. El usuario no quiere el **panel actual de
"Archivos de contexto"**: prefiere un **ícono de adjuntar** junto al prompt y una
fila de **chips** (nombre + tamaño) encima del cuadro, como en ChatGPT, sin
explicar qué es RAG. HU-024 es **solo rediseño de UI**; reusa el backend existente.

## Alcance

### Incluye
- Ícono de adjuntar (clip/subir) junto al cuadro de tema/prompt.
- Fila de **chips** sobre el prompt: nombre de archivo + tamaño + botón "quitar".
- Indicador de estado por chip (subiendo / listo / error).
- Reuso de las validaciones de HU-007.

### No incluye
- Cambios en el backend de uploads ni en el pipeline RAG.
- Adjuntar archivos en el prompt del **workspace** de edición (se ata en HU-025).
- Texto explicativo de RAG en la interfaz.

## Dependencias

- **HU-007** — backend `/api/uploads/temp`, hook `useOvaUploads`, servicio `uploadService`, validaciones (formatos, 5 archivos, 20MB, MIME).
- Toca (frontend): `pages/CrearOvaPage.jsx`, nuevo componente de adjuntos (p. ej. `components/PromptAttachments.jsx`), reuso de `hooks/useOvaUploads.js` y `services/uploadService.js`.

## Reglas de negocio

1. **R1** — El cuadro de tema/prompt tiene un **ícono de adjuntar**; el panel separado de "Archivos de contexto" actual se **elimina**.
2. **R2** — Los archivos adjuntos se muestran como **chips** sobre el prompt: nombre + tamaño + botón **quitar**.
3. **R3** — La interfaz **no menciona "RAG"** ni da explicaciones; solo el ícono y los chips.
4. **R4** — Se mantienen las **validaciones de HU-007**: formatos PDF/DOCX/PPTX/audio, máximo **5 archivos**, **20 MB** por archivo, validación por MIME-type; ante violación se muestra **error inline** y no se adjunta.
5. **R5** — Cada chip refleja su **estado**: *subiendo* (spinner), *listo*, o *error* (con opción de quitar/reintentar).
6. **R6** — Reusa el backend existente (`POST /api/uploads/temp`) y el hook/servicio actuales; **sin cambios** en backend ni RAG.
7. **R7** — Interfaz **responsive** (RN-005), patrón services → hooks → pages (sin fetch en pages/hooks) y < 200 líneas/archivo.

## Criterios de aceptación

- Existe un ícono de adjuntar junto al prompt y no hay panel separado de archivos de contexto. **(R1)**
- Al adjuntar un archivo aparece un chip con su nombre y tamaño y un botón para quitarlo. **(R2)**
- La interfaz no muestra el término "RAG" ni explicaciones del mecanismo. **(R3)**
- Un archivo con formato no soportado, que exceda 20 MB o supere los 5 archivos se rechaza con un mensaje inline y no se adjunta. **(R4)**
- Mientras sube, el chip muestra un indicador; al terminar queda "listo"; si falla, muestra error. **(R5)**
- Los archivos adjuntos se envían al mismo endpoint/flujo de HU-007 (sin cambios de backend). **(R6)**
- La fila de chips y el ícono funcionan en escritorio y móvil, y ningún archivo nuevo supera 200 líneas. **(R7, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Carga de archivos contextuales estilo chat (HU-024)

  Scenario: Adjuntar un archivo desde el ícono junto al prompt
    Given un estudiante en la página de crear OVA
    When pulsa el ícono de adjuntar y elige un PDF válido
    Then aparece un chip sobre el prompt con el nombre y el tamaño del archivo
    And el chip muestra un indicador mientras sube y "listo" al terminar
    And la interfaz no muestra el término "RAG"

  Scenario: Quitar un archivo adjunto
    Given un archivo adjunto mostrado como chip
    When el estudiante pulsa "quitar" en el chip
    Then el chip desaparece y el archivo deja de estar adjunto

  Scenario: Rechazo por validación
    Given un estudiante que intenta adjuntar un archivo de 25 MB
    When lo selecciona desde el ícono de adjuntar
    Then se muestra un mensaje inline indicando el límite
    And el archivo no se adjunta
```

## Mockup ASCII

```
┌──────────────────────────────────────────────────────────┐
│  [ 📎 apuntes.pdf · 1.2 MB ✕ ]  [ 📎 clase.mp3 · 8 MB ✕ ] │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Tema del OVA…                                  📎  │  │
│  │                                          [ Generar ]│  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
   (📎 = ícono adjuntar · chips arriba con nombre·tamaño·✕)
```
