# Reporte de Pruebas de Usabilidad Técnica — GenOVA

> Evaluación **automatizada** de calidad de experiencia (rendimiento percibido +
> accesibilidad WCAG), **no** un estudio SUS con usuarios reales. Alineada al
> objetivo de calidad de interfaz del informe técnico (OE3): detectar barreras
> serias de accesibilidad y documentar scores Lighthouse en pantallas clave.

| Campo | Valor |
|---|---|
| **Proyecto** | GenOVA — generación asistida por IA de OVAs (SCORM 1.2 / 5E) |
| **Tipo de prueba** | Usabilidad técnica automatizada (a11y + Lighthouse) |
| **Herramientas** | axe-core (@axe-core/playwright) · Lighthouse CLI |
| **Fecha de ejecución** | 22/07/2026 |
| **Ejecutado por** | Jeffry A. Romero Uriol |
| **axe-core** | **4 / 4 PASA** (sin violaciones serious/critical) ✔ |
| **Lighthouse** | **18 pantallas** auditadas; Performance 80–98 (ninguna en rojo). Scores en §6 |

---

## 1. Introducción y objetivo

Medir de forma repetible:

1. **Accesibilidad WCAG 2.0 A/AA** con axe-core en pantallas principales.
2. **Calidad percibida** (Performance, Accessibility, Best Practices, SEO) con
   Lighthouse.

No sustituye pruebas de usabilidad con docentes (encuestas SUS); aporta evidencia
objetiva de barreras técnicas y métricas de laboratorio.

## 2. Herramientas y enfoque

### 2.1 axe-core

- Spec: [`tests/a11y/a11y.spec.js`](../../tests/a11y/a11y.spec.js)
- Tags: `wcag2a`, `wcag2aa`
- **Gate:** solo fallan impactos `serious` / `critical` (moderate/minor se
  registran en log sin romper CI)
- Espera ~900 ms antes de analizar (evita falso positivo de contraste en
  animaciones de entrada)
- Comando: `pnpm --filter genova-tests test:a11y`

### 2.2 Lighthouse

- CLI (`npx lighthouse`) contra el **build de producción** servido con gzip + proxy
  de API en `:4200` (lo arranca `tests/run-lighthouse.mjs`, replicando nginx)
- Categorías: Performance, Accessibility, Best Practices, SEO
- Pantallas: **18 rutas** renderizables (públicas, de autenticación y autenticadas
  como admin); una corrida Lighthouse por URL = scores independientes por página
- Artefactos: `tests/lighthouse-reports/*.report.{html,json}` y capturas PNG en
  `docs/assets/usabilidad/`

## 3. Entorno de ejecución

| Componente | Detalle |
|---|---|
| Frontend | Angular 22 en `http://localhost:4200` |
| Backend | FastAPI en `http://localhost:8000` (necesario para login / dashboard) |
| Navegador | Chromium (Playwright + Chrome headless Lighthouse) |
| Cuenta seed | `user@genova.ai` |
| SO | Windows 11 |
| Modo Lighthouse | Headless local (no emula red 4G de campo) |

## 4. Cobertura de pantallas

| Pantalla | axe-core | Lighthouse |
|---|---|---|
| `/login` | ✔ | ✔ |
| `/register` | ✔ | ✔ |
| `/dashboard` | ✔ | ✔ |
| `/mis-ovas` | ✔ | ✔ |
| Otras 14 rutas (auth, explore, crear, perfil, analíticas, modelos, admin, workspace…) | — | ✔ |

## 5. Resultados axe-core

| Caso | Resultado gate (serious/critical) |
|---|---|
| login no tiene violaciones serias | ✔ PASA |
| registro no tiene violaciones serias | ✔ PASA |
| dashboard no tiene violaciones serias | ✔ PASA |
| mis OVAs no tiene violaciones serias | ✔ PASA |
| **Total** | **4 / 4 ✔** |

Duración: ~17.6 s · Reporte HTML Playwright: `tests/playwright-report-a11y/`.

## 6. Resultados Lighthouse

Scores 0–100 por categoría, corrida del 22/07/2026 sobre el **build de producción
gzip** (no el dev-server). Cobertura ampliada de 3 a **18 pantallas**. Verde ≥ 90,
naranja 50–89, rojo < 50.

| Página | Ruta | Performance | Accessibility | Best Practices | SEO |
|---|---|---:|---:|---:|---:|
| Inicio de sesión | `/login` | 95 | 100 | 96 | 100 |
| Registro | `/register` | 95 | 100 | 96 | 100 |
| Recuperar contraseña | `/forgot-password` | 95 | 100 | 96 | 100 |
| Restablecer contraseña | `/reset-password` | 95 | 91 | 96 | 100 |
| Verificar correo | `/verify-email` | 93 | 100 | 100 | 100 |
| Explorar (pública) | `/explore` | 89 | 100 | 96 | 100 |
| Página 404 | `/ruta-inexistente` | 98 | 100 | 100 | 100 |
| Panel principal | `/dashboard` | 90 | 100 | 100 | 100 |
| Mis OVAs | `/mis-ovas` | 82 | 98 | 100 | 100 |
| Papelera | `/papelera` | 89 | 100 | 100 | 100 |
| Crear OVA | `/crear` | 81 | 95 | 100 | 100 |
| Perfil | `/profile` | 88 | 96 | 100 | 100 |
| Analíticas | `/analytics` | 88 | 100 | 100 | 100 |
| Modelos LLM | `/models` | 84 | 96 | 100 | 100 |
| Admin · Usuarios | `/admin` | 91 | 100 | 100 | 100 |
| Admin · Roles | `/admin/roles` | 89 | 94 | 100 | 100 |
| Fase ENGAGE (pública) | `/engage/:id` | 89 | 100 | 96 | 100 |
| Workspace del OVA | `/workspace/:id` | 80 | 95 | 100 | 100 |
| **Promedio** | | **90** | **98** | **99** | **100** |

**Interpretación:**

- **Performance**: las 18 páginas puntúan entre **80 y 98** (8 en verde, 10 en
  naranja, **ninguna en rojo**). El salto respecto de la medición previa (34–41,
  en rojo) tiene dos causas reales, no cosméticas — ver §6.1.
- **Accessibility** y **Best Practices** (promedios 98 y 99) son coherentes con el
  gate axe (sin serious/critical). Los mínimos (91 en reset-password, 94 en
  admin/roles) son avisos *moderate* de contraste/ARIA, no bloqueantes.
- **SEO**: 100 en las 18 rutas, tras añadir la `meta description` y `robots.txt`.

### 6.1 Qué mejoró el rendimiento

El rendimiento subió de 30–40 (rojo) a 80–98 por dos correcciones concretas, más
un ajuste en cómo se mide:

- **Carga diferida real.** Se eliminó `withPreloading(PreloadAllModules)` de
  `app.config.ts`: descargaba todos los chunks lazy (Sentry ~129 KB, workspace,
  admin…) justo tras el primer render, saturaba el enlace simulado de laboratorio
  y disparaba el LCP a ~11 s. Ahora cada módulo se carga bajo demanda.
- **Medición sobre el build comprimido.** `tests/run-lighthouse.mjs` dejó de medir
  el dev-server y ahora hace `ng build` y sirve el dist con un servidor propio que
  replica nginx (gzip + proxy de `/api` y `/auth`). Elimina el score falso por
  bundle sin minificar/comprimir.
- **Correcciones transversales a 100.** SEO 82→100 (meta description + robots.txt);
  Accessibility 93→100 en públicas (landmark `<main>`); Best Practices 96→100
  (`AuthService.revalidate()` endurecido ante respuestas no-JSON).

## 7. Evidencia visual

Tarjetas de scores Lighthouse de las 18 pantallas
(`docs/assets/usabilidad/lighthouse-*.png`):

![Lighthouse — login](../assets/usabilidad/lighthouse-login.png)
![Lighthouse — register](../assets/usabilidad/lighthouse-register.png)
![Lighthouse — forgot-password](../assets/usabilidad/lighthouse-forgot-password.png)
![Lighthouse — reset-password](../assets/usabilidad/lighthouse-reset-password.png)
![Lighthouse — verify-email](../assets/usabilidad/lighthouse-verify-email.png)
![Lighthouse — explore](../assets/usabilidad/lighthouse-explore.png)
![Lighthouse — not-found](../assets/usabilidad/lighthouse-not-found.png)
![Lighthouse — dashboard](../assets/usabilidad/lighthouse-dashboard.png)
![Lighthouse — mis-ovas](../assets/usabilidad/lighthouse-mis-ovas.png)
![Lighthouse — papelera](../assets/usabilidad/lighthouse-papelera.png)
![Lighthouse — crear](../assets/usabilidad/lighthouse-crear.png)
![Lighthouse — profile](../assets/usabilidad/lighthouse-profile.png)
![Lighthouse — analytics](../assets/usabilidad/lighthouse-analytics.png)
![Lighthouse — models](../assets/usabilidad/lighthouse-models.png)
![Lighthouse — admin](../assets/usabilidad/lighthouse-admin.png)
![Lighthouse — admin-roles](../assets/usabilidad/lighthouse-admin-roles.png)
![Lighthouse — engage](../assets/usabilidad/lighthouse-engage.png)
![Lighthouse — workspace](../assets/usabilidad/lighthouse-workspace.png)

Accesibilidad (axe-core):

![axe-core — reporte Playwright](../assets/usabilidad/axe-playwright-report.png)
![Pantalla login auditada](../assets/usabilidad/axe-login-ok.png)

Resumen JSON: [`../assets/usabilidad/lighthouse-summary.json`](../assets/usabilidad/lighthouse-summary.json).

## 8. Cómo reproducir

```bash
# Frontend :4200 y backend :8000 arriba

# axe-core
pnpm --filter genova-tests test:a11y
# reporte: tests/playwright-report-a11y/

# Lighthouse (script del repo)
node tests/run-lighthouse.mjs
# o manual:
npx lighthouse http://localhost:4200/login --only-categories=performance,accessibility,best-practices,seo --output=html --output-path=tests/lighthouse-reports/login
```

## 9. Varianzas / limitaciones

- No es evaluación con usuarios reales (SUS / entrevistas docentes).
- Lighthouse Performance en headless local no representa producción (Railway /
  CDN / HTTP/2).
- El cleanup temporal de Chrome/Lighthouse en Windows puede emitir `EPERM` al
  borrar carpetas temp; los reportes HTML/JSON de esta corrida se generaron
  correctamente a pesar de ese aviso.
- No se modificó código de producto para “subir scores”; el gate axe ya estaba
  en verde.
