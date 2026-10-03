"""ELABORATE 9 — Juego de Estrategia: partida por turnos del DBA con estabilidad, puntaje y repaso de decisiones."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_turns", 6, min=4, max=8, help="Número de turnos de la partida"),
)

PTS = {2: 20, 1: 10, 0: 0}  # puntos por calidad de la decisión
STAB = {2: 5, 1: -5, 0: -20}  # efecto sobre la estabilidad del sistema


def schema(p: dict) -> dict:
    n = p["num_turns"]
    return obj(
        titulo=s(70),
        escenario=s(300),
        objetivo=s(190),
        recurso=s(34),
        turnos=arr(
            obj(
                situacion=s(270),
                opciones=arr(obj(texto=s(130), calidad=i(), consecuencia=s(250)), 3, 3),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_turns"]
    return f"""[ROL] Diseñador de juegos de estrategia para administradores de bases de datos Oracle.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña una partida de {n} turnos donde el estudiante, como DBA, protege un sistema aplicando las reglas reales de «{concept}» (p. ej. ordenar transacciones concurrentes, planificar copias de seguridad, gestionar espacio).
- titulo: título corto del juego.
- escenario: la situación inicial y la meta de la partida (≤45 palabras).
- objetivo: objetivo de aprendizaje observable («Al terminar podrás planificar…»).
- recurso: nombre del indicador de salud del sistema que se cuida (p. ej. «Estabilidad del sistema», «Disponibilidad»).
- turnos: EXACTAMENTE {n}, en orden, cada turno con una nueva `situacion` que dependa del anterior (≤40 palabras) y EXACTAMENTE 3 `opciones`:
  * `texto`: la decisión (≤20 palabras).
  * `calidad`: entero 2 (decisión óptima según «{concept}»), 1 (aceptable pero con costo) o 0 (decisión que viola las reglas de «{concept}»). Cada turno debe tener UNA opción con 2, UNA con 1 y UNA con 0.
  * `consecuencia`: qué ocurre y POR QUÉ, citando la regla de «{concept}» (≤35 palabras).
- cierre: estrategia general y cómo mejorar la próxima partida.
[RESTRICCIONES] Las reglas deben ser fieles a Oracle; las opciones malas deben parecer tentadoras.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    turns = [
        {
            "s": t["situacion"],
            "o": [{"t": o["texto"], "q": max(0, min(2, int(o["calidad"] or 0))), "c": o["consecuencia"]} for o in t["opciones"]],
        }
        for t in data["turnos"]
    ]
    n = len(turns)
    return f"""
{header("JUEGO DE ESTRATEGIA", data["titulo"])}
{KIT_CSS}
<style>
.ge-board{{display:flex;gap:6px;flex-wrap:wrap}}
.ge-tile{{width:34px;height:34px;border-radius:8px;border:2px solid var(--border);display:grid;place-items:center;font-weight:800;font-size:.85rem;background:var(--surface)}}
.ge-tile.cur{{border-color:var(--primary);box-shadow:0 0 0 3px var(--surface-tint)}}
.ge-tile.q2{{background:#EAF7F1;border-color:var(--success);color:var(--success)}}
.ge-tile.q1{{background:#FFF4DD;border-color:#C98A00;color:#8A5D00}}
.ge-tile.q0{{background:#FBEDED;border-color:var(--danger);color:var(--danger)}}
.ge-opts{{display:grid;gap:10px;margin-top:10px}}
.ge-hud{{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));align-items:center}}
.ge-rev li{{margin-bottom:6px}}
</style>
<upao-objective>{esc(data["objetivo"])}</upao-objective>
<article class="k-panel tint"><p class="k-label">Escenario</p><p>{esc(data["escenario"])}</p></article>
{progress(n, "Turnos jugados")}
<upao-figure caption="Figura 1. Tablero: cada casilla es un turno; el color indica la calidad de tu decisión (verde óptima, ámbar aceptable, rojo mala).">
<div class="ge-board" id="ge-board" role="list" aria-label="Tablero de turnos"></div></upao-figure>
<div class="ge-hud"><div><p class="k-label">{esc(data["recurso"])}</p><div class="k-meter" role="progressbar" aria-label="{esc(data['recurso'])}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70" id="ge-meter"><span id="ge-fill" style="width:70%"></span></div></div>
<upao-score id="sc" current="0" max="{20 * n}" label="Puntaje"></upao-score></div>
<upao-status id="ge-status" state="info">Turno 1: elige tu decisión.</upao-status>
<article class="k-panel ova-stack" id="ge-card" aria-live="polite">
<div class="k-row"><span class="k-chip" id="ge-turn"></span></div><p id="ge-sit"></p>
<div class="ge-opts" id="ge-opts"></div>
<div class="k-fb k-hide" id="ge-fb"></div>
<button type="button" class="k-btn main k-hide" id="ge-next">Siguiente turno →</button></article>
<section class="ova-card ova-stack k-hide" id="ge-end" aria-labelledby="ge-end-h"><h2 id="ge-end-h">Fin de la partida</h2>
<p id="ge-rating"></p><ol class="ge-rev" id="ge-rev"></ol>
<button type="button" class="k-btn" id="ge-again">↺ Jugar otra vez</button></section>
{summary(data["cierre"], "Estrategia")}
{json_data({"t": turns, "pts": PTS, "stab": STAB, "rec": data["recurso"]})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const N = D.t.length, MAX = 20 * N;
let turn, stab, pts, hist, replay = false;
function board() {
  const b = $('ge-board'); b.textContent = '';
  for (let k = 0; k < N; k++) {
    const t = el('div', 'ge-tile' + (k === turn ? ' cur' : '') + (hist[k] ? ' q' + hist[k].q : ''), hist[k] ? ['✗', '~', '✓'][hist[k].q] : String(k + 1));
    t.setAttribute('role', 'listitem'); t.setAttribute('aria-label', 'Turno ' + (k + 1) + (hist[k] ? ': calidad ' + hist[k].q : ''));
    b.appendChild(t);
  }
}
function hud() {
  $('ge-fill').style.width = stab + '%'; $('ge-meter').setAttribute('aria-valuenow', String(stab));
  $('ge-fill').style.background = stab > 55 ? 'var(--success)' : stab > 25 ? 'var(--accent)' : 'var(--danger)';
  const st = $('ge-status');
  st.setAttribute('state', stab > 55 ? 'success' : stab > 25 ? 'warning' : 'error');
  st.textContent = D.rec + ': ' + stab + ' %';
}
function play() {
  if (turn >= N || stab <= 0) return finish();
  const t = D.t[turn];
  $('ge-turn').textContent = 'Turno ' + (turn + 1) + ' de ' + N; $('ge-sit').textContent = t.s;
  $('ge-fb').classList.add('k-hide'); $('ge-next').classList.add('k-hide');
  const box = $('ge-opts'); box.textContent = '';
  shuffle(t.o.map((o, i) => i)).forEach(i => {
    const b = el('button', 'ova-option', t.o[i].t); b.type = 'button';
    b.addEventListener('click', () => pick(i)); box.appendChild(b);
  });
  board(); hud();
}
function pick(i) {
  const o = D.t[turn].o[i];
  Array.from($('ge-opts').children).forEach(b => b.disabled = true);
  hist[turn] = { q: o.q, i: i }; pts += D.pts[o.q]; stab = Math.max(0, Math.min(100, stab + D.stab[o.q]));
  const sc = $('sc'); if (sc && sc.set) sc.set(pts);
  const fb = $('ge-fb'); fb.classList.remove('k-hide'); fb.className = 'k-fb ' + (o.q === 2 ? 'ok' : o.q === 0 ? 'bad' : '');
  fb.textContent = (o.q === 2 ? '✓ Óptima (+' + D.pts[2] + '). ' : o.q === 1 ? '~ Aceptable (+' + D.pts[1] + '). ' : '✗ Mala decisión (+0). ') + o.c;
  if (!replay) window.ovaMark('turn-' + turn);
  hud(); board();
  const nx = $('ge-next'); nx.classList.remove('k-hide');
  nx.textContent = (turn + 1 >= N || stab <= 0) ? 'Ver resultado →' : 'Siguiente turno →'; nx.focus();
}
function finish() {
  $('ge-card').classList.add('k-hide'); $('ge-end').classList.remove('k-hide');
  const pct = Math.round(100 * pts / MAX);
  $('ge-rating').textContent = (stab <= 0 ? 'El sistema colapsó antes de terminar. ' : '') + 'Puntaje: ' + pts + ' de ' + MAX + ' (' + pct + ' %) — ' +
    (pct >= 80 && stab > 0 ? 'DBA experto.' : pct >= 50 ? 'DBA competente: repasa las decisiones marcadas.' : 'DBA en formación: revisa las reglas y vuelve a intentarlo.');
  const rev = $('ge-rev'); rev.textContent = '';
  hist.forEach((h, k) => {
    if (!h) return; const t = D.t[k], best = t.o.find(o => o.q === 2) || t.o[0];
    rev.appendChild(el('li', '', 'Turno ' + (k + 1) + ': elegiste «' + t.o[h.i].t + '»' + (h.q === 2 ? ' (óptima).' : '. Mejor opción: «' + best.t + '» — ' + best.c)));
  });
  if (!replay) for (let k = 0; k < N; k++) window.ovaMark('turn-' + k);
}
$('ge-next').addEventListener('click', () => { turn++; play(); });
$('ge-again').addEventListener('click', () => { replay = true; start(); });
function start() {
  turn = 0; stab = 70; pts = 0; hist = []; const sc = $('sc'); if (sc && sc.set) sc.set(0);
  $('ge-end').classList.add('k-hide'); $('ge-card').classList.remove('k-hide'); play();
}
start();
''')}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Estrategia: {concept}"[:70],
        "escenario": f"Eres el DBA de una tienda en línea; debes proteger la base de datos aplicando {concept}.",
        "objetivo": f"Al terminar podrás planificar decisiones correctas sobre {concept}.",
        "recurso": "Estabilidad del sistema",
        "turnos": [
            {
                "situacion": f"Turno {k}: llega una nueva demanda relacionada con {concept}.",
                "opciones": [
                    {"texto": f"Aplicar la regla correcta de {concept}", "calidad": 2, "consecuencia": "Respetas la regla y el sistema se mantiene consistente."},
                    {"texto": "Resolverlo a medias", "calidad": 1, "consecuencia": "Funciona, pero deja una deuda técnica que cobrará costo."},
                    {"texto": "Ignorar la regla por rapidez", "calidad": 0, "consecuencia": "Violas la regla y aparecen inconsistencias."},
                ],
            }
            for k in range(1, p["num_turns"] + 1)
        ],
        "cierre": "La mejor estrategia es respetar las reglas aunque parezca más lento.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=9,
    title="Juego de Estrategia",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
