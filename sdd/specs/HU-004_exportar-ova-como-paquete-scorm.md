# HU-004: Exportar OVA como paquete SCORM

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-004 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP4: Motor de Exportacion SCORM |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | TA-002 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-21 |

## Ruta de guardado
`specs/HU-004_exportar-ova-como-paquete-scorm.md`

## Historia de usuario
Como estudiante del curso de ML de UPAO, quiero exportar el OVA en formato SCORM, para integrarlo en el LMS Canvas de la UPAO.

## Objetivo
Generar un paquete SCORM 1.2 descargable e importable en Canvas LMS, con estructura válida y contenido de prueba, incluyendo comunicación básica de progreso con la API LMS.

## Alcance
Incluye:
- Botón "Descargar SCORM" en `/mis-ovas` (card con status `listo`) y al finalizar la generación en `/crear-ova`.
- Endpoint `GET /api/ova/{id}/scorm` que devuelve 302 redirect a URL firmada de Supabase Storage (1 hora de validez), o bytes del zip desde disco local en dev.
- Paquete SCORM 1.2 con estructura válida:
  - `imsmanifest.xml`
  - `index.html`
  - `resources/content.html`
  - `resources/styles.css`
  - `resources/scorm.js`
  - `resources/app.js`
- Contenido navegable generado por IA (recursos ENGAGE + EXPLORE empaquetados).
- Script SCORM 1.2 para registrar estado de lección y commit.

No incluye:
- Validación formal en SCORM Cloud (a cargo de TA-005).
- Retención indefinida de versiones históricas del paquete (solo la versión activa).

## Criterios de aceptación (detallados)
1. Botón "Descargar SCORM" visible en la card del OVA en `/mis-ovas` cuando `status = listo`, y al finalizar la generación en `/crear-ova`.
2. Al accionar el botón, el frontend hace `GET /api/ova/{id}/scorm` y sigue el redirect 302 para iniciar la descarga del `.zip`.
3. El zip incluye `imsmanifest.xml` y carpeta `resources/` con HTML/CSS/JS.
4. El contenido abre y navega sin dependencias externas (modo offline dentro del LMS).
5. El JS SCORM inicializa sesión cuando encuentra API LMS y guarda progreso básico.
6. La estructura queda preparada para validación formal posterior en TA-005 (SCORM Cloud).

## Flujo funcional
1. Usuario accede a `/mis-ovas` (o al panel de resultados en `/crear-ova`).
2. Usuario presiona botón "Descargar SCORM" en la card del OVA con `status = listo`.
3. Frontend hace `GET /api/ova/{id}/scorm`.
4. Backend retorna `302 redirect` a URL firmada de Supabase Storage (1 h) — o bytes del zip en dev si no hay Supabase configurado.
5. Navegador descarga el `.zip` SCORM.

## Escenarios BDD (Gherkin)
```gherkin
Feature: Exportación de OVA a SCORM

  Scenario: Botón de descarga visible en Mis OVAs
    Given el usuario autenticado tiene al menos un OVA con status "listo"
    When navega a "/mis-ovas"
    Then debe ver el botón "Descargar SCORM" en la card del OVA

  Scenario: Botón de descarga visible al finalizar generación
    Given el usuario acaba de generar un OVA exitosamente en "/crear-ova"
    When la generación alcanza 100% y status cambia a "listo"
    Then debe aparecer el botón "Descargar SCORM" en el panel de resultados

  Scenario: Descarga de zip SCORM mediante redirect
    Given un OVA con status "listo" y su id conocido
    When el usuario presiona "Descargar SCORM"
    Then el frontend llama a "GET /api/ova/{id}/scorm"
    And el backend responde con 302 redirect a URL firmada
    And el navegador descarga el archivo zip SCORM

  Scenario: Estructura válida mínima del paquete
    Given el archivo zip SCORM descargado
    When inspecciono su contenido
    Then debe incluir imsmanifest.xml, index.html y carpeta resources con html/css/js

  Scenario: Registro básico de progreso en LMS
    Given el paquete abierto desde un LMS compatible SCORM 1.2
    When el usuario marca completado desde la interfaz
    Then el paquete debe enviar lesson_status y commit a la API LMS
```

## Mockup ASCII (vista Crear OVA)
```text
+---------------------------------------------------------------+
| Crear OVA                                                     |
| Configura y genera objetos virtuales de aprendizaje           |
|                                                               |
| +-----------------------------------------------------------+ |
| | Exportación SCORM                                         | |
| | Descarga un paquete SCORM 1.2 de prueba                  | |
| | [ Exportar SCORM ]                                        | |
| +-----------------------------------------------------------+ |
|                                                               |
| +-----------------------------------------------------------+ |
| | Área futura de generación asistida por IA                 | |
| +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

## Definición de terminado (DoD)
- Botón de exportación integrado en frontend.
- Endpoint backend retorna zip SCORM descargable.
- Zip contiene estructura mínima válida requerida.
- Registro básico de progreso implementado en JS SCORM.
- Documentación principal actualizada para uso local.
