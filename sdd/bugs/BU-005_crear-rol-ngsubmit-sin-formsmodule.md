# BU-005: "Crear rol" no crea — (ngSubmit) sin FormsModule recarga la página

> Metadata (de `sdd/backlog.md` + ciclo del bug):

| Campo | Valor |
|---|---|
| ID | BU-005 |
| Tipo | Bug |
| Épica/Tema | EP-2: Plataforma Web y Autenticación |
| Sprint | Sprint 2 |
| Status | in_progress |
| Prioridad | Alta |
| Estimación | 1 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-07-06 |
| Fecha actualización | 2026-07-06 |
| Fecha Fin (info) | — |

## Ruta de guardado
`sdd/bugs/BU-005_crear-rol-ngsubmit-sin-formsmodule.md`

## Resumen
En /admin/roles, "Crear rol" (y "Guardar cambios" al editar) cierra el modal sin
crear/guardar nada: ninguna request `POST /api/roles`, sin error en consola.
Detectado por los e2e `HU-018 crear rol` (CI run 28806657326) y reproducido en
el deploy develop (2026-07-06).

## Pasos para reproducir
1. Login admin → /admin/roles → "+ Nuevo rol".
2. Nombre "rol-prueba" → "Crear rol".
3. El modal desaparece, la página recarga (GETs de arranque en red), el rol no
   existe en `GET /api/roles`.

## Causa raíz
`role-form-modal.component.ts` usa `<form (ngSubmit)="onSubmit.emit($event)">`
pero **no importa FormsModule**: sin la directiva NgForm el evento `ngSubmit`
no existe, el binding es inerte y el `<button type="submit">` dispara el submit
NATIVO del navegador → recarga de página (full reload) que desmonta el modal.
El handler del parent (`handleFormSubmit` con `preventDefault`) nunca corre.

## Fix
`(ngSubmit)` → `(submit)` nativo en el form del modal (el parent ya hace
`preventDefault()`). Sin dependencias nuevas.

## Invariante (backprop §V)
`(ngSubmit)` solo es válido si el componente importa FormsModule o
ReactiveFormsModule; en componentes sin forms-module usar `(submit)`.
Verificado: es el único caso en el repo (grep ngSubmit vs imports).
