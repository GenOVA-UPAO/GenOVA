"""EVALUATE 3 — Desafío Contrarreloj: preguntas con cronómetro global y bonus por velocidad."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, trim_to_param

PARAMS = (
    Param("num_questions", 5, min=4, max=10, help="Número de preguntas del desafío"),
    Param("time_seconds", 90, min=30, max=180, help="Tiempo total del desafío en segundos"),
)


def schema(p: dict) -> dict:
    n = p["num_questions"]
    return obj(
        titulo=s(70),
        reglas=s(200),
        preguntas=arr(
            obj(
                enunciado=s(200),
                opciones=arr(obj(texto=s(100), correcta=b()), 3, 4),
                explicacion=s(180),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Diseñador de desafíos de respuesta rápida para universitarios.", f"Diseñador de desafíos de respuesta rápida para {d.audiencia}. {d.guia_nivel}")
    n, t = p["num_questions"], p["time_seconds"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un desafío contrarreloj de {n} preguntas sobre «{concept}» que se responde en {t} segundos en total; hay bonus por velocidad, así que las preguntas deben poder resolverse en pocos segundos.
- titulo: título corto y motivador.
- reglas: una frase con las reglas (tiempo total, bonus por rapidez).
- preguntas: exactamente {n}, cada una con `enunciado` (≤25 palabras, directo), `opciones` (3 o 4 opciones breves ≤10 palabras; EXACTAMENTE UNA con `correcta: true`) y `explicacion` (≤25 palabras, explica el porqué de la correcta).
- cierre: frase que consolide los errores típicos del tema.
[RESTRICCIONES] Preguntas de respuesta inmediata (definiciones, qué hace una sentencia, qué estructura usa), sin cálculos largos.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_CSS = """
<style>
.ct-top{display:flex;flex-wrap:wrap;gap:var(--space-2,12px);align-items:center;justify-content:space-between}
.ct-bonus{font-weight:700;color:var(--accent,#F47A20)}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    qs = data["preguntas"]
    n = len(qs)
    secs = int(ctx.params.get("time_seconds", 90))
    payload = []
    for q in qs:
        flags = [bool(o.get("correcta")) for o in q["opciones"]]
        if flags.count(True) != 1:
            first = flags.index(True) if True in flags else 0
            flags = [i == first for i in range(len(flags))]
        payload.append(
            {
                "q": q["enunciado"],
                "o": [o["texto"] for o in q["opciones"]],
                "c": flags.index(True),
                "e": q["explicacion"],
            }
        )
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="DESAFÍO CONTRARRELOJ" title="{esc(data["titulo"])}"><p>{esc(data["reglas"])}</p></upao-header>
<div class="ev-hud">
  <upao-timer id="timer" seconds="{secs}" label="Tiempo restante"></upao-timer>
  <upao-progress id="prog" current="0" total="{n}" label="Preguntas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{n * 15}" label="Puntuación"></upao-score>
</div>
<section class="ev-card ova-stack" id="start">
  <p>{n} preguntas, {secs} segundos en total. Cada acierto suma 10 puntos y hasta 5 de bonus según el tiempo que quede.</p>
  <div class="ev-row"><button type="button" class="ev-btn" id="btn-start">Comenzar desafío</button></div>
</section>
<section class="ev-card ova-stack" id="play" hidden>
  <div class="ct-top"><span class="ev-badge" id="q-count"></span><span class="ct-bonus" id="q-bonus" aria-hidden="true"></span></div>
  <h2 class="ev-q" id="q-text" tabindex="-1"></h2>
  <div class="ev-opts" id="q-opts" role="group" aria-label="Opciones"></div>
  <div class="ev-fb" id="q-fb" role="status" aria-live="polite" hidden></div>
  <div class="ev-row"><button type="button" class="ev-btn" id="btn-next" hidden>Siguiente</button></div>
</section>
<section class="ev-card ev-result ova-stack" id="result" aria-live="polite" hidden>
  <p class="ev-big" id="result-big"></p>
  <p id="result-msg"></p>
</section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar desafío" locked></upao-complete></upao-summary>
{json_data({"qs": payload, "secs": secs})}
{script(PROGRESS_JS)}
{script('''
const cfg = JSON.parse(document.getElementById('ova-data').textContent);
const timer = document.getElementById('timer');
const score = document.getElementById('score');
const $ = id => document.getElementById(id);
let idx = 0, hits = 0, answered = 0, locked = false, finished = false, remaining = cfg.secs;
const total = cfg.qs.length;

timer.addEventListener('upao-timer-tick', e => { remaining = e.detail.remaining; $('q-bonus').textContent = '+' + bonus() + ' bonus'; });
timer.addEventListener('upao-timer-end', () => finish(true));
function bonus() { return Math.round(5 * Math.max(0, remaining) / cfg.secs); }

function show() {
  const q = cfg.qs[idx];
  locked = false;
  $('q-count').textContent = 'Pregunta ' + (idx + 1) + ' de ' + total;
  $('q-text').textContent = q.q;
  $('q-fb').hidden = true;
  $('btn-next').hidden = true;
  const box = $('q-opts');
  box.textContent = '';
  q.o.forEach(function (t, j) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ev-opt'; b.dataset.j = j;
    const k = document.createElement('span'); k.className = 'ev-key'; k.setAttribute('aria-hidden', 'true'); k.textContent = String.fromCharCode(65 + j);
    const tx = document.createElement('span'); tx.textContent = t;
    b.append(k, tx);
    b.addEventListener('click', () => pick(j));
    box.appendChild(b);
  });
}
function pick(j) {
  if (locked || finished) return;
  locked = true;
  const q = cfg.qs[idx];
  const ok = j === q.c;
  answered++;
  if (ok) { hits++; const pts = 10 + bonus(); score.add(pts); }
  document.querySelectorAll('#q-opts .ev-opt').forEach(function (b, k) {
    b.disabled = true;
    if (k === q.c) b.classList.add('is-ok');
    else if (k === j) b.classList.add('is-bad');
  });
  const fb = $('q-fb');
  fb.hidden = false; fb.className = 'ev-fb is-' + (ok ? 'ok' : 'bad');
  fb.textContent = (ok ? '¡Correcto! ' : 'Incorrecto. ') + q.e;
  window.ovaMark('q' + idx);
  const nx = $('btn-next');
  nx.textContent = idx + 1 >= total ? 'Ver resultado' : 'Siguiente';
  nx.hidden = false; nx.focus();
}
$('btn-next').addEventListener('click', function () {
  if (idx + 1 >= total) { finish(false); return; }
  idx++; show(); $('q-text').focus();
});
function finish(byTime) {
  if (finished) return;
  finished = true;
  timer.stop();
  for (let k = 0; k < total; k++) window.ovaMark('q' + k);
  $('play').hidden = true;
  $('result').hidden = false;
  $('result-big').textContent = hits + ' / ' + total + ' aciertos';
  $('result-msg').textContent = (byTime ? 'Se acabó el tiempo. ' : 'Terminaste con ' + remaining + ' s de sobra. ')
    + 'Respondiste ' + answered + ' de ' + total + ' preguntas.';
}
$('btn-start').addEventListener('click', function () {
  $('start').hidden = true; $('play').hidden = false;
  show(); timer.start(); $('q-text').focus();
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_questions"]
    pool = [
        ("¿Qué contiene una hoja de un índice B-tree?", "Clave y ROWID", ["Fila completa", "Plan de ejecución"]),
        ("¿Qué comando crea un índice?", "CREATE INDEX", ["MAKE KEY", "ADD INDEX TABLE"]),
        ("¿Qué recorrido hace un INDEX RANGE SCAN?", "Un rango de claves ordenadas", ["Toda la tabla", "Solo la raíz"]),
        ("¿Qué provoca un bloque hoja lleno?", "Una división de bloque", ["Un DROP", "Un rollback"]),
        ("¿Qué vista lista índices?", "USER_INDEXES", ["V$SGA", "DBA_TABLESPACES"]),
        ("¿Qué mide la altura del índice?", "Niveles hasta la hoja", ["Filas de la tabla", "Tamaño del buffer"]),
        ("¿Quién decide usar el índice?", "El optimizador", ["El cliente SQL*Plus", "El listener"]),
        ("¿Qué es un ROWID?", "Dirección física de una fila", ["Número de sesión", "Nombre de tablespace"]),
    ]
    qs = []
    for k in range(n):
        enun, ok, bad = pool[k % len(pool)]
        qs.append(
            {
                "enunciado": f"{enun} ({concept})"[:230],
                "opciones": [{"texto": ok, "correcta": True}] + [{"texto": x, "correcta": False} for x in bad],
                "explicacion": "Es la definición correcta del mecanismo en Oracle.",
            }
        )
    return {
        "titulo": f"Contrarreloj: {concept}"[:70],
        "reglas": "Responde rápido: cuanto más tiempo te sobre, más bonus ganas.",
        "preguntas": qs,
        "cierre": "Los errores por prisa suelen venir de confundir clave con ROWID: repásalo.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=3,
    title="Desafío Contrarreloj",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("preguntas", "num_questions"),
)
