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
| **Fecha de ejecución** | 18/07/2026 |
| **Ejecutado por** | Jeffry A. Romero Uriol |
| **axe-core** | **4 / 4 PASA** (sin violaciones serious/critical) ✔ |
| **Lighthouse** | Scores documentados en §6 |

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

- CLI (`npx lighthouse`) contra frontend en `:4200`
- Categorías: Performance, Accessibility, Best Practices, SEO
- Pantallas: `/login`, `/register`, `/dashboard` (autenticado con cookie seed)
- Artefactos: `tests/lighthouse-reports/*.report.{html,json}`

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
| `/mis-ovas` | ✔ | — (misma app autenticada; axe cubre biblioteca) |

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

Scores 0–100 (categoría × score × 100), corrida headless local 18/07/2026:

| Página | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/login` | 41 | 98 | 96 | 90 |
| `/register` | 34 | 98 | 96 | 90 |
| `/dashboard` | 36 | 100 | 100 | 90 |

**Interpretación:**

- **Accessibility** y **Best Practices** están altos (≥ 96), coherente con el
  gate axe (sin serious/critical).
- **Performance** en 30–40 es típico de SPA Angular en lab local (hidratación,
  bundles, sin CDN/producción). No se optimizó la app para subir el score en
  esta tarea (fuera de alcance del plan).
- **SEO** ~90 en rutas de app autenticada / formularios (esperado; no son
  landing pages de marketing).

## 7. Evidencia visual

![Lighthouse — login](../assets/usabilidad/lighthouse-login.png)

![Lighthouse — register](../assets/usabilidad/lighthouse-register.png)

![Lighthouse — dashboard](../assets/usabilidad/lighthouse-dashboard.png)

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
