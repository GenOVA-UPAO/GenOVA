# OVA-VISUAL — auditoría y verificación sin generaciones

## Alcance

15 recursos originales: cinco de circuitos en `ova4`, cinco de circuitos y cinco
de historia en `ova2`. Renderizados en la sesión `playwright-cli -s=visual`
(Edge), a 1280×800 y 390×800. Se sustituyó exclusivamente el runtime con
`strip_runtime` / `inject_runtime`; el contenido y scripts autorados se conservan.

## Patrones encontrados y solución

| Patrón reimplementado | Evidencia en las muestras | Pieza recomendada |
| --- | --- | --- |
| Badge, título y separador de cabecera | Noticias, simuladores, mapas, quiz y recursos históricos | `upao-header` (único h1) |
| Objetivo inicial, a veces párrafo y otras tarjeta | Ejercicios, simuladores, quiz, caso, línea de tiempo | `upao-objective` |
| Pasos numerados y desarrollo del razonamiento | Ejercicios, noticias, quiz, simuladores | `upao-steps` con ol/li; `upao-node` existente si son expandibles |
| Ejemplo trabajado con cálculos o cadena causal | Circuitos y línea de tiempo/relacionar conceptos | `upao-example` |
| SVG con epígrafe separado | Circuitos, noticias, ejercicios, mapas | `upao-figure` |
| Pregunta, opciones, feedback y contador | Quiz y práctica incorporada a casi todos los tipos | `upao-question` con `upao-choice` existente |
| Síntesis, transferencia y controles finales | Ejercicios, mapas, noticias, cómic y caso | `upao-summary`, slot actions para score/complete |
| Pendiente, en curso, completado y aciertos | Pasos guiados, simuladores, clasificaciones | `upao-status` |
| Tabla de magnitudes o datos históricos | Quiz, simuladores y estudio de caso | table/caption/th y `.ova-table-scroll` |
| Fuentes primarias, citas, código y listas | Historia y ejemplos de circuitos | HTML nativo estilizado en la hoja base |

Se añadieron **8 elementos**, para un total de **21 registrados**. El catálogo
incluye un ejemplo breve y una regla de uso por pieza; el sistema de diseño y su
esqueleto UPAO los recomiendan explícitamente. El modo de layout libre sigue usando
HTML nativo en el esqueleto.

## CSS y compatibilidad

- Ritmo de bloques en `.ova-container` y `.ova-stack`, márgenes de párrafos y
  secciones, sangría de listas y marcadores legibles, jerarquía h4–h6.
- Tablas con encabezados, caption y filas alternas; scroll local enfocable para
  tablas anchas. Citas, código, figuras, details y formularios con estilos base.
- Foco visible conservado en inputs; `[hidden]` respetado también en Shadow DOM.
- Naranja institucional `--accent: #F47A20` conservado para acentos. Nuevos
  `--action: #B84B00` y `--action-hover: #923B00` para botones con texto blanco.
  Success/danger oscurecidos para contraste de texto AA; diez pares de colores
  comprobados automáticamente contra el umbral 4.5:1.
- Tokens CSS heredados con respaldo en los componentes existentes y nuevos.
  Movimiento reducido aplicado dentro de cada Shadow DOM.
- API de componentes existentes conservada. Se corrigió el bloqueo de opciones
  hermanas de `upao-choice`: la consulta anterior buscaba dentro de Shadow DOM
  desde document y no encontraba los botones. Ahora localiza los hosts del mismo
  grupo, acotados a su pregunta, y bloquea una única respuesta. El nombre accesible
  incluye el contenido de la opción, no solamente «Opción A».

## Comparativa visual

**60 capturas** de muestras (15 × antes/después × dos anchos), más cuatro de la
galería nueva. Todas están en `backend/tests/visual-output/` (artefactos ignorados
por git, reproducibles con el script). Convención:

`{ova2|ova4}-{nombre-original}-{before|after}-{1280|390}.png`

| Comparativa | Antes | Después |
| --- | --- | --- |
| Noticia: separación entre caso, objetivo, ejemplo y práctica; CTA con contraste | [antes](visual-output/ova4-engage-6-before-1280.png) | [después](visual-output/ova4-engage-6-after-1280.png) |
| Ejercicio: objetivo separado del circuito, pasos y práctica con ritmo, cierre más legible | [antes](visual-output/ova4-elaborate-2-before-1280.png) | [después](visual-output/ova4-elaborate-2-after-1280.png) |
| Estudio de caso móvil: se elimina overflow horizontal y la tabla permanece legible | [antes](visual-output/ova2-hist-elaborate-1-before-390.png) | [después](visual-output/ova2-hist-elaborate-1-after-390.png) |
| Relacionar conceptos móvil: se elimina overflow y se mantienen columnas apiladas | [antes](visual-output/ova2-hist-evaluate-6-before-390.png) | [después](visual-output/ova2-hist-evaluate-6-after-390.png) |
| Quiz móvil: ejemplo, tabla y práctica separados | [antes](visual-output/ova4-evaluate-1-before-390.png) | [después](visual-output/ova4-evaluate-1-after-390.png) |
| Mapa conceptual: listas de resolución y síntesis con mejor sangría | [antes](visual-output/ova4-explain-3-before-1280.png) | [después](visual-output/ova4-explain-3-after-1280.png) |
| Simulador móvil: componentes existentes heredan tipografía y acciones contrastadas | [antes](visual-output/ova4-explore-6-before-390.png) | [después](visual-output/ova4-explore-6-after-390.png) |

Resultado medido: **0/15 recursos con overflow horizontal después a 390 px**,
frente a **2/15 antes**. A 1280 px, cero antes y después. No aparecen nuevos errores
JavaScript. `ova2/hist-explain-7.html` ya contiene `Unexpected end of input` en su
script autorado y lo conserva tras reinyectar; su interacción requiere reparación
del contenido original, no de la biblioteca.

Reinyectar no convierte automáticamente el HTML original en las nuevas etiquetas.
La galería manual `fixtures/ova-visual.html`, sin CSS propio, verifica su composición:

- [Escritorio](visual-output/components-1280.png)
- [Móvil](visual-output/components-390.png)
- [320 px](visual-output/components-320.png)
- [Respuesta y finalización por teclado](visual-output/components-answered-320.png)

## Pruebas y reproducción

Desde `backend/`:

```sh
python -m tests.prepare_ova_visual
ruff check
ruff format --check
lint-imports
LLM_FAKE=1 BASE=http://localhost:8100 pytest -q
```

Desde la raíz:

```sh
playwright-cli -s=visual open about:blank --browser msedge
playwright-cli -s=visual run-code --filename=backend/tests/visual-output/compare.js
playwright-cli -s=visual run-code --filename=backend/tests/visual-output/browser-test.js
```

En este entorno Windows/WSL se usó `.venv/Scripts/python.exe` y, al faltar
dependencias dev en el entorno compartido, `cmd.exe /c "uv run --no-sync --with …"`
para ejecutar las herramientas con dependencias temporales, sin cambiar manifests.

Resultados:

- `ruff check`: **OK**, backend completo.
- `ruff format --check`: **78 archivos preexistentes pendientes de formato**;
  los cuatro archivos Python de esta tarea pasan el check específico.
- `lint-imports`: **41 contratos conservados, 0 rotos**.
- `pytest`: **497 passed**, 163 avisos de deprecación. Al cerrar apareció además
  un error de telemetría LangSmith (403 / cierre del intérprete), después de que
  pytest terminase correctamente.
- Navegador: **OK** en 1280/390/320 px; teclado Enter/Espacio, foco, feedback,
  bloqueo por pregunta, puntuación, finalización sin LMS, slots, atributos escapados,
  tokens heredados, estado inválido, hidden, CSS y prefers-reduced-motion.

No se ejecutaron generaciones de OVA ni se hicieron commits.
