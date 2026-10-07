"""EVALUATE 6 — Relacionar Conceptos: arrastrar (o seleccionar) cada término a su definición."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, NORM_JS, trim_to_param

PARAMS = (
    Param("num_pairs", 6, min=4, max=8, help="Número de pares definición-término"),
)

_CSS = """
<style>
.rl-grid{display:grid;gap:var(--space-3,16px)}
@media (min-width:760px){.rl-grid{grid-template-columns:1fr 1fr;align-items:start}}
.rl-terms{display:flex;flex-wrap:wrap;gap:var(--space-2,12px);min-height:56px}
.rl-term{display:inline-block;cursor:pointer;border-radius:10px}
.rl-term.is-selected{outline:3px solid var(--accent,#F47A20);outline-offset:2px}
.rl-term[hidden]{display:none}
.rl-def p{margin:0 0 8px;overflow-wrap:anywhere}
.rl-def.is-ok{border-color:var(--success,#1a7f4b)}
.rl-placed{font-weight:700;color:var(--success,#1a7f4b)}
.rl-hint{font-size:.9rem;color:var(--text-muted,#5b6578)}
</style>
"""


def schema(p: dict) -> dict:
    n = p["num_pairs"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        parejas=arr(
            obj(definicion=s(200), termino=s(40), feedback_acierto=s(160), feedback_error=s(160)),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Diseñador de actividades de asociación para universitarios.", f"Diseñador de actividades de asociación para {d.audiencia}. {d.guia_nivel}")
    n = p["num_pairs"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña {n} pares 1:1 definición-término relacionados con «{concept}» (procesos, estructuras, vistas, privilegios o sentencias).
- titulo: título corto de la actividad.
- instrucciones: una frase (arrastra cada término a su definición, o selecciónalo y pulsa «Colocar aquí»).
- parejas: exactamente {n}. Cada una con:
  * `definicion`: descripción del concepto SIN nombrar el término (≤30 palabras).
  * `termino`: el término asociado, corto (≤4 palabras); todos distintos.
  * `feedback_acierto`: refuerzo que explique por qué encajan (≤20 palabras).
  * `feedback_error`: pista que oriente SIN revelar el término (≤20 palabras).
- cierre: frase que consolide las relaciones trabajadas.
[RESTRICCIONES] Cada definición debe corresponder a un único término; sin pistas literales ni ambigüedad.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _order(n: int) -> list[int]:
    """Orden determinista de los términos, distinto al de las definiciones."""
    order = list(range(n))[::-1]
    order = order[1:] + order[:1]
    return order


def render(data: dict, ctx: RenderContext) -> str:
    pairs = data["parejas"]
    n = len(pairs)
    terms = "".join(
        f'<upao-drag-item class="rl-term" item-id="{esc(pairs[i]["termino"])}" category="{i}" data-i="{i}" '
        f'role="button" tabindex="0">{esc(pairs[i]["termino"])}</upao-drag-item>'
        for i in _order(n)
    )
    defs = "".join(
        f'<article class="ev-card rl-def ova-stack" id="def{i}" data-i="{i}">'
        f'<span class="ev-badge">Definición {i + 1}</span><p>{esc(p["definicion"])}</p>'
        f'<upao-drop-zone zone-id="z{i}" accepts="{i}" label="Suelta aquí el término"></upao-drop-zone>'
        f'<div class="ev-row"><button type="button" class="ev-btn is-ghost" data-place="{i}">Colocar aquí el término seleccionado</button></div>'
        f'<div class="ev-fb" id="fb{i}" role="status" aria-live="polite" hidden></div></article>'
        for i, p in enumerate(pairs)
    )
    payload = [{"t": p["termino"], "ok": p["feedback_acierto"], "err": p["feedback_error"]} for p in pairs]
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="RELACIONAR CONCEPTOS" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Pares correctos" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{n * 10}" label="Puntuación"></upao-score>
</div>
<section class="ev-card ova-stack" aria-label="Términos disponibles">
  <p><strong>Términos</strong> <span class="rl-hint">Arrastra, o pulsa un término (Enter) y luego «Colocar aquí».</span></p>
  <div class="rl-terms" id="terms">{terms}</div>
  <div class="ev-fb" id="sel-msg" role="status" aria-live="polite" hidden></div>
</section>
<div class="rl-grid">{defs}</div>
<section class="ev-card ev-result" id="result" aria-live="polite" hidden><p class="ev-big" id="result-big"></p><p id="result-msg"></p></section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar actividad" locked></upao-complete></upao-summary>
{json_data({"pairs": payload})}
{script(PROGRESS_JS)}
{script(NORM_JS + '''
const pairs = JSON.parse(document.getElementById('ova-data').textContent).pairs;
const $ = id => document.getElementById(id);
const score = $('score');
const total = pairs.length;
const solved = new Set();
const fails = new Array(total).fill(0);
let errors = 0, selected = null;

function termEl(i) { return document.querySelector('.rl-term[data-i="' + i + '"]'); }
function select(i) {
  document.querySelectorAll('.rl-term').forEach(t => t.classList.remove('is-selected'));
  selected = (selected === i || solved.has(i)) ? null : i;
  const msg = $('sel-msg');
  if (selected === null) { msg.hidden = true; return; }
  termEl(i).classList.add('is-selected');
  msg.hidden = false; msg.className = 'ev-fb';
  msg.textContent = 'Seleccionado: «' + pairs[i].t + '». Pulsa «Colocar aquí» en la definición que corresponde.';
}
function attempt(term, def) {
  if (solved.has(def)) return;
  const fb = $('fb' + def);
  if (term === def) {
    solved.add(def);
    const first = fails[def] === 0;
    score.add(first ? 10 : 5);
    const card = $('def' + def);
    card.classList.add('is-ok');
    const zone = card.querySelector('upao-drop-zone'); if (zone) zone.hidden = true;
    const btn = card.querySelector('[data-place]'); if (btn) btn.parentElement.hidden = true;
    const t = termEl(term); if (t) { if (t.matched) t.matched(); t.hidden = true; }
    const p = document.createElement('p'); p.className = 'rl-placed'; p.textContent = '✓ ' + pairs[def].t;
    card.insertBefore(p, fb);
    say(fb, pairs[def].ok, 'ok');
    window.ovaMark('p' + def);
    if (selected === term) { selected = null; $('sel-msg').hidden = true; }
    if (solved.size === total) {
      $('result').hidden = false;
      $('result-big').textContent = total + ' de ' + total + ' relacionados';
      $('result-msg').textContent = errors === 0 ? 'Sin errores: dominio completo.' : 'Completado con ' + errors + ' intento(s) fallido(s).';
    }
  } else {
    fails[def]++; errors++;
    say(fb, '✗ ' + pairs[def].err, 'bad');
  }
}
document.querySelectorAll('.rl-term').forEach(function (t) {
  const i = Number(t.dataset.i);
  t.addEventListener('click', () => select(i));
  t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
});
document.querySelectorAll('upao-drop-zone').forEach(function (z) {
  z.addEventListener('upao-drop', function (e) {
    attempt(Number(e.detail.itemCat), Number(z.getAttribute('zone-id').slice(1)));
  });
});
document.querySelectorAll('[data-place]').forEach(function (b) {
  b.addEventListener('click', function () {
    const def = Number(b.dataset.place);
    if (selected === null) { const fb = $('fb' + def); say(fb, 'Primero selecciona un término de la lista.', ''); return; }
    attempt(selected, def);
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_pairs"]
    base = [
        ("Bloque superior que inicia el descenso por el árbol del índice.", "Bloque raíz"),
        ("Bloque final que guarda las claves ordenadas junto a la dirección de cada fila.", "Bloque hoja"),
        ("Dirección física que identifica de forma única una fila de la tabla.", "ROWID"),
        ("Componente que elige el plan de ejecución según estadísticas y costo.", "Optimizador"),
        ("Operación que divide un bloque lleno en dos para seguir insertando.", "Block split"),
        ("Vista del diccionario que lista los índices del usuario actual.", "USER_INDEXES"),
        ("Número de niveles que se recorren desde la raíz hasta la hoja.", "Altura"),
    ]
    return {
        "titulo": f"Relaciona: {concept}"[:70],
        "instrucciones": "Arrastra cada término a su definición, o selecciónalo y usa el botón.",
        "parejas": [
            {
                "definicion": base[k % len(base)][0],
                "termino": base[k % len(base)][1],
                "feedback_acierto": f"Correcto: encaja con {concept}.",
                "feedback_error": "Piensa en el rol que cumple ese elemento; no es este término.",
            }
            for k in range(n)
        ],
        "cierre": f"Ahora relacionas con soltura los elementos de {concept}.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=6,
    title="Relacionar Conceptos",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("parejas", "num_pairs"),
)
