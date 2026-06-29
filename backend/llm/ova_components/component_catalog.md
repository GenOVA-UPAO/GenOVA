# UPAO Components Catalog

Custom Elements disponibles en todos los OVAs con tema UPAO.
El script ya está inyectado — úsalos directamente en el HTML.

## upao-card
Contenedor principal con cabecera UPAO.
```html
<upao-card eyebrow="ENGAGE · FASE 1" title="Inteligencia Artificial" icon="🧠">
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
Attrs: `value` `correct` `feedback` `group`
Events: `upao-choice-selected` → `{ value, correct, group }`

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

---

## Ejemplo completo: Quiz de 3 preguntas

```html
<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quiz · Machine Learning</title>
</head><body style="background:#F7F9FC;padding:20px;max-width:700px;margin:0 auto">

<upao-card eyebrow="EVALUATE · QUIZ" title="Machine Learning" icon="🤖">
  <upao-progress id="prog" current="0" total="3" show-fraction label="Respondidas"></upao-progress>

  <div id="q1" style="margin-top:20px">
    <p style="font-weight:600;margin-bottom:10px">1. ¿Qué es Machine Learning?</p>
    <upao-choice value="A" correct="true" feedback="¡Correcto! Es aprendizaje automático." group="q1">Aprendizaje automático</upao-choice>
    <upao-choice value="B" correct="false" feedback="Incorrecto. No es programación manual." group="q1" style="margin-top:8px">Programación manual</upao-choice>
  </div>

  <upao-reveal label="Ver siguiente pregunta" style="margin-top:16px">
    <p style="font-weight:600;margin-bottom:10px">2. ¿Qué tipo de aprendizaje usa etiquetas?</p>
    <upao-choice value="A" correct="true" feedback="¡Sí! Supervisado usa datos etiquetados." group="q2">Supervisado</upao-choice>
    <upao-choice value="B" correct="false" feedback="No supervisado NO usa etiquetas." group="q2" style="margin-top:8px">No supervisado</upao-choice>
  </upao-reveal>

  <div style="margin-top:20px">
    <upao-complete label="Finalizar Quiz →" locked require-progress="3"></upao-complete>
  </div>
</upao-card>

<script>
document.addEventListener('upao-choice-selected', () => {
  document.getElementById('prog').increment();
});
</script>
<!-- SCORM + upao_components.js se inyectan automáticamente -->
</body></html>
```
