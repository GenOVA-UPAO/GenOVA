# UPAO Components Catalog

Custom Elements disponibles en todos los OVAs con tema UPAO.
El script ya está inyectado — úsalos directamente en el HTML.
No escribas su CSS/JS. Atributos = texto plano; contenido rico = HTML dentro del elemento.
Los componentes heredan los tokens --primary, --font-body, etc. de la hoja base.
Un solo h1: elige `upao-header` O `upao-card title`, no ambos.

## upao-header
Cabecera única del recurso (h1); eyebrow indica tipo de actividad, nunca fase 5E.
`<upao-header eyebrow="SIMULADOR" title="Ley de Ohm"><p>Explora cómo cambia la corriente.</p></upao-header>`

## upao-objective
Objetivo inicial, una frase observable. Encabezado h2 automático.
`<upao-objective>Al terminar podrás calcular I a partir de V y R.</upao-objective>`

## upao-steps
Secuencia visible, siempre con `ol/li` (conserva semántica de lista). Para pasos desplegables usa upao-node.
`<upao-steps><ol><li>Reduce el paralelo.</li><li>Suma la resistencia en serie.</li></ol></upao-steps>`

## upao-example
Ejemplo resuelto ANTES de la práctica. `title` opcional (h2); muestra razonamiento, no solo respuesta.
`<upao-example title="Ejemplo trabajado"><upao-steps><ol><li>V = 12 V, R = 6 Ω.</li><li>I = V/R = 2 A.</li></ol></upao-steps></upao-example>`

## upao-figure
Envuelve una imagen o SVG propio con epígrafe `caption`. SVG con title/desc o img con alt obligatorio.
`<upao-figure caption="Figura 1. Circuito de 12 V."><img src="__IMG_1__" alt="Fuente de 12 V conectada a una resistencia de 6 Ω"></upao-figure>`

## upao-question
Una pregunta por fieldset, enunciado `prompt`, `number` opcional. Usa upao-choice dentro y group único por pregunta.
`<upao-question number="1" prompt="¿Qué corriente circula?"><upao-choice group="q1" value="A" correct="true" feedback="I = 12/6 = 2 A.">2 A</upao-choice><upao-choice group="q1" value="B" correct="false" feedback="Divide V entre R; no los multipliques.">72 A</upao-choice></upao-question>`
Una sola respuesta por grupo; evento upao-choice-selected. El recurso decide puntuación y avance.

## upao-summary
Cierre: síntesis o transferencia. `title` opcional (h2); slot `actions` para score, progreso o finalizar.
`<upao-summary>En serie se conserva la corriente.<upao-score slot="actions" id="score" max="3"></upao-score><upao-complete slot="actions" locked></upao-complete></upao-summary>`
Actualizar score/unlock desde la lógica del recurso; el contenedor no completa SCORM por sí solo.

## upao-status
Chip de estado con texto + icono, anunciado al cambiar. `state`: info (default), success, warning, error.
`<upao-status state="success">Paso 2 completado</upao-status>`
Actualiza `state` con setAttribute y el texto con textContent; no representa un botón.

## HTML nativo ya estilizado
Tablas: caption + th scope; envuelve tablas anchas para scroll local accesible:
`<div class="ova-table-scroll" role="region" aria-label="Mediciones" tabindex="0"><table><caption>Mediciones (V)</caption><tr><th scope="col">Entrada</th><th scope="col">Salida</th></tr><tr><td>12</td><td>6</td></tr></table></div>`
Listas ul/ol, citas blockquote/cite, código pre/code y details/summary no necesitan componentes nuevos.
`.ova-container` limita ancho; `.ova-stack` separa bloques; `.ova-card` agrupa secciones sin otro h1.

## upao-card
Contenedor principal con cabecera UPAO.
```html
<upao-card eyebrow="INTRODUCCIÓN" title="Inteligencia Artificial" icon="🧠">
  <p>Contenido aquí</p>
</upao-card>
```
Attrs: `eyebrow` `title` `subtitle` `icon`

## upao-node
Nodo expandible (timelines, mapas, pasos numerados).
```html
<upao-node number="1" title="Turing Test" label="1950" expanded>
  Alan Turing propuso la primera prueba de inteligencia artificial...
</upao-node>
```
Attrs: `number` `title` `label` `year` `expanded`
Events: `upao-node-toggle` → `{ open, title }`

## upao-choice
Opción de respuesta con feedback correcto/incorrecto.
```html
<upao-choice value="A" correct="true" feedback="¡Correcto!" group="q1">
  Machine Learning es aprendizaje automático
</upao-choice>
<upao-choice value="B" correct="false" feedback="Incorrecto. ML ≠ programación manual." group="q1">
  Machine Learning es programación manual
</upao-choice>
```
Attrs: `value` `correct` `feedback` `group` `disabled` (booleano inicial)
Events: `upao-choice-selected` → `{ value, correct, group }`
La selección bloquea su grupo; feedback explica por qué. Operable con Enter/Espacio.

## upao-reveal
Contenido oculto que se revela al hacer clic.
```html
<upao-reveal label="Ver respuesta" icon="💡">
  La respuesta correcta es: aprendizaje supervisado.
</upao-reveal>
```
Attrs: `label` `icon` `trigger-id`
Methods: `.reveal()` `.hide()` `.toggle()`

## upao-progress
Barra de progreso con contador y puntos.
```html
<upao-progress id="prog" current="0" total="5" label="Progreso" show-fraction></upao-progress>
```
Attrs: `current` `total` `label` `show-fraction`
Methods: `.set(n)` `.increment()`
Events: `upao-progress-complete`

## upao-timer
Cronómetro regresivo.
```html
<upao-timer id="tmr" seconds="30" label="Tiempo restante"></upao-timer>
<script>document.getElementById('tmr').start();</script>
```
Attrs: `seconds` `autostart` `label`
Methods: `.start()` `.stop()` `.reset()`
Events: `upao-timer-tick` → `{ remaining }` | `upao-timer-end`

## upao-score
Puntuación animada.
```html
<upao-score id="sc" current="0" max="100" label="Puntuación"></upao-score>
<script>document.getElementById('sc').add(10);</script>
```
Attrs: `current` `max` `label`
Methods: `.set(n)` `.add(n)`

## upao-nav
Navegación prev/next con puntos de paso.
```html
<upao-nav id="nav" total="4" current="1"></upao-nav>
<script>
  document.getElementById('nav').addEventListener('upao-nav-change', e => {
    document.querySelectorAll('.step').forEach((el,i) => el.hidden = i !== e.detail.index-1);
  });
</script>
```
Attrs: `total` `current` `prev-label` `next-label`
Methods: `.go(n)` `.next()` `.prev()`
Events: `upao-nav-change` → `{ index, prev }`

## upao-comic-panel
Panel de viñeta de cómic.
```html
<upao-comic-panel number="1" character="Max" img-src="__IMG_1__" img-alt="Robot pensativo">
  ¿Sabes cuántos datos necesita aprender una IA?
</upao-comic-panel>
```
Attrs: `number` `character` `img-src` `img-alt` `bubble-side` (left|right)

## upao-podcast
Reproductor de audio con onda animada.
```html
<upao-podcast
  src="data:audio/wav;base64,..."
  concept="Machine Learning"
  transcript="Imagina que eres un chef...">
</upao-podcast>
```
Attrs: `src` `concept` `transcript`
Events: `upao-podcast-complete`

## upao-drag-item + upao-drop-zone
Drag & drop con feedback visual.
```html
<upao-drag-item item-id="ml" category="supervisado">Regresión Lineal</upao-drag-item>
<upao-drop-zone zone-id="z1" accepts="supervisado" label="Aprendizaje Supervisado"></upao-drop-zone>
```
Events: `upao-drop` → `{ itemId, itemCat, zoneId, correct }`
Methods: `.matched()` `.wrong()` (en drag-item)

## upao-complete
Botón de finalización SCORM.
```html
<!-- Simple -->
<upao-complete label="Continuar →"></upao-complete>

<!-- Bloqueado hasta completar progreso -->
<upao-progress id="prog" current="0" total="3" show-fraction></upao-progress>
<upao-complete label="Finalizar" locked require-progress="3"></upao-complete>
```
Attrs: `label` `locked` `require-progress`
Methods: `.unlock()`
Events: `upao-completed` + llama `_scormComplete()` automáticamente
