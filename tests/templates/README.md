# Regresión de las 49 plantillas

Desde la raíz del worktree:

```sh
pnpm install --frozen-lockfile
uv sync --project backend
uv run --project backend python backend/scripts/ova_engine_render.py tests/.ova-rendered --fixtures
pnpm --filter genova-tests exec playwright install --with-deps chromium
pnpm --filter genova-tests test:templates
```

La suite falla si el catálogo deja de contener exactamente 49 fixtures. Usa el
render de producción, incluyendo CSS y Shadow DOM UPAO, y sirve estáticos en
`127.0.0.1:8790`. No requiere backend, frontend, BD o proveedor LLM.

- axe-core analiza cada documento a 1280 y 375 px y de nuevo tras completarlo.
  **No hay excepciones serious/critical ni reglas desactivadas.** Los hallazgos
  moderate/minor quedan adjuntos al informe y no pertenecen al gate solicitado.
- La consola y los errores JavaScript son gates, también después de interactuar.
- Los helpers accionan controles mediante Tab/Enter/Space, flechas y entrada de
  texto de Playwright. No invocan `ovaMark`, `unlock` ni cambian el progreso.
  Drag & drop usa la alternativa accesible de selección/colocación; los timers
  se adelantan con `page.clock`.
- Baselines full-page a 1280 y 375, tolerancia máxima 0.5% de píxeles. Fuentes
  DejaVu y Noto Emoji vendorizadas, seed aleatorio fijo, UTC, fecha fija y reduced-motion.
  La auditoría usa el CSS real; la tipografía de referencia se aplica solo al
  screenshot. Revisar cambios visuales antes de actualizar las referencias:

```sh
pnpm --filter genova-tests test:templates --grep referencias --update-snapshots
```

CI ejecuta cuatro shards independientes con cuatro workers cada uno, sube
trazas, auditorías y reporte HTML siempre, y corta a los diez minutos. Los
paths incluyen plantillas, fixtures, runtime UPAO, fuentes y cambios de la suite.

Para hosts con poca memoria: añadir `--workers=1`. Los servidores lanzados por
Playwright se cierran automáticamente al finalizar normalmente la ejecución.
