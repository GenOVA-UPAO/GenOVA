"""EVALUATE 4 — Examen de Opción Múltiple: navegación por preguntas, entrega y revisión con justificación."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, trim_to_param

PARAMS = (
    Param("num_questions", 6, min=5, max=12, help="Número de preguntas del examen"),
)

_TIPOS = ("conceptual", "aplicacion", "analisis", "relacion")


def schema(p: dict) -> dict:
    n = p["num_questions"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        preguntas=arr(
            obj(
                enunciado=s(260),
                tipo=s(20, enum=list(_TIPOS)),
                opciones=arr(obj(texto=s(130), correcta=b()), 4, 4),
                justificacion=s(220),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Examinador universitario de bases de datos.", f"Examinador de {d.topic} para {d.audiencia}. {d.guia_nivel}")
    aplic = d.pick("sentencia Oracle", "situación o problema propio del tema")
    n = p["num_questions"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Redacta un examen de {n} preguntas de opción múltiple sobre «{concept}», con balance entre conceptual, aplicación ({aplic}), análisis y relación con otros conceptos.
- titulo: título formal del examen.
- instrucciones: una frase (tiempo sugerido, una respuesta por pregunta, se califica al entregar).
- preguntas: exactamente {n}. Cada una con:
  * `enunciado` (≤40 palabras, sin ambigüedad).
  * `tipo`: uno de conceptual, aplicacion, analisis, relacion.
  * `opciones`: exactamente 4 opciones plausibles (≤18 palabras, sin prefijo A/B/C/D); EXACTAMENTE UNA con `correcta: true`; reparte la posición de la correcta.
  * `justificacion`: por qué la correcta lo es y por qué falla el distractor más tentador (≤30 palabras).
- cierre: frase de cierre del examen.
[RESTRICCIONES] Sin «todas/ninguna de las anteriores». Una sola respuesta defendible.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_CSS = """
<style>
.ex-dots{display:flex;flex-wrap:wrap;gap:6px}
.ex-dot{width:36px;height:36px;border-radius:8px;border:2px solid var(--border,#cbd5e1);background:var(--surface,#fff);font-weight:700;cursor:pointer;color:var(--text,#1b2437)}
.ex-dot.is-answered{background:var(--surface-tint,#eef2ff);border-color:var(--primary,#0A3D91)}
.ex-dot.is-current{outline:3px solid var(--primary,#0A3D91);outline-offset:1px}
.ex-dot.is-ok{background:rgba(26,127,75,.15);border-color:var(--success,#1a7f4b)}
.ex-dot.is-bad{background:rgba(192,57,43,.15);border-color:var(--danger,#c0392b)}
.ex-rev{padding:var(--space-2,12px) 0;border-top:1px solid var(--border,#cbd5e1)}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    qs = data["preguntas"]
    n = len(qs)
    payload = []
    for q in qs:
        flags = [bool(o.get("correcta")) for o in q["opciones"]]
        if flags.count(True) != 1:
            first = flags.index(True) if True in flags else 0
            flags = [i == first for i in range(len(flags))]
        payload.append(
            {
                "q": q["enunciado"],
                "t": q.get("tipo", ""),
                "o": [o["texto"] for o in q["opciones"]],
                "c": flags.index(True),
                "j": q["justificacion"],
            }
        )
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="EXAMEN" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n + 1}" label="Respondidas + entrega" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="20" label="Nota (sobre 20)"></upao-score>
</div>
<section id="exam" class="ova-stack">
  <nav aria-label="Mapa de preguntas"><div class="ex-dots" id="dots"></div></nav>
  <div class="ev-card" id="card">
    <span class="ev-badge" id="q-count"></span>
    <h2 class="ev-q" id="q-text" tabindex="-1"></h2>
    <div class="ev-opts" id="q-opts" role="radiogroup" aria-labelledby="q-text"></div>
  </div>
  <div class="ev-row">
    <button type="button" class="ev-btn is-ghost" id="btn-prev">← Anterior</button>
    <button type="button" class="ev-btn is-ghost" id="btn-next">Siguiente →</button>
    <button type="button" class="ev-btn" id="btn-submit" disabled>Entregar examen</button>
  </div>
  <p id="submit-hint" role="status" aria-live="polite"></p>
</section>
<section class="ev-card ova-stack" id="result" aria-live="polite" hidden>
  <div class="ev-result"><p class="ev-big" id="result-big"></p><p id="result-msg"></p></div>
  <div id="review"></div>
</section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar examen" locked></upao-complete></upao-summary>
{json_data({"qs": payload})}
{script(PROGRESS_JS)}
{script('''
const qs = JSON.parse(document.getElementById('ova-data').textContent).qs;
const $ = id => document.getElementById(id);
const total = qs.length;
const answers = new Array(total).fill(-1);
let cur = 0, submitted = false;
const TIPOS = {conceptual: 'Conceptual', aplicacion: 'Aplicación', analisis: 'Análisis', relacion: 'Relación'};

const dots = $('dots');
qs.forEach(function (_, i) {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'ex-dot'; d.textContent = i + 1;
  d.setAttribute('aria-label', 'Ir a la pregunta ' + (i + 1));
  d.addEventListener('click', () => go(i));
  dots.appendChild(d);
});

function paintDots() {
  dots.querySelectorAll('.ex-dot').forEach(function (d, i) {
    d.className = 'ex-dot' + (i === cur ? ' is-current' : '');
    if (submitted) d.classList.add(answers[i] === qs[i].c ? 'is-ok' : 'is-bad');
    else if (answers[i] >= 0) d.classList.add('is-answered');
  });
}
function go(i) {
  cur = Math.max(0, Math.min(total - 1, i));
  const q = qs[cur];
  $('q-count').textContent = 'Pregunta ' + (cur + 1) + ' de ' + total + (TIPOS[q.t] ? ' · ' + TIPOS[q.t] : '');
  $('q-text').textContent = q.q;
  const box = $('q-opts'); box.textContent = '';
  q.o.forEach(function (t, j) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ev-opt'; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', answers[cur] === j ? 'true' : 'false');
    b.disabled = submitted;
    const k = document.createElement('span'); k.className = 'ev-key'; k.setAttribute('aria-hidden', 'true'); k.textContent = String.fromCharCode(65 + j);
    const tx = document.createElement('span'); tx.textContent = t;
    b.append(k, tx);
    b.addEventListener('click', () => choose(j));
    box.appendChild(b);
  });
  markSelected();
  $('btn-prev').disabled = cur === 0;
  $('btn-next').disabled = cur === total - 1;
  paintDots();
}
function markSelected() {
  document.querySelectorAll('#q-opts .ev-opt').forEach(function (b, j) {
    b.style.borderColor = answers[cur] === j ? 'var(--primary,#0A3D91)' : '';
    b.style.background = answers[cur] === j ? 'var(--surface-tint,#eef2ff)' : '';
    b.setAttribute('aria-checked', answers[cur] === j ? 'true' : 'false');
  });
}
function choose(j) {
  if (submitted) return;
  answers[cur] = j;
  window.ovaMark('a' + cur);
  markSelected(); paintDots();
  const done = answers.filter(a => a >= 0).length;
  $('btn-submit').disabled = done < total;
  $('submit-hint').textContent = done < total ? 'Faltan ' + (total - done) + ' pregunta(s) por responder.' : 'Todas respondidas: puedes entregar el examen.';
}
$('btn-prev').addEventListener('click', () => go(cur - 1));
$('btn-next').addEventListener('click', () => go(cur + 1));
$('btn-submit').addEventListener('click', function () {
  submitted = true;
  const hits = qs.reduce((a, q, i) => a + (answers[i] === q.c ? 1 : 0), 0);
  const nota = Math.round(20 * hits / total * 10) / 10;
  document.getElementById('score').set(Math.round(nota));
  $('exam').hidden = true;
  $('result').hidden = false;
  $('result-big').textContent = 'Nota: ' + nota.toFixed(1) + ' / 20 (' + hits + ' de ' + total + ' correctas)';
  $('result-msg').textContent = nota >= 14 ? 'Aprobado con buen dominio.' : nota >= 11 ? 'Aprobado: refuerza los puntos marcados.' : 'Desaprobado: revisa la justificación de cada pregunta.';
  const rev = $('review');
  qs.forEach(function (q, i) {
    const ok = answers[i] === q.c;
    const div = document.createElement('div'); div.className = 'ex-rev';
    const h = document.createElement('p'); h.className = 'ev-q'; h.textContent = (i + 1) + '. ' + q.q;
    const you = document.createElement('p');
    you.textContent = (ok ? '✓ Tu respuesta: ' : '✗ Tu respuesta: ') + q.o[answers[i]] + (ok ? '' : ' — Correcta: ' + q.o[q.c]);
    const fb = document.createElement('div'); fb.className = 'ev-fb is-' + (ok ? 'ok' : 'bad'); fb.textContent = q.j;
    div.append(h, you, fb); rev.appendChild(div);
  });
  window.ovaMark('submit');
  paintDots();
  $('result').scrollIntoView({block: 'start'});
});
go(0);
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_questions"]
    pool = [
        ("¿Dónde se ubica la fase de búsqueda más rápida de un B-tree?", "En los bloques rama que descartan rangos", ["En la tabla completa", "En el redo log", "En el listener"], "conceptual"),
        ("Se ejecuta SELECT * FROM emp WHERE empno = 7369. ¿Qué operación esperas?", "INDEX UNIQUE SCAN seguido de acceso por ROWID", ["TABLE ACCESS FULL siempre", "SORT MERGE JOIN", "HASH GROUP BY"], "aplicacion"),
        ("Un índice crece en altura 4 en una tabla de 100 filas. ¿Qué infieres?", "Hay un problema de diseño o fragmentación", ["Es normal en tablas pequeñas", "El optimizador lo borrará", "La tabla es temporal"], "analisis"),
        ("¿Cómo se relaciona el clustering factor con el uso del índice?", "Un valor alto encarece el acceso por rango", ["No tiene relación", "Solo afecta a índices bitmap", "Reduce el tamaño del índice"], "relacion"),
        ("¿Qué sentencia reconstruye un índice?", "ALTER INDEX idx REBUILD", ["DROP TABLE idx", "TRUNCATE INDEX idx", "ANALYZE ROWID"], "aplicacion"),
        ("¿Qué guarda el bloque raíz?", "Claves delimitadoras y punteros a ramas", ["Filas completas", "Sentencias SQL", "Usuarios"], "conceptual"),
        ("¿Por qué un LIKE '%abc' no usa el índice B-tree?", "No hay prefijo para recorrer el orden", ["Porque LIKE está prohibido", "Porque falta COMMIT", "Porque el índice es único"], "analisis"),
        ("¿Qué estructura complementa al índice para recuperar la fila?", "El segmento de tabla vía ROWID", ["El archivo de contraseñas", "El control file", "El alert log"], "relacion"),
        ("¿Qué privilegio permite crear índices propios?", "CREATE ANY INDEX o ser dueño de la tabla", ["SELECT ANY DICTIONARY", "SYSDBA únicamente", "CREATE SESSION"], "conceptual"),
        ("Tras un DELETE masivo, ¿qué suele ocurrir en el índice?", "Quedan entradas libres y espacio sin reutilizar", ["Se reordena solo", "Desaparece", "Se vuelve bitmap"], "analisis"),
    ]
    qs = []
    for k in range(n):
        enun, ok, bad, tipo = pool[k % len(pool)]
        pos = k % 4
        texts = bad[:]
        texts.insert(pos, ok)
        qs.append(
            {
                "enunciado": f"{enun} [{concept}]"[:300],
                "tipo": tipo,
                "opciones": [{"texto": t, "correcta": j == pos} for j, t in enumerate(texts)],
                "justificacion": "La opción correcta describe el mecanismo real; las demás confunden estructuras distintas.",
            }
        )
    return {
        "titulo": f"Examen: {concept}"[:70],
        "instrucciones": "Responde todas las preguntas; se califica al entregar y verás la justificación de cada una.",
        "preguntas": qs,
        "cierre": f"Repasa las justificaciones de {concept} antes de continuar.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=4,
    title="Examen Opción Múltiple",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("preguntas", "num_questions"),
)
