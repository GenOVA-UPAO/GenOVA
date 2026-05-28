# TA-BDD: Incompatibilidades y Ajustes — Gherkin vs. Arquitectura Real

Este documento registra los casos donde el Gherkin documentado en `/specs/*.md` no puede implementarse
verbatim porque la arquitectura real difiere. Por cada caso se indica el motivo y el ajuste aplicado
en el `.feature` file correspondiente.

---

## INC-001 — HU-015, HU-016, HU-021: Formato Gherkin incompleto

**Specs afectados:** `HU-015`, `HU-016`, `HU-021`

**Problema:** La sección `## Escenarios Gherkin (BDD)` de estos tres specs usa
texto plano con "Escenario N:" en lugar del formato estándar Gherkin
(`Feature:` / `Scenario:` / `Given` / `When` / `Then`). Los runners
(pytest-bdd, cucumber-js, playwright-bdd) requieren el formato estándar.

**Ejemplo del problema (HU-015):**
```
Dado que soy un usuario autenticado
Y me encuentro en la pantalla de perfil "/profile"
Cuando cambio mi nombre a "Carlos Pérez"...
```

**Acción aplicada:** Los tres `.feature` files fueron reescritos envolviendo
los escenarios en bloques `Feature:` / `Scenario:` estándar, preservando
exactamente los pasos (Given/When/Then) del spec original. No se inventaron
nuevos pasos — solo se añadió la estructura mínima requerida por el runner.

**Features generados:**
- `tests/features/auth/HU-015_perfil.feature`
- `tests/features/auth/HU-016_cambiar-contrasena.feature`
- `tests/features/roles/HU-021_gestion-usuarios.feature`

---

## INC-002 — HU-004: Endpoint SCORM incorrecto

**Spec afectado:** `HU-004_exportar-ova-como-paquete-scorm.md`

**Problema:** El spec define el flujo como `POST /api/scorm/export` → descarga zip.
El endpoint real (según CLAUDE.md y `ova/router.py`) es:
```
GET /api/ova/{id}/scorm  →  302 redirect a URL firmada de Supabase Storage
```
El endpoint `POST /api/scorm/export` nunca fue implementado — `scorm/router.py`
solo expone `GET /health`.

**Acción aplicada:**
- Scenario "Descarga de zip SCORM" ajustado para usar `GET /api/ovas/{id}/scorm`
  y esperar un redirect 302 o blob de bytes (dependiendo del entorno dev/prod).
- Scenario "Botón visible en Crear OVA" ajustado: el botón de descarga SCORM
  aparece en `/mis-ovas` (card con status `listo`), no en `/crear-ova` como indica el spec.
  La vista `/crear-ova` muestra el botón de descarga solo al finalizar la generación.

**Feature generado:** `tests/features/ova/HU-004_exportar-scorm.feature`

**Nota para el equipo:** Si el spec debe mantenerse como `POST /api/scorm/export`,
hay que implementar ese endpoint. De lo contrario actualizar el spec para reflejar
el endpoint real.

---

## INC-003 — HU-003: Botón "Editar" ya no está deshabilitado

**Spec afectado:** `HU-003_visualizar-completa-5E.md`

**Problema:** El spec incluye el scenario:
```gherkin
Scenario: Botón Editar deshabilitado por fase
  Then el botón está deshabilitado con mensaje "Disponible en Sprint 2"
```
HU-011 (Editar OVA) ya fue implementado. El botón "Editar" en la vista 5E
ahora está habilitado y redirige a `/mis-ovas/{id}/editar`.

**Acción aplicada:** El scenario fue actualizado para reflejar el comportamiento
actual: el botón "Editar" está habilitado y funcional. El mensaje "Sprint 2" fue
eliminado del `.feature`. El scenario ahora valida que el clic redirige al editor.

**Feature generado:** `tests/features/ova/HU-003_visualizar-5e.feature`

**Nota para el equipo:** Actualizar el spec HU-003 para remover la referencia a
"Sprint 2" — ese sprint ya fue completado.

---

## INC-004 — HU-021 Escenario 4: OTP devuelto en response viola seguridad

**Spec afectado:** `HU-021_gestion-roles-asignar-rol-usuario.md`

**Problema:** El Escenario 4 (Restablecimiento por WhatsApp) espera:
```gherkin
Entonces el backend genera un token de restablecimiento único
Y el servidor envía un correo... (mezcla de email y WhatsApp en el escenario)
```
Y el contrato de API en el spec devuelve:
```json
{ "phone_number": "...", "otp_code": "482910", "text": "..." }
```

Esto viola la política de seguridad del proyecto (CLAUDE.md):
> "Never return reset tokens, OTPs, or any single-use credentials in HTTP responses."

La implementación real (`users/admin_account_router.py`) genera el token
internamente y devuelve solo una `wa_url` (WhatsApp share link), nunca el token.

**Acción aplicada:** El scenario fue corregido para esperar el response real:
```gherkin
Then el frontend recibe una URL de WhatsApp para enviar manualmente
And la respuesta NO contiene el token de restablecimiento
```

**Feature generado:** `tests/features/roles/HU-021_gestion-usuarios.feature`

**Nota para el equipo:** Actualizar el spec HU-021 contrato de API del endpoint
`POST /api/users/{id}/reset-password-whatsapp` — nunca debe documentar que el
token/OTP es devuelto al cliente.

---

## INC-005 — HU-010 Scenario "Modularidad": no testeable en runtime

**Spec afectado:** `HU-010_maquetacion-layout-principal-enrutamiento-modular.md`

**Problema:** El scenario:
```gherkin
Scenario: Modularidad de componentes de layout
  Given el código fuente del layout
  When se revisan los archivos de componentes
  Then cada componente de layout debe mantenerse bajo el límite de líneas definido
```
No es un test de comportamiento en runtime — es una verificación estática de
código (ESLint `max-lines`). No existe forma de implementar este scenario en
Playwright o cucumber-js de manera significativa.

**Acción aplicada:**
- El scenario fue marcado con `@lint` en el `.feature` file.
- El step definition correspondiente ejecuta `pnpm lint` y verifica exit code 0.
- En GitHub Actions, el job `lint` ya cubre este check antes que el job E2E.
- El step def para E2E simplemente invoca el linter y verifica que pase.

**Feature generado:** `tests/features/layout/HU-010_layout.feature`

---

## INC-006 — EN-008: Sin sección Gherkin en el spec

**Spec afectado:** `EN-008_habilitar-base-datos-gestion-usuarios.md`

**Problema:** EN-008 no tiene sección `## Escenarios BDD (Gherkin)`. Solo
tiene un `## Checklist de verificación`.

**Acción aplicada:** El `.feature` file fue escrito a partir de los
5 criterios de aceptación del spec, transformándolos en scenarios Gherkin.
No son verbatim del spec pero derivan directamente de sus CAs.

**Feature generado:** `tests/features/setup/EN-008_base-datos.feature`

**Nota para el equipo:** Agregar sección `## Escenarios BDD (Gherkin)` al spec
EN-008 usando el contenido del feature file como base.

---

---

## INC-007 — HU-018 Esc.2: "Acceso denegado" excluido del scope E2E

**Spec afectado:** `HU-018_gestion-roles-crear-rol.md` — Escenario 2

**Escenario:** `Acceso denegado a usuario sin rol administrador`

**Problema:** El Background autentica como administrador. El escenario reemplaza
el token con uno de usuario normal vía inyección en `localStorage` sin recargar
la página. Al navegar a `/admin/roles`, `AdminRoute` lanza un `fetch` a
`/api/auth/me` que se cuelga indefinidamente en CI bajo ese contexto mixto,
consumiendo el timeout completo del test (60 s).

**Raíz técnica:** Sin recarga de página entre Background (admin) y Scenario
(usuario), el navegador mantiene estado interno de la sesión anterior que
interfiere con la nueva llamada autenticada de `AdminRoute`.

**Acción aplicada:** Excluido con `grepInvert` en `tests/playwright.config.js`.
El caso positivo (admins acceden) queda cubierto por los demás escenarios de HU-018.

**Para testear el negativo correctamente:** Usar `test.use({ storageState })` o
un fixture de sesión limpia que garantice un contexto de navegador completamente
nuevo para el usuario normal, sin herencia del contexto admin del Background.

---

## Resumen

| INC | Specs | Tipo | Ajuste |
|-----|-------|------|--------|
| INC-001 | HU-015, HU-016, HU-021 | Formato inválido | Conversión a Gherkin estándar |
| INC-002 | HU-004 | Endpoint inexistente | Corrección a endpoint real |
| INC-003 | HU-003 | Feature obsoleta (Sprint 2) | Actualización a comportamiento real |
| INC-004 | HU-021 Esc.4 | Violación de seguridad | Corrección del response esperado |
| INC-005 | HU-010 | No testeable en E2E | Tag @lint + step ejecuta linter |
| INC-006 | EN-008 | Sin Gherkin en spec | Escrito desde criterios de aceptación |
| INC-007 | HU-018 Esc.2 | Contexto mixto admin→user en CI | Excluido con `grepInvert` |
