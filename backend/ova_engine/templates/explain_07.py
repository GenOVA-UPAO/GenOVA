"""EXPLAIN 7 — Línea de Tiempo: hitos navegables con curiosidad/legado y reto de ordenar cronológicamente."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_milestones", 5, min=3, max=6, help="Número de hitos de la línea de tiempo"),
)


def schema(p: dict) -> dict:
    n = p["num_milestones"]
    return obj(
        titulo=s(70),
        intro=s(180),
        hitos=arr(
            obj(
                anio=s(12),
                titulo=s(30),
                descripcion=s(320),
                dato_curioso=s(220),
                legado_actual=s(220),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_milestones"]
    return f"""[ROL] Historiador {d.pick("de los sistemas de bases de datos", "experto en «" + concept + "»")}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Escribe una línea de tiempo con exactamente {n} hitos verificables sobre la evolución de «{concept}», en orden cronológico y conectados causalmente (cada hito nace de un problema del anterior).
- titulo: título corto de la línea de tiempo.
- intro: una frase que presente el recorrido.
- hitos: por cada hito:
  * `anio`: año (solo el número, p. ej. «1970»).
  * `titulo`: nombre breve del hito (≤25 caracteres).
  * `descripcion`: crónica de lo ocurrido y por qué importó (≤45 palabras).
  * `dato_curioso`: una curiosidad verificable (≤25 palabras).
  * `legado_actual`: cómo sigue vigente hoy {d.pick("en Oracle u otros motores", "en el mundo actual")} (≤25 palabras).
- cierre: frase que enlace la historia con el uso actual de «{concept}».
[RESTRICCIONES] Sin mitos ni fechas inventadas; si una fecha es aproximada, usa el año más aceptado.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_JS = r'''
const H = JSON.parse(document.getElementById('ova-data').textContent).h;
const marks = Array.from(document.querySelectorAll('.tl-mark'));
let cur = 0;
const $ = id => document.getElementById(id);
function show(i) {
  cur = Math.max(0, Math.min(H.length - 1, i));
  const h = H[cur];
  $('tl-d-year').textContent = h.anio; $('tl-d-title').textContent = h.titulo;
  $('tl-d-desc').textContent = h.descripcion;
  $('tl-curio-t').textContent = h.curio; $('tl-legacy-t').textContent = h.legado;
  ['curio', 'legacy'].forEach(k => { $('tl-' + k + '-t').classList.add('k-hide'); $('tl-' + k).setAttribute('aria-expanded', 'false'); });
  marks.forEach((m, k) => { if (k === cur) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current'); });
  marks[cur].classList.add('seen');
  $('tl-prev').disabled = cur === 0; $('tl-next').disabled = cur === H.length - 1;
  window.ovaMark('hito-' + cur);
}
marks.forEach((m, k) => m.addEventListener('click', () => show(k)));
$('tl-prev').addEventListener('click', () => show(cur - 1));
$('tl-next').addEventListener('click', () => show(cur + 1));
['curio', 'legacy'].forEach(k => $('tl-' + k).addEventListener('click', () => {
  const t = $('tl-' + k + '-t'), open = t.classList.toggle('k-hide') === false;
  $('tl-' + k).setAttribute('aria-expanded', String(open));
}));
show(0);
// reto de ordenar
const yr = a => { const m = /-?\d+/.exec(a); return m ? parseInt(m[0], 10) : 0; };
const expected = H.map((h, i) => i).sort((a, b) => yr(H[a].anio) - yr(H[b].anio) || a - b);
let placed = [];
function drawOrder() {
  const pool = $('tl-pool'), slots = $('tl-slots'), fb = $('tl-ord-fb');
  pool.textContent = ''; slots.textContent = '';
  shuffleOrder.filter(i => !placed.includes(i)).forEach(i => {
    const b = el('button', 'k-btn', H[i].titulo); b.type = 'button';
    b.addEventListener('click', () => { placed.push(i); drawOrder(); });
    pool.appendChild(b);
  });
  placed.forEach((i, pos) => {
    const li = el('li'); const b = el('button', 'k-btn', H[i].titulo); b.type = 'button';
    b.setAttribute('aria-label', 'Posición ' + (pos + 1) + ': ' + H[i].titulo + '. Tocar para devolver');
    b.addEventListener('click', () => { placed.splice(pos, 1); fb.classList.add('k-hide'); drawOrder(); });
    li.appendChild(b); slots.appendChild(li);
  });
  if (placed.length === H.length) {
    const ok = placed.every((v, k) => yr(H[v].anio) === yr(H[expected[k]].anio));
    fb.classList.remove('k-hide');
    if (ok) { fb.className = 'k-fb ok'; fb.textContent = 'Correcto: ese es el orden histórico ('
      + expected.map(i => H[i].anio).join(' → ') + ').'; window.ovaMark('orden'); }
    else { fb.className = 'k-fb bad'; fb.textContent = 'El orden no es correcto. Toca un hito colocado para devolverlo y prueba de nuevo; fíjate en el problema que resuelve cada uno.'; }
  }
}
let shuffleOrder = shuffle(H.map((h, i) => i));
$('tl-reset').addEventListener('click', () => { placed = []; $('tl-ord-fb').classList.add('k-hide'); drawOrder(); });
drawOrder();
'''


def render(data: dict, ctx: RenderContext) -> str:
    hs = data["hitos"]
    n = len(hs)
    marks = "".join(
        f'<li><button type="button" class="tl-mark" data-i="{k}" aria-label="Hito {k + 1}: {esc(h["anio"])}, {esc(h["titulo"])}">'
        f'<span class="tl-dot" aria-hidden="true"></span><span class="tl-year">{esc(h["anio"])}</span>'
        f'<span class="tl-t">{esc(h["titulo"])}</span></button></li>'
        for k, h in enumerate(hs)
    )
    return f"""
{header("LÍNEA DE TIEMPO", data["titulo"], data["intro"])}
{KIT_CSS}
<style>
.tl-line{{list-style:none;margin:0;padding:0;display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}}
.tl-line li{{flex:1 0 96px}}
.tl-mark{{width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;background:var(--surface);
border:2px solid var(--border);border-radius:12px;font:inherit;cursor:pointer;color:var(--text);min-height:44px}}
.tl-mark:hover{{border-color:var(--primary)}}
.tl-mark[aria-current="step"]{{border-color:var(--primary);background:var(--surface-tint)}}
.tl-mark.seen .tl-dot{{background:var(--success)}}
.tl-dot{{width:14px;height:14px;border-radius:50%;background:var(--border);display:block}}
.tl-year{{font-weight:800;color:var(--primary)}}
.tl-t{{font-size:.78rem;text-align:center;line-height:1.2}}
.tl-ord{{display:flex;flex-wrap:wrap;gap:8px}}
.tl-slots{{margin:0;padding-left:1.4rem;display:grid;gap:6px}}
</style>
{progress(n + 1, "Hitos explorados y reto")}
<section aria-label="Línea de tiempo"><ol class="tl-line" id="tl-line">{marks}</ol></section>
<article class="k-panel ova-stack" id="tl-detail" aria-live="polite">
<div class="k-row"><span class="k-chip" id="tl-d-year"></span><h2 id="tl-d-title" style="margin:0"></h2></div>
<p id="tl-d-desc"></p>
<div class="k-row"><button type="button" class="k-btn" id="tl-curio" aria-expanded="false">Dato curioso</button>
<button type="button" class="k-btn" id="tl-legacy" aria-expanded="false">Legado actual</button></div>
<div class="k-fb k-hide" id="tl-curio-t"></div><div class="k-fb k-hide" id="tl-legacy-t"></div>
<div class="k-row"><button type="button" class="k-btn" id="tl-prev">← Anterior</button>
<button type="button" class="k-btn main" id="tl-next">Siguiente →</button></div>
</article>
<section class="ova-card ova-stack" aria-labelledby="tl-ord-h">
<h2 id="tl-ord-h">Reto: ordénalos cronológicamente</h2>
<p class="ova-muted">Toca los hitos del más antiguo al más reciente. Toca uno ya colocado para devolverlo.</p>
<div class="tl-ord" id="tl-pool"></div>
<ol class="tl-slots" id="tl-slots" aria-label="Tu orden"></ol>
<div class="k-row"><button type="button" class="k-btn" id="tl-reset">Reiniciar orden</button></div>
<div class="k-fb k-hide" id="tl-ord-fb" role="status" aria-live="polite"></div>
</section>
{summary(data["cierre"], "Resumen")}
{json_data({"h": [{"anio": h["anio"], "titulo": h["titulo"], "descripcion": h["descripcion"], "curio": h["dato_curioso"], "legado": h["legado_actual"]} for h in hs]})}
{script(PROGRESS_JS + UTIL_JS + _JS)}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Historia de {concept}"[:70],
        "intro": f"Un recorrido por los hitos que dieron forma a {concept}.",
        "hitos": [
            {
                "anio": str(1970 + 7 * k),
                "titulo": f"Hito {k + 1}",
                "descripcion": f"En este hito se resolvió una limitación del anterior y avanzó {concept}.",
                "dato_curioso": f"Dato curioso verificable del hito {k + 1}.",
                "legado_actual": f"Hoy el hito {k + 1} sigue presente en los motores modernos.",
            }
            for k in range(p["num_milestones"])
        ],
        "cierre": f"Conocer esta historia ayuda a entender por qué {concept} funciona como funciona.",
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=7,
    title="Línea de Tiempo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
