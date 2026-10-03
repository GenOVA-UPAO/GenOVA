"""ELABORATE 10 — Reto de Diseño: priorizar criterios, proponer un diseño, autoevaluarse y comparar con la solución de referencia."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, paragraphs, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

POINTS = 10

PARAMS = (
    Param("num_criteria", 4, min=3, max=5, help="Número de criterios de diseño que se evalúan"),
)


def schema(p: dict) -> dict:
    n = p["num_criteria"]
    return obj(
        titulo=s(70),
        enunciado=s(560),
        criterios=arr(obj(nombre=s(40), descripcion=s(180)), min_items=n, max_items=n),
        guia_evaluacion=obj(basico=s(210), competente=s(210), avanzado=s(210)),
        solucion_referencia=s(820),
        tradeoffs=arr(obj(decision=s(120), ganancia=s(150), costo=s(150)), 2, 3),
        cierre=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_criteria"]
    return f"""[ROL] Diseñador de retos de arquitectura y diseño de bases de datos Oracle.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Plantea un reto de diseño abierto donde aplicar «{concept}» exija equilibrar requisitos en conflicto, sin una solución óptima obvia.
- titulo: título corto del reto.
- enunciado: ≈80 palabras: el cliente ficticio, el problema, y las restricciones (presupuesto, ventana de mantenimiento, volumen de datos, disponibilidad…).
- criterios: EXACTAMENTE {n} criterios con los que se juzgará un diseño, cada uno con `nombre` (≤4 palabras) y `descripcion` (qué se valora, ≤25 palabras). Algunos deben estar en tensión entre sí.
- guia_evaluacion: descripción GENERAL de tres niveles de logro aplicable a cada criterio: `basico`, `competente` y `avanzado` (≤30 palabras cada una).
- solucion_referencia: una solución razonada de ≈100 palabras que justifique las decisiones.
- tradeoffs: 2 o 3 decisiones clave de la solución, cada una con `decision`, `ganancia` (qué se gana) y `costo` (qué se sacrifica), ≤20 palabras cada campo.
- cierre: cómo transferir este razonamiento a otros diseños.
[RESTRICCIONES] Datos y términos de Oracle correctos; la solución de referencia es UNA opción defendible, no la única.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    crit = data["criterios"]
    g = data["guia_evaluacion"]
    prio = "".join(
        f'<li class="rd-prio" data-c="{k}"><div class="k-grow"><strong>{esc(c["nombre"])}</strong><br><span class="ova-muted">{esc(c["descripcion"])}</span></div>'
        f'<div class="k-row"><button type="button" class="k-btn rd-minus" aria-label="Quitar un punto a {esc(c["nombre"])}">−</button>'
        f'<output class="rd-val" aria-live="polite">0</output>'
        f'<button type="button" class="k-btn rd-plus" aria-label="Dar un punto a {esc(c["nombre"])}">+</button></div></li>'
        for k, c in enumerate(crit)
    )
    evals = "".join(
        f'<fieldset class="k-panel rd-ev" data-c="{k}"><legend><strong>{esc(c["nombre"])}</strong></legend>'
        + "".join(
            f'<label class="rd-lvl"><input type="radio" name="rd-e{k}" value="{v}"> <span>{lbl}</span></label>'
            for v, lbl in ((1, "Básico"), (2, "Competente"), (3, "Avanzado"))
        )
        + "</fieldset>"
        for k, c in enumerate(crit)
    )
    trade = "".join(
        f'<tr><th scope="row">{esc(t["decision"])}</th><td>{esc(t["ganancia"])}</td><td>{esc(t["costo"])}</td></tr>'
        for t in data["tradeoffs"]
    )
    checks = "".join(
        f'<label class="rd-chk"><input type="checkbox" class="rd-tc"> <span>Mi propuesta consideró: {esc(t["decision"])}</span></label>'
        for t in data["tradeoffs"]
    )
    return f"""
{header("RETO DE DISEÑO", data["titulo"])}
{KIT_CSS}
<style>
.rd-list{{list-style:none;margin:0;padding:0;display:grid;gap:10px}}
.rd-prio{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}}
.rd-val{{min-width:2ch;text-align:center;font-weight:800;font-size:1.2rem;color:var(--primary)}}
.rd-lvl,.rd-chk{{display:inline-flex;gap:8px;align-items:center;margin:4px 14px 4px 0;cursor:pointer;min-height:32px}}
.rd-lvl input,.rd-chk input{{width:20px;height:20px}}
fieldset.rd-ev{{margin:0 0 10px}}
</style>
<article class="ova-card ova-stack" aria-labelledby="rd-en-h"><h2 id="rd-en-h">El reto</h2>{paragraphs(data["enunciado"])}</article>
{progress(4, "Etapas del reto")}
<section class="ova-card ova-stack" aria-labelledby="rd-1-h"><h2 id="rd-1-h">1. Prioriza los criterios</h2>
<p class="ova-muted">Reparte {POINTS} puntos según la importancia que darías a cada criterio en este caso.</p>
<ul class="rd-list">{prio}</ul>
<p class="k-chip" id="rd-left" aria-live="polite">Te quedan {POINTS} puntos</p></section>
<section class="ova-card ova-stack" aria-labelledby="rd-2-h"><h2 id="rd-2-h">2. Escribe tu propuesta de diseño</h2>
<label for="rd-prop" class="k-label">Tu propuesta (decisiones y justificación)</label>
<textarea id="rd-prop" class="ova-input" rows="6" placeholder="Describe qué harías, por qué y qué sacrificas"></textarea>
<div class="k-row"><button type="button" class="k-btn main" id="rd-send" disabled>Guardar propuesta</button><span class="ova-muted" id="rd-count">0 / 60 caracteres mínimos</span></div></section>
<section class="ova-card ova-stack" aria-labelledby="rd-3-h"><h2 id="rd-3-h">3. Autoevalúa tu propuesta</h2>
<ul><li><strong>Básico:</strong> {esc(g["basico"])}</li><li><strong>Competente:</strong> {esc(g["competente"])}</li><li><strong>Avanzado:</strong> {esc(g["avanzado"])}</li></ul>
{evals}
<div class="k-fb" id="rd-score" role="status" aria-live="polite">Califica los {len(crit)} criterios.</div></section>
<section class="ova-card ova-stack" aria-labelledby="rd-4-h"><h2 id="rd-4-h">4. Compara con la solución de referencia</h2>
<button type="button" class="k-btn main" id="rd-ref" disabled>Ver solución de referencia</button>
<p class="ova-muted" id="rd-ref-hint">Disponible cuando guardes tu propuesta y completes la autoevaluación.</p>
<div id="rd-solbox" class="ova-stack k-hide">{paragraphs(data["solucion_referencia"])}
<div class="ova-table-scroll" role="region" aria-label="Trade-offs" tabindex="0"><table><caption>Decisiones y trade-offs de la referencia</caption>
<thead><tr><th scope="col">Decisión</th><th scope="col">Se gana</th><th scope="col">Se sacrifica</th></tr></thead><tbody>{trade}</tbody></table></div>
<fieldset class="k-panel"><legend>Contrasta con tu propuesta</legend>{checks}</fieldset>
<p class="k-fb" id="rd-tc-fb" role="status" aria-live="polite">Marca los trade-offs que tu propuesta ya contemplaba.</p></div></section>
{summary(data["cierre"], "Transferencia")}
{json_data({"n": len(crit), "pts": POINTS})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const vals = new Array(D.n).fill(0);
function left() { return D.pts - vals.reduce((a, b) => a + b, 0); }
function upd() {
  $('rd-left').textContent = left() === 0 ? '✓ Repartiste los ' + D.pts + ' puntos' : 'Te quedan ' + left() + ' puntos';
  document.querySelectorAll('.rd-prio').forEach(li => { const c = Number(li.dataset.c); li.querySelector('.rd-val').textContent = vals[c]; });
  if (left() === 0) window.ovaMark('prio');
}
document.querySelectorAll('.rd-prio').forEach(li => {
  const c = Number(li.dataset.c);
  li.querySelector('.rd-plus').addEventListener('click', () => { if (left() > 0) { vals[c]++; upd(); } });
  li.querySelector('.rd-minus').addEventListener('click', () => { if (vals[c] > 0) { vals[c]--; upd(); } });
});
let propDone = false, evalDone = false;
function gate() { const ok = propDone && evalDone; $('rd-ref').disabled = !ok; if (ok) $('rd-ref-hint').textContent = 'Todo listo: compara tu propuesta con la referencia.'; }
const ta = $('rd-prop');
ta.addEventListener('input', () => { const n = ta.value.trim().length; $('rd-count').textContent = n + ' / 60 caracteres mínimos'; if (!propDone) $('rd-send').disabled = n < 60; });
$('rd-send').addEventListener('click', () => { propDone = true; ta.readOnly = true; $('rd-send').disabled = true; $('rd-send').textContent = '✓ Propuesta guardada'; window.ovaMark('prop'); gate(); });
const names = ['', 'Básico', 'Competente', 'Avanzado'];
document.querySelectorAll('.rd-ev').forEach(f => f.addEventListener('change', () => {
  const v = Array.from(document.querySelectorAll('.rd-ev')).map(x => { const r = x.querySelector('input:checked'); return r ? Number(r.value) : 0; });
  if (v.some(x => !x)) return;
  const avg = v.reduce((a, b) => a + b, 0) / v.length, lvl = avg >= 2.5 ? 3 : avg >= 1.75 ? 2 : 1;
  const fb = $('rd-score'); fb.className = 'k-fb ' + (lvl === 3 ? 'ok' : '');
  fb.textContent = 'Tu nivel global: ' + names[lvl] + ' (promedio ' + avg.toFixed(1) + ' de 3). Identifica el criterio más bajo para mejorar tu propuesta.';
  evalDone = true; window.ovaMark('auto'); gate();
}));
$('rd-ref').addEventListener('click', () => { $('rd-solbox').classList.remove('k-hide'); $('rd-ref').disabled = true; window.ovaMark('ref'); });
document.querySelectorAll('.rd-tc').forEach(c => c.addEventListener('change', () => {
  const all = document.querySelectorAll('.rd-tc'), k = Array.from(all).filter(x => x.checked).length;
  $('rd-tc-fb').textContent = k + ' de ' + all.length + ' trade-offs ya estaban en tu propuesta. ' + (k === all.length ? 'Excelente: tu diseño es comparable al de referencia.' : 'Los demás son oportunidades para fortalecer tu justificación.');
}));
''')}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Reto de diseño: {concept}"[:70],
        "enunciado": f"Una cadena de clínicas necesita rediseñar su base de datos Oracle con {concept}.\nTiene 200 GB, una ventana de mantenimiento de 2 horas y presupuesto limitado.",
        "criterios": [{"nombre": f"Criterio {k}", "descripcion": f"Valora el aspecto {k} del diseño."} for k in range(1, p["num_criteria"] + 1)],
        "guia_evaluacion": {
            "basico": "Cumple lo mínimo sin justificar decisiones.",
            "competente": "Justifica sus decisiones con el concepto.",
            "avanzado": "Anticipa trade-offs y propone alternativas.",
        },
        "solucion_referencia": f"Se propone aplicar {concept} por etapas: primero lo crítico y luego lo opcional.\nSe sacrifica algo de simplicidad para ganar disponibilidad.",
        "tradeoffs": [
            {"decision": "Aplicar por etapas", "ganancia": "Menor riesgo", "costo": "Más tiempo total"},
            {"decision": "Separar tablespaces", "ganancia": "Administración flexible", "costo": "Más objetos que vigilar"},
        ],
        "cierre": "No hay diseño perfecto: hay decisiones justificadas.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=10,
    title="Reto de Diseño",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
