"""EVALUATE 7 — Crucigrama Conceptual: la cuadrícula se calcula en Python a partir de las respuestas."""

from __future__ import annotations

import re
import unicodedata

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, NORM_JS

PARAMS = (
    Param("num_terms", 6, min=5, max=8, help="Número de términos del crucigrama"),
)

_CSS = """
<style>
.cw-wrap{overflow:auto;max-width:100%;padding:6px}
.cw-grid{display:grid;gap:2px;width:max-content}
.cw-cell{position:relative;width:36px;height:36px}
.cw-cell .cw-n{position:absolute;top:1px;left:3px;font-size:.62rem;font-weight:700;color:var(--primary,#0A3D91);pointer-events:none}
.ev-cell{width:100%;height:100%;padding:8px 0 0;text-align:center;font:inherit;font-weight:800;text-transform:uppercase;border:2px solid var(--primary,#0A3D91);border-radius:4px;background:var(--surface,#fff);color:var(--text,#1b2437);caret-color:var(--accent,#F47A20)}
.ev-cell.is-active{background:var(--surface-tint,#eef2ff)}
.ev-cell.is-ok{background:rgba(26,127,75,.18);border-color:var(--success,#1a7f4b)}
.ev-cell.is-bad{background:rgba(192,57,43,.15);border-color:var(--danger,#c0392b)}
.cw-clues{display:grid;gap:var(--space-3,16px)}
@media (min-width:640px){.cw-clues{grid-template-columns:1fr 1fr}}
.cw-clues ol{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.cw-clue{display:flex;gap:8px;align-items:flex-start;width:100%;text-align:left;padding:8px 10px;border:1px solid var(--border,#cbd5e1);border-radius:10px;background:var(--surface,#fff);color:var(--text,#1b2437);font:inherit;cursor:pointer;min-height:44px}
.cw-clue:hover{border-color:var(--primary,#0A3D91)}
.cw-clue:focus-visible{outline:3px solid var(--primary,#0A3D91);outline-offset:2px}
.cw-clue.is-ok{border-color:var(--success,#1a7f4b);background:rgba(26,127,75,.10)}
.cw-num{flex:none;font-weight:800;color:var(--primary,#0A3D91);min-width:1.6em}
</style>
"""


def schema(p: dict) -> dict:
    n = p["num_terms"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        entradas=arr(obj(respuesta=s(18), pista=s(180)), min_items=n, max_items=n),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_terms"]
    return f"""[ROL] Creador de crucigramas conceptuales para universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Crea {n} entradas de crucigrama sobre «{concept}». El sistema arma la cuadrícula cruzando las palabras, así que elige términos que compartan letras entre sí (vocales y consonantes frecuentes: A, E, O, R, S, N, I).
- titulo: título corto del crucigrama.
- instrucciones: una frase (escribe en cada casilla, usa las pistas, pulsa «Comprobar»).
- entradas: exactamente {n}. Cada una con:
  * `respuesta`: término de UNA sola palabra, 4 a 12 letras, sin espacios, guiones ni números, sin abreviaturas salvo SGA/PGA. Tildes permitidas (se ignoran al validar).
  * `pista`: definición justa que lleve a esa palabra sin contenerla (≤25 palabras).
- cierre: frase que consolide los términos practicados.
[RESTRICCIONES] Palabras distintas entre sí. Términos reales del dominio, no genéricos.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _clean(word: str) -> str:
    base = unicodedata.normalize("NFD", str(word or ""))
    base = "".join(ch for ch in base if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^A-Za-z]", "", base).upper()


def build_layout(words: list[str]) -> list[dict]:
    """Coloca las palabras cruzándolas (voraz). Devuelve [{i, w, r, c, d}] con d='h'|'v'."""
    cells: dict[tuple[int, int], tuple[str, set]] = {}
    placed: list[dict] = []

    def free(rc):
        return rc not in cells

    def can_place(w, r, c, d):
        dr, dc = (0, 1) if d == "h" else (1, 0)
        pr, pc = (1, 0) if d == "h" else (0, 1)  # perpendicular
        if not free((r - dr, c - dc)) or not free((r + dr * len(w), c + dc * len(w))):
            return -1
        cross = 0
        for k, ch in enumerate(w):
            rr, cc = r + dr * k, c + dc * k
            if (rr, cc) in cells:
                letter, dirs = cells[(rr, cc)]
                if letter != ch or d in dirs:
                    return -1
                cross += 1
            elif not free((rr - pr, cc - pc)) or not free((rr + pr, cc + pc)):
                return -1
        return cross

    def put(i, w, r, c, d):
        dr, dc = (0, 1) if d == "h" else (1, 0)
        for k, ch in enumerate(w):
            key = (r + dr * k, c + dc * k)
            letter, dirs = cells.get(key, (ch, set()))
            dirs.add(d)
            cells[key] = (letter, dirs)
        placed.append({"i": i, "w": w, "r": r, "c": c, "d": d})

    order = sorted(range(len(words)), key=lambda i: -len(words[i]))
    for i in order:
        w = words[i]
        if not placed:
            put(i, w, 0, 0, "h")
            continue
        best = None
        for p in placed:
            nd = "v" if p["d"] == "h" else "h"
            for a, ch in enumerate(w):
                for b, pch in enumerate(p["w"]):
                    if ch != pch:
                        continue
                    if p["d"] == "h":
                        r, c = p["r"] - a, p["c"] + b
                    else:
                        r, c = p["r"] + b, p["c"] - a
                    cross = can_place(w, r, c, nd)
                    if cross < 1:
                        continue
                    min_r = min(rr for rr, _ in cells)
                    max_r = max(rr for rr, _ in cells)
                    min_c = min(cc for _, cc in cells)
                    max_c = max(cc for _, cc in cells)
                    h = (max(max_r, r + (len(w) - 1 if nd == "v" else 0)) - min(min_r, r) + 1)
                    wd = (max(max_c, c + (len(w) - 1 if nd == "h" else 0)) - min(min_c, c) + 1)
                    score = (cross, -(h * wd) - abs(h - wd))
                    if best is None or score > best[0]:
                        best = (score, r, c, nd)
        if best:
            put(i, w, best[1], best[2], best[3])
        else:  # sin cruce posible: fila libre debajo, para que siempre quepa
            max_r = max(rr for rr, _ in cells)
            put(i, w, max_r + 2, 0, "h")
    min_r = min(p["r"] for p in placed)
    min_c = min(p["c"] for p in placed)
    for p in placed:
        p["r"] -= min_r
        p["c"] -= min_c
    return placed


def render(data: dict, ctx: RenderContext) -> str:
    entries = data["entradas"]
    words = []
    meta = []
    for e in entries:
        w = _clean(e["respuesta"])
        if 2 <= len(w) <= 24:
            words.append(w)
            meta.append(e)
    layout = build_layout(words) if words else []
    # numeración por orden de lectura
    starts = sorted({(p["r"], p["c"]) for p in layout})
    num_of = {rc: n for n, rc in enumerate(starts, 1)}
    for p in layout:
        p["n"] = num_of[(p["r"], p["c"])]
        p["pista"] = meta[p["i"]]["pista"]
    rows = max((p["r"] + (len(p["w"]) if p["d"] == "v" else 1) for p in layout), default=1)
    cols = max((p["c"] + (len(p["w"]) if p["d"] == "h" else 1) for p in layout), default=1)
    occupied = {}
    for wi, p in enumerate(layout):
        for k in range(len(p["w"])):
            rc = (p["r"] + (k if p["d"] == "v" else 0), p["c"] + (k if p["d"] == "h" else 0))
            occupied.setdefault(rc, [])
            occupied[rc].append(wi)
    grid = []
    for r in range(rows):
        for c in range(cols):
            if (r, c) in occupied:
                num = f'<span class="cw-n" aria-hidden="true">{num_of[(r, c)]}</span>' if (r, c) in num_of else ""
                grid.append(
                    f'<div class="cw-cell">{num}<input class="ev-cell" type="text" maxlength="1" '
                    f'autocomplete="off" autocapitalize="characters" spellcheck="false" '
                    f'data-r="{r}" data-c="{c}" aria-label="Fila {r + 1}, columna {c + 1}"></div>'
                )
            else:
                grid.append('<div class="cw-cell" aria-hidden="true"></div>')

    def clues(d: str) -> str:
        lis = "".join(
            f'<li><button type="button" class="cw-clue" data-w="{wi}"><span class="cw-num">{p["n"]}.</span>'
            f'<span>{esc(p["pista"])} <em>({len(p["w"])} letras)</em></span></button></li>'
            for wi, p in sorted(enumerate(layout), key=lambda x: x[1]["n"])
            if p["d"] == d
        )
        return lis

    n = len(layout)
    payload = [{"w": p["w"], "r": p["r"], "c": p["c"], "d": p["d"], "n": p["n"]} for p in layout]
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="CRUCIGRAMA" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{max(n, 1)}" label="Palabras correctas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{max(n, 1) * 10}" label="Puntuación"></upao-score>
</div>
<section class="ev-card ova-stack" aria-label="Cuadrícula del crucigrama">
  <div class="cw-wrap"><div class="cw-grid" id="grid" role="group" aria-label="Cuadrícula" style="grid-template-columns:repeat({cols},36px)">{"".join(grid)}</div></div>
  <div class="ev-row">
    <button type="button" class="ev-btn" id="btn-check">Comprobar</button>
    <button type="button" class="ev-btn is-ghost" id="btn-reveal" disabled>Mostrar solución</button>
  </div>
  <div class="ev-fb" id="msg" role="status" aria-live="polite" hidden></div>
</section>
<section class="cw-clues">
  <div><h2>Horizontales</h2><ol>{clues("h")}</ol></div>
  <div><h2>Verticales</h2><ol>{clues("v")}</ol></div>
</section>
<section class="ev-card ev-result" id="result" aria-live="polite" hidden><p class="ev-big" id="result-big"></p><p id="result-msg"></p></section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar crucigrama" locked></upao-complete></upao-summary>
{json_data({"words": payload})}
{script(PROGRESS_JS)}
{script(NORM_JS + '''
const words = JSON.parse(document.getElementById('ova-data').textContent).words;
const $ = id => document.getElementById(id);
const score = $('score');
const cell = {};
document.querySelectorAll('.ev-cell').forEach(i => { cell[i.dataset.r + ',' + i.dataset.c] = i; });
const total = words.length;
const credited = new Set();
let active = 0, dir = 'h', checks = 0, revealed = false;

function pos(w, k) { return (w.r + (w.d === 'v' ? k : 0)) + ',' + (w.c + (w.d === 'h' ? k : 0)); }
function wordsAt(key) { return words.map((w, i) => i).filter(i => { for (let k = 0; k < words[i].w.length; k++) if (pos(words[i], k) === key) return true; return false; }); }
function setActive(i) {
  active = i;
  document.querySelectorAll('.ev-cell').forEach(c => c.classList.remove('is-active'));
  for (let k = 0; k < words[i].w.length; k++) cell[pos(words[i], k)].classList.add('is-active');
}
function indexIn(i, key) { for (let k = 0; k < words[i].w.length; k++) if (pos(words[i], k) === key) return k; return -1; }
Object.keys(cell).forEach(function (key) {
  const inp = cell[key];
  inp.addEventListener('focus', function () {
    const ws = wordsAt(key);
    if (!ws.length) return;
    const same = ws.find(i => i === active);
    setActive(same !== undefined ? same : (ws.find(i => words[i].d === dir) ?? ws[0]));
  });
  inp.addEventListener('click', function () {
    const ws = wordsAt(key);
    if (ws.length > 1) { const other = ws.find(i => i !== active); if (other !== undefined) setActive(other); }
  });
  inp.addEventListener('input', function () {
    inp.value = inp.value.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1);
    inp.classList.remove('is-bad', 'is-ok');
    if (!inp.value) return;
    const k = indexIn(active, key);
    if (k >= 0 && k + 1 < words[active].w.length) cell[pos(words[active], k + 1)].focus();
  });
  inp.addEventListener('keydown', function (e) {
    const [r, c] = key.split(',').map(Number);
    const mv = {ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0]}[e.key];
    if (mv) { const t = cell[(r + mv[0]) + ',' + (c + mv[1])]; if (t) { e.preventDefault(); dir = mv[0] ? 'v' : 'h'; t.focus(); } return; }
    if (e.key === 'Backspace' && !inp.value) {
      const k = indexIn(active, key);
      if (k > 0) { const t = cell[pos(words[active], k - 1)]; t.value = ''; t.focus(); e.preventDefault(); }
    }
  });
});
document.querySelectorAll('.cw-clue').forEach(function (b) {
  b.addEventListener('click', function () {
    const i = Number(b.dataset.w);
    dir = words[i].d; setActive(i); cell[pos(words[i], 0)].focus();
  });
});
function wordOk(i) {
  for (let k = 0; k < words[i].w.length; k++) if ((cell[pos(words[i], k)].value || '').toUpperCase() !== words[i].w[k]) return false;
  return true;
}
function check() {
  checks++;
  let right = 0;
  Object.keys(cell).forEach(k => cell[k].classList.remove('is-ok', 'is-bad'));
  words.forEach(function (w, i) {
    const ok = wordOk(i);
    if (ok) { right++; if (!credited.has(i)) { credited.add(i); score.add(10); window.ovaMark('w' + i); } }
    for (let k = 0; k < w.w.length; k++) {
      const c = cell[pos(w, k)];
      if (c.value && c.value.toUpperCase() !== w.w[k]) c.classList.add('is-bad');
      else if (ok) c.classList.add('is-ok');
    }
    const btn = document.querySelector('.cw-clue[data-w="' + i + '"]');
    if (btn) btn.classList.toggle('is-ok', ok);
  });
  $('btn-reveal').disabled = false;
  say($('msg'), right + ' de ' + total + ' palabras correctas.' + (right < total ? ' Las casillas en rojo tienen una letra equivocada.' : ''), right === total ? 'ok' : 'bad');
  if (right === total) finish();
}
function finish() {
  $('result').hidden = false;
  $('result-big').textContent = credited.size + ' / ' + total + ' palabras por mérito propio';
  $('result-msg').textContent = revealed ? 'Revisa los términos que se mostraron para repasarlos.' : 'Crucigrama resuelto sin ayuda.';
}
$('btn-check').addEventListener('click', check);
$('btn-reveal').addEventListener('click', function () {
  revealed = true;
  words.forEach(function (w, i) {
    for (let k = 0; k < w.w.length; k++) { const c = cell[pos(w, k)]; c.value = w.w[k]; c.classList.remove('is-bad'); c.classList.add('is-ok'); }
    window.ovaMark('w' + i);
    const btn = document.querySelector('.cw-clue[data-w="' + i + '"]'); if (btn) btn.classList.add('is-ok');
  });
  say($('msg'), 'Solución mostrada. Solo cuentan para el puntaje las palabras que resolviste tú.', '');
  finish();
});
if (total) { setActive(0); }
''')}
"""


def sample(concept: str, p: dict) -> dict:
    base = [
        ("INDICE", "Estructura auxiliar que acelera la búsqueda de filas por clave."),
        ("RAIZ", "Bloque superior donde empieza el descenso por el árbol."),
        ("HOJA", "Bloque final que almacena claves ordenadas y sus ROWID."),
        ("ROWID", "Dirección física única de una fila en Oracle."),
        ("ALTURA", "Cantidad de niveles que se recorren hasta una hoja."),
        ("OPTIMIZADOR", "Componente que decide el plan de ejecución según el costo."),
        ("CLAVE", "Valor de la columna indexada por el que se ordena el árbol."),
        ("RANGO", "Tipo de escaneo que recorre hojas contiguas entre dos valores."),
    ]
    n = p["num_terms"]
    return {
        "titulo": f"Crucigrama: {concept}"[:70],
        "instrucciones": "Escribe cada palabra en su casilla; pulsa Comprobar para validar.",
        "entradas": [{"respuesta": a, "pista": b} for a, b in base[:n]],
        "cierre": f"Los términos de {concept} ya forman parte de tu vocabulario.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=7,
    title="Crucigrama Conceptual",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
