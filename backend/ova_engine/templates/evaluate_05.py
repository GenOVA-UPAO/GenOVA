"""EVALUATE 5 — Completar Espacios: oraciones con huecos, validación sin tildes/mayúsculas y reintento."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, NORM_JS

PARAMS = (
    Param("num_sentences", 5, min=4, max=8, help="Número de oraciones con hueco"),
    Param("word_bank", "si", choices=("si", "no"), help="Mostrar banco de palabras como ayuda"),
)

_CSS = """
<style>
.cz-sent{display:flex;flex-wrap:wrap;gap:8px;align-items:center;line-height:1.9}
.cz-in{display:inline-block;width:auto;min-width:9ch;max-width:100%;text-align:center;font-weight:700}
.cz-in.is-ok{border-color:var(--success,#1a7f4b);background:rgba(26,127,75,.10)}
.cz-in.is-bad{border-color:var(--danger,#c0392b);background:rgba(192,57,43,.10)}
.cz-bank{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.cz-bank li{padding:4px 12px;border-radius:999px;background:var(--surface-tint,#eef2ff);border:1px solid var(--border,#cbd5e1);font-weight:600}
</style>
"""


def schema(p: dict) -> dict:
    n = p["num_sentences"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        oraciones=arr(
            obj(antes=s(160), respuesta=s(30), despues=s(160, min_len=0), explicacion=s(180)),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_sentences"]
    return f"""[ROL] Diseñador de ejercicios de vocabulario técnico para universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña {n} oraciones sobre «{concept}», cada una con UN hueco que se completa con un término técnico.
- titulo: título corto del ejercicio.
- instrucciones: una frase que explique cómo completar (sin importar mayúsculas ni tildes).
- oraciones: exactamente {n}. Cada una con:
  * `antes`: el texto que va ANTES del hueco (≤20 palabras).
  * `respuesta`: el término exacto del hueco, UNA sola palabra o término corto sin espacios dobles (≤3 palabras); sin abreviaturas salvo SGA/PGA.
  * `despues`: el texto que va DESPUÉS del hueco (puede quedar muy corto, ≤20 palabras).
  * `explicacion`: por qué ese término es el correcto (≤25 palabras).
- cierre: frase que consolide el vocabulario practicado.
[RESTRICCIONES] La oración debe permitir deducir un único término. Las respuestas no deben repetirse. No incluyas el término en el resto de su oración.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    items = data["oraciones"]
    n = len(items)
    rows = []
    for k, o in enumerate(items):
        rows.append(
            f'<div class="ev-card ova-stack" data-k="{k}">'
            f'<span class="ev-badge">Oración {k + 1} de {n}</span>'
            f'<p class="cz-sent"><span>{esc(o["antes"])}</span>'
            f'<input class="ev-in cz-in" type="text" id="in{k}" data-k="{k}" autocomplete="off" '
            f'autocapitalize="off" spellcheck="false" aria-label="Hueco de la oración {k + 1}" '
            f'size="{max(9, min(24, len(o["respuesta"]) + 3))}">'
            f'<span>{esc(o["despues"])}</span></p>'
            f'<div class="ev-row"><button type="button" class="ev-btn" data-check="{k}">Comprobar</button></div>'
            f'<div class="ev-fb" id="fb{k}" role="status" aria-live="polite" hidden></div></div>'
        )
    bank = ""
    if ctx.params.get("word_bank", "si") == "si":
        words = sorted({str(o["respuesta"]).strip() for o in items}, key=str.lower)
        bank = (
            '<section class="ev-card" aria-label="Banco de palabras"><p><strong>Banco de palabras</strong></p>'
            f'<ul class="cz-bank">{"".join(f"<li>{esc(w)}</li>" for w in words)}</ul></section>'
        )
    payload = [{"a": o["respuesta"], "e": o["explicacion"]} for o in items]
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="COMPLETAR ESPACIOS" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Oraciones resueltas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{n * 10}" label="Puntuación"></upao-score>
</div>
{bank}
<div class="ova-stack">{"".join(rows)}</div>
<div class="ev-row"><button type="button" class="ev-btn is-ghost" id="btn-reset">Reintentar todo</button></div>
<section class="ev-card ev-result" id="result" aria-live="polite" hidden><p class="ev-big" id="result-big"></p><p id="result-msg"></p></section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar ejercicio" locked></upao-complete></upao-summary>
{json_data({"items": payload})}
{script(PROGRESS_JS)}
{script(NORM_JS + '''
const items = JSON.parse(document.getElementById('ova-data').textContent).items;
const $ = id => document.getElementById(id);
const score = $('score');
const total = items.length;
const state = items.map(() => ({tries: 0, done: false, pts: 0}));
// 10 puntos a la primera, 5 a la segunda, 0 si se revela la respuesta (tras 2 fallos)
function recompute() {
  const sum = state.reduce((a, s) => a + s.pts, 0);
  score.set(sum);
  if (state.every(s => s.done)) {
    const ok = state.filter(s => s.pts > 0).length;
    $('result').hidden = false;
    $('result-big').textContent = ok + ' / ' + total + ' resueltas por ti (' + sum + ' puntos)';
    $('result-msg').textContent = ok === total ? 'Vocabulario dominado.' : 'Las respuestas reveladas indican términos para repasar.';
  }
}
function check(k) {
  const st = state[k], inp = $('in' + k), fb = $('fb' + k);
  if (st.done) return;
  if (!inp.value.trim()) { say(fb, 'Escribe un término antes de comprobar.', ''); inp.focus(); return; }
  st.tries++;
  if (norm(inp.value) === norm(items[k].a)) {
    st.done = true; st.pts = st.tries === 1 ? 10 : 5;
    inp.classList.remove('is-bad'); inp.classList.add('is-ok'); inp.readOnly = true;
    say(fb, '✓ Correcto. ' + items[k].e, 'ok');
    window.ovaMark('s' + k);
  } else if (st.tries >= 2) {
    st.done = true; st.pts = 0;
    inp.value = items[k].a; inp.classList.remove('is-bad'); inp.classList.add('is-ok'); inp.readOnly = true;
    say(fb, '✗ La respuesta era «' + items[k].a + '». ' + items[k].e, 'bad');
    window.ovaMark('s' + k);
  } else {
    inp.classList.add('is-bad');
    say(fb, '✗ No es ese término. Inténtalo una vez más.', 'bad');
    inp.focus();
  }
  recompute();
}
document.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', () => check(Number(b.dataset.check))));
document.querySelectorAll('.cz-in').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') check(Number(i.dataset.k)); }));
$('btn-reset').addEventListener('click', function () {
  state.forEach((s, k) => {
    s.tries = 0; s.done = false; s.pts = 0;
    const i = $('in' + k); i.value = ''; i.readOnly = false; i.classList.remove('is-ok', 'is-bad');
    $('fb' + k).hidden = true;
  });
  $('result').hidden = true;
  score.set(0);
  document.querySelector('.cz-in').focus();
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_sentences"]
    base = [
        ("El bloque que inicia la búsqueda en un B-tree se llama bloque", "raíz", "del índice."),
        ("Los bloques", "hoja", "guardan las claves ordenadas y su ROWID."),
        ("El identificador físico de una fila en Oracle es el", "ROWID", "."),
        ("El componente que elige el plan de ejecución es el", "optimizador", "basado en costos."),
        ("Cuando un bloque se llena, ocurre una", "división", "de bloque."),
        ("La memoria que guarda bloques de datos leídos es el buffer", "cache", "de la SGA."),
        ("La sentencia para crear un índice es CREATE", "INDEX", "nombre ON tabla(columna)."),
        ("El número de niveles hasta la hoja se llama", "altura", "del índice."),
    ]
    return {
        "titulo": f"Completa: {concept}"[:70],
        "instrucciones": "Escribe el término que falta; no importan mayúsculas ni tildes.",
        "oraciones": [
            {
                "antes": base[k][0],
                "respuesta": base[k][1],
                "despues": base[k][2],
                "explicacion": f"Es el término técnico exacto en {concept}.",
            }
            for k in range(n)
        ],
        "cierre": f"Ya manejas el vocabulario básico de {concept}.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=5,
    title="Completar Espacios",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
