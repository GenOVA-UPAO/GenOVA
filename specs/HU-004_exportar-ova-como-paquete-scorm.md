# HU-004: Exportar OVA como paquete SCORM

## Ruta de guardado
`specs/HU-004_exportar-ova-como-paquete-scorm.md`

## Historia de usuario
Como estudiante del curso de ML de UPAO, quiero exportar el OVA en formato SCORM, para integrarlo en el LMS Canvas de la UPAO.

## Objetivo
Generar un paquete SCORM 1.2 descargable e importable en Canvas LMS, con estructura válida y contenido de prueba, incluyendo comunicación básica de progreso con la API LMS.

## Alcance
Incluye:
- Botón "Exportar SCORM" visible en la vista `/crear-ova`.
- Endpoint backend para exportación de `.zip`.
- Estructura SCORM mínima válida con:
  - `imsmanifest.xml`
  - `index.html`
  - `resources/content.html`
  - `resources/styles.css`
  - `resources/scorm.js`
  - `resources/app.js`
- Contenido de prueba navegable (sin contenido IA).
- Script SCORM 1.2 para registrar estado de lección y commit.

No incluye:
- Generación de contenido dinámico por IA.
- Validación formal en SCORM Cloud (quedará a cargo de TA-005).
- Persistencia de versiones de paquetes exportados en servidor.

## Criterios de aceptación (detallados)
1. Se visualiza un botón "Exportar SCORM" en la vista de creación OVA.
2. Al accionar el botón, se descarga un archivo `.zip` funcional.
3. El zip incluye `imsmanifest.xml` y carpeta `resources/` con HTML/CSS/JS.
4. El contenido abre y navega sin dependencias externas (modo offline dentro del LMS).
5. El JS SCORM inicializa sesión cuando encuentra API LMS y guarda progreso básico.
6. La estructura queda preparada para validación formal posterior en TA-005 (SCORM Cloud).

## Flujo funcional
1. Usuario entra a `/crear-ova`.
2. Usuario presiona botón "Exportar SCORM".
3. Frontend llama a `POST /api/scorm/export`.
4. Backend construye zip SCORM en memoria y devuelve `application/zip`.
5. Navegador inicia descarga (`ova-scorm.zip`).

## Escenarios BDD (Gherkin)
```gherkin
Feature: Exportación de OVA a SCORM
  Como estudiante UPAO
  Quiero exportar un OVA en SCORM
  Para importarlo en Canvas LMS

  Scenario: Botón visible en Crear OVA
    Given la aplicación frontend en la ruta /crear-ova
    When la vista carga correctamente
    Then debo ver el botón "Exportar SCORM"

  Scenario: Descarga de zip SCORM
    Given el backend operativo en /api/scorm/export
    When presiono el botón "Exportar SCORM"
    Then se debe descargar un archivo ova-scorm.zip

  Scenario: Estructura válida mínima del paquete
    Given el archivo ova-scorm.zip descargado
    When inspecciono su contenido
    Then debe incluir imsmanifest.xml, index.html y carpeta resources con html/css/js

  Scenario: Registro básico de progreso en LMS
    Given el paquete abierto desde un LMS compatible SCORM 1.2
    When el usuario marca completado desde la interfaz de prueba
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
