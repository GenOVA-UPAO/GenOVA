"""EXPLORE 1 — Simulador Virtual Lab: laboratorio interactivo del mecanismo interno de un tema.

El LLM describe el mecanismo como datos —componentes con estado, contadores y
acciones que cambian ese estado— y la plantilla lo anima. Así el laboratorio
encaja con cualquier tema del curso (índices B-tree, buffer cache, bloqueos,
redo, optimizador…) en vez de simular siempre el mismo mecanismo.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param(
        "num_iterations",
        3,
        min=2,
        max=5,
        help="Número de iteraciones mínimas del laboratorio",
    ),
)


def schema(p: dict) -> dict:
    return obj(
        titulo=s(70),
        objetivo=s(160),
        concepto_mecanismo=s(200),
        componentes=arr(obj(nombre=s(30), estado_inicial=s(40)), 3, 4),
        metricas=arr(obj(nombre=s(30), inicial=i(minimum=0)), 2, 3),
        controles=arr(
            obj(
                id=s(20),
                accion=s(50),
                descripcion=s(140),
                componente=i(minimum=1),
                nuevo_estado=s(40),
                cambios=arr(i(), 2, 3),
                resultado=s(180),
            ),
            2,
            4,
        ),
        ejemplo_trabajado=s(250),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p.get("num_iterations", 3)
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador de laboratorios virtuales y simulaciones de mecanismos internos de bases de datos.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Modela el mecanismo interno de «{concept}» como un pequeño sistema que el estudiante manipula: unos componentes con estado, unos contadores observables y acciones que los cambian. El estudiante hará al menos {n} acciones. Todo debe ser técnicamente correcto{d.si_oracle(" para Oracle", "")} y propio de «{concept}» (no uses caché, redo, transacciones o bloqueos salvo que sean el tema).
- titulo: título conciso del laboratorio (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras).
- concepto_mecanismo: explicación concisa del mecanismo y cómo responde a las acciones (≤35 palabras).
- componentes: 3 o 4 partes del mecanismo que cambian de estado (ej. para un índice B-tree: "Nodo raíz", "Nodo rama", "Bloque hoja", "Tabla"). Por cada uno:
  * `nombre`: nombre corto (≤4 palabras).
  * `estado_inicial`: estado de partida en pocas palabras (ej. "Sin leer", "Vacío", "Libre").
- metricas: 2 o 3 contadores enteros que el estudiante ve cambiar (ej. "Bloques leídos", "Filas devueltas", "Costo estimado"). Por cada uno: `nombre` (≤4 palabras) e `inicial` (entero ≥ 0, normalmente 0).
- controles: entre 2 y 4 acciones distintas. Por cada una:
  * `id`: identificador en minúsculas sin espacios (≤15 caracteres).
  * `accion`: texto del botón (≤6 palabras, ej. "Buscar con el índice").
  * `descripcion`: qué hará la acción (≤22 palabras).
  * `componente`: número (1, 2, 3 o 4) del componente de `componentes` cuyo estado cambia.
  * `nuevo_estado`: estado que toma ese componente (≤5 palabras, ej. "Leído", "Dividido en dos").
  * `cambios`: lista de enteros, uno por cada contador de `metricas` y en el mismo orden, con lo que suma o resta la acción (ej. [3, 1] o [0, -2]). Usa magnitudes realistas y coherentes entre acciones para que la comparación enseñe algo.
  * `resultado`: qué ocurrió y por qué, como lo vería el estudiante (≤30 palabras).
- ejemplo_trabajado: recorrido guiado de una iteración típica y su efecto en los contadores (≤40 palabras).
- sintesis: idea clave que el estudiante debe llevarse tras comparar las acciones (≤40 palabras).
[RESTRICCIONES] Dinámica causa-efecto concreta y verificable. Sin fórmulas abstractas. Tono riguroso pero accesible.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador de laboratorios virtuales y simulaciones de mecanismos internos de «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Modela el mecanismo interno de «{concept}» como un pequeño sistema que el estudiante manipula: unos componentes con estado, unos contadores observables y acciones que los cambian. El estudiante hará al menos {n} acciones. Todo debe ser correcto y propio de «{concept}» (no uses mecanismos de otros temas salvo que sean el tema).
- titulo: título conciso del laboratorio (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras).
- concepto_mecanismo: explicación concisa del mecanismo y cómo responde a las acciones (≤35 palabras).
- componentes: 3 o 4 partes del mecanismo que cambian de estado (ej. para el ciclo del agua: "Océano", "Nube", "Lluvia", "Río"). Por cada uno:
  * `nombre`: nombre corto (≤4 palabras).
  * `estado_inicial`: estado de partida en pocas palabras (ej. "Sin leer", "Vacío", "Libre").
- metricas: 2 o 3 contadores enteros que el estudiante ve cambiar (ej. "Litros evaporados", "Pasos realizados", "Energía usada"). Por cada uno: `nombre` (≤4 palabras) e `inicial` (entero ≥ 0, normalmente 0).
- controles: entre 2 y 4 acciones distintas. Por cada una:
  * `id`: identificador en minúsculas sin espacios (≤15 caracteres).
  * `accion`: texto del botón (≤6 palabras, ej. "Calentar el agua").
  * `descripcion`: qué hará la acción (≤22 palabras).
  * `componente`: número (1, 2, 3 o 4) del componente de `componentes` cuyo estado cambia.
  * `nuevo_estado`: estado que toma ese componente (≤5 palabras, ej. "Leído", "Dividido en dos").
  * `cambios`: lista de enteros, uno por cada contador de `metricas` y en el mismo orden, con lo que suma o resta la acción (ej. [3, 1] o [0, -2]). Usa magnitudes realistas y coherentes entre acciones para que la comparación enseñe algo.
  * `resultado`: qué ocurrió y por qué, como lo vería el estudiante (≤30 palabras).
- ejemplo_trabajado: recorrido guiado de una iteración típica y su efecto en los contadores (≤40 palabras).
- sintesis: idea clave que el estudiante debe llevarse tras comparar las acciones (≤40 palabras).
[RESTRICCIONES] Dinámica causa-efecto concreta y verificable. Sin fórmulas abstractas. Tono riguroso pero accesible.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.lab-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px; }
.lab-layout { display:grid; grid-template-columns:1fr; gap:20px; margin-top:16px; }
@media (min-width: 920px) { .lab-layout { grid-template-columns: 300px 1fr; align-items:start; } }
.lab-controls { display:flex; flex-direction:column; gap:10px; }
.lab-control { background:var(--surface-2,#f8fafc); border:1px solid var(--border,#e2e8f0); border-radius:var(--radius,10px); padding:12px; display:flex; flex-direction:column; gap:6px; }
.ova-action-btn { width:100%; min-height:44px; font-weight:600; text-align:left; cursor:pointer; background:var(--primary,#0A3D91); color:#fff; border:none; border-radius:var(--radius,8px); padding:8px 12px; display:flex; align-items:center; gap:8px; }
.ova-action-btn:hover { filter:brightness(1.1); }
.lab-control p { font-size:0.825rem; line-height:1.4; margin:0; }
.lab-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-block:14px 16px; }
.lab-metric { background:var(--surface-2,#f8fafc); border:1px solid var(--border,#e2e8f0); border-radius:var(--radius,8px); padding:10px 12px; text-align:center; }
.lab-metric-val { display:block; font-size:1.3rem; font-weight:700; color:var(--primary,#0A3D91); font-variant-numeric:tabular-nums; }
.lab-metric-label { display:block; font-size:0.75rem; color:var(--text-muted,#64748b); text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
.lab-diagram { display:flex; flex-direction:column; gap:12px; min-width:0; }
.lab-components { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
.lab-comp { margin:0; border:2px solid var(--border,#e2e8f0); border-radius:var(--radius,10px); padding:12px; background:var(--surface,#fff); transition:border-color .2s, background .2s; }
.lab-comp[data-active="true"] { border-color:var(--primary,#0A3D91); background:var(--surface-2,#eef4ff); }
.lab-comp-name { display:block; font-weight:700; font-size:0.9rem; }
.lab-comp-state { display:inline-block; margin-top:6px; font-size:0.78rem; font-weight:600; padding:2px 8px; border-radius:999px; background:var(--surface-2,#f1f5f9); color:var(--text,#1e293b); }
.lab-log { list-style:none; padding:8px 12px; margin:0; max-height:120px; overflow-y:auto; font-size:0.8rem; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; background:var(--surface-2,#f8fafc); border:1px solid var(--border,#e2e8f0); border-radius:var(--radius,8px); display:flex; flex-direction:column; gap:4px; }
.lab-log li { padding-block:2px; border-bottom:1px dashed var(--border,#e2e8f0); color:var(--text,#1e293b); }
@media (prefers-reduced-motion: reduce) { .lab-comp { transition:none; } }
</style>
"""

_LAB_JS = """
(function () {
  const data = JSON.parse(document.getElementById('ova-data').textContent);
  const comps = data.componentes || [];
  const mets = data.metricas || [];
  const ctrls = data.controles || [];
  const progEl = document.getElementById('prog');
  const total = progEl ? parseInt(progEl.getAttribute('total') || '3', 10) : 3;
  const statusEl = document.getElementById('lab-status');
  const iterBadge = document.getElementById('iter-badge');
  const logEl = document.getElementById('lab-log');
  let states, values, done;

  function clampComp(n) {
    const idx = (parseInt(n, 10) || 1) - 1;
    return Math.min(Math.max(idx, 0), comps.length - 1);
  }

  function reset() {
    states = comps.map(function (c) { return c.estado_inicial; });
    values = mets.map(function (m) { return parseInt(m.inicial, 10) || 0; });
    done = 0;
    paint(-1);
  }

  function paint(active) {
    comps.forEach(function (_, i) {
      const el = document.getElementById('lab-comp-' + i);
      if (!el) return;
      el.setAttribute('data-active', i === active ? 'true' : 'false');
      el.querySelector('.lab-comp-state').textContent = states[i];
    });
    mets.forEach(function (_, j) {
      const el = document.getElementById('lab-metric-' + j);
      if (el) el.textContent = String(values[j]);
    });
    if (iterBadge) iterBadge.textContent = 'Iteración: ' + Math.min(done, total) + ' de ' + total;
  }

  function log(text) {
    if (!logEl) return;
    const li = document.createElement('li');
    li.textContent = '[' + String(done).padStart(2, '0') + '] ' + text;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function run(k) {
    const c = ctrls[k];
    if (!c) return;
    const ci = clampComp(c.componente);
    states[ci] = c.nuevo_estado;
    mets.forEach(function (_, j) {
      const delta = parseInt((c.cambios || [])[j], 10) || 0;
      values[j] = Math.max(0, values[j] + delta);
    });
    done++;
    if (done <= total) window.ovaMark('iter-' + done);
    paint(ci);
    log(c.accion + ' → ' + c.resultado);
    if (statusEl) {
      if (done >= total) {
        statusEl.setAttribute('state', 'success');
        statusEl.textContent = '¡Meta completada (' + total + ' iteraciones)! ' + c.resultado + ' Revisa la síntesis para continuar.';
      } else {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = c.resultado;
      }
    }
  }

  document.querySelectorAll('.ova-action-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { run(parseInt(btn.getAttribute('data-idx') || '0', 10)); });
  });
  const resetBtn = document.getElementById('btn-reset-lab');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      const keep = done;
      reset();
      done = keep;
      paint(-1);
      log('Estado visual reiniciado (tu progreso se conserva).');
      if (statusEl) {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = 'Estado reiniciado. Vuelve a ejecutar las acciones y compara los contadores.';
      }
    });
  }
  reset();
})();
"""

_ICONS = ("▲", "◆", "■", "●")


def render(data: dict, ctx: RenderContext) -> str:
    total = ctx.params.get("num_iterations", 3) if ctx and ctx.params else 3
    # Jev decide las iteraciones y el LLM las acciones: sin tope, con 4 acciones y 5
    # iteraciones el estudiante debía repetir una para poder finalizar.
    total = max(1, min(total, len(data["controles"])))

    comps_html = "".join(
        f'<li class="lab-comp" id="lab-comp-{n}" data-active="false">'
        f'<span class="lab-comp-name">{esc(c["nombre"])}</span>'
        f'<span class="lab-comp-state">{esc(c["estado_inicial"])}</span></li>'
        for n, c in enumerate(data["componentes"])
    )
    metrics_html = "".join(
        f'<div class="lab-metric"><span class="lab-metric-val" id="lab-metric-{n}">{int(m.get("inicial", 0) or 0)}</span>'
        f'<span class="lab-metric-label">{esc(m["nombre"])}</span></div>'
        for n, m in enumerate(data["metricas"])
    )
    controls_html = "".join(
        f'<div class="lab-control">'
        f'<button type="button" class="ova-action-btn" data-idx="{n}">'
        f'<span aria-hidden="true">{_ICONS[n % len(_ICONS)]}</span><span>{esc(c["accion"])}</span></button>'
        f'<p class="ova-muted">{esc(c["descripcion"])}</p></div>'
        for n, c in enumerate(data["controles"])
    )

    return f"""{_STYLE}
<upao-header eyebrow="SIMULADOR VIRTUAL LAB" title="{esc(data["titulo"])}">
  <p>{esc(data["concepto_mecanismo"])}</p>
</upao-header>

<upao-objective>{esc(data["objetivo"])}</upao-objective>

<upao-example title="Ejemplo trabajado de referencia">
  <p>{esc(data["ejemplo_trabajado"])}</p>
</upao-example>

<upao-progress id="prog" current="0" total="{total}" label="Progreso del laboratorio" show-fraction></upao-progress>

<section class="ova-card">
  <div class="lab-head">
    <h2>Simulación interactiva del mecanismo</h2>
    <span class="ova-badge" id="iter-badge">Iteración: 0 de {total}</span>
  </div>
  <upao-status id="lab-status" state="info" aria-live="polite">Laboratorio listo. Ejecuta una acción y observa qué cambia.</upao-status>

  <div class="lab-metrics">{metrics_html}</div>

  <div class="lab-layout">
    <div class="lab-controls">
      <h3>Acciones del laboratorio</h3>
      <div class="lab-controls" role="group" aria-label="Acciones del laboratorio">{controls_html}</div>
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-reset-lab">
        <span aria-hidden="true">↺</span> Reiniciar estado visual
      </button>
    </div>

    <div class="lab-diagram">
      <h3>Componentes del mecanismo</h3>
      <ul class="lab-components" aria-label="Estado de los componentes">{comps_html}</ul>
      <div>
        <h4 style="margin:0 0 6px;font-size:0.9rem">Bitácora de eventos</h4>
        <ul class="lab-log" id="lab-log" tabindex="0" aria-live="polite" aria-label="Bitácora de eventos">
          <li>[00] Laboratorio iniciado.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<upao-summary title="Síntesis del mecanismo">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Finalizar laboratorio" locked></upao-complete>
</upao-summary>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script(_LAB_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Laboratorio virtual: {concept}"[:70],
        "objetivo": f"Observar cómo cambian los componentes internos de {concept} al ejecutar distintas acciones."[:160],
        "concepto_mecanismo": f"El mecanismo de {concept} reparte el trabajo entre varios componentes; cada acción cambia su estado y el costo observable."[:200],
        "componentes": [
            {"nombre": "Componente de entrada", "estado_inicial": "En espera"},
            {"nombre": "Estructura intermedia", "estado_inicial": "Sin usar"},
            {"nombre": "Almacenamiento", "estado_inicial": "Sin leer"},
        ],
        "metricas": [
            {"nombre": "Bloques leídos", "inicial": 0},
            {"nombre": "Filas devueltas", "inicial": 0},
        ],
        "controles": [
            {
                "id": "ruta_directa",
                "accion": "Usar la ruta optimizada",
                "descripcion": "El motor aprovecha la estructura intermedia para llegar directo a los datos.",
                "componente": 2,
                "nuevo_estado": "Recorrida",
                "cambios": [3, 1],
                "resultado": "Con pocas lecturas se llega a la fila buscada: la estructura evita revisar todo.",
            },
            {
                "id": "ruta_completa",
                "accion": "Recorrer todo el almacenamiento",
                "descripcion": "El motor revisa todos los bloques sin ayuda de la estructura intermedia.",
                "componente": 3,
                "nuevo_estado": "Leído completo",
                "cambios": [40, 1],
                "resultado": "Se leen muchos más bloques para devolver la misma fila: el costo crece con el tamaño.",
            },
        ],
        "ejemplo_trabajado": "Ejecuta primero la ruta optimizada y anota los bloques leídos; luego recorre todo el almacenamiento y compara: la misma fila cuesta mucho más.",
        "sintesis": f"En {concept}, elegir la ruta adecuada cambia drásticamente el trabajo interno aunque el resultado visible sea el mismo."[:250],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=1,
    title="Simulador Virtual Lab",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
