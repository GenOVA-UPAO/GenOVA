"""ELABORATE 6 — Escenario Ramificado: árbol de decisiones del DBA con consecuencias, desenlaces y mapa de ramas."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_decisions", 3, min=2, max=3, help="Niveles de decisión del árbol (2 = 4 desenlaces, 3 = 8)"),
)

NEEDED_ENDINGS = 2


def _node(level: int) -> dict:
    """Nodo con `level` decisiones por delante; el último nivel termina en desenlace."""
    if level <= 1:
        opt = obj(texto=s(130), desenlace=s(320), leccion_aprendida=s(230))
    else:
        opt = obj(texto=s(130), consecuencia=s(230), siguiente_nodo=_node(level - 1))
    return obj(situacion=s(440), opciones=arr(opt, 2, 2))


def schema(p: dict) -> dict:
    return obj(
        titulo=s(70),
        introduccion=s(220),
        nodo_raiz=_node(p["num_decisions"]),
        cierre=s(230),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = p["num_decisions"]
    return f"""[ROL] Diseñador de escenarios de decisión para administradores de bases de datos Oracle.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña un escenario ramificado de {d} niveles de decisión sobre «{concept}», donde el estudiante hace de DBA en una situación crítica (p. ej. tablespace al 95 %, bloqueo ORA-00060, borrado accidental de datos).
- titulo: título corto del escenario.
- introduccion: contexto inicial que da el rol y la urgencia (≤30 palabras).
- nodo_raiz: la primera situación (≈60 palabras: qué síntomas ve el DBA, qué métricas o errores aparecen) con EXACTAMENTE 2 `opciones` (decisiones no triviales: las dos parecen razonables, una es mejor que la otra según el concepto).
  * En los niveles intermedios cada opción tiene `texto` (la decisión, ≤18 palabras), `consecuencia` (qué ocurre de inmediato y por qué, ≤30 palabras) y `siguiente_nodo` (la nueva situación con otras 2 opciones, con la misma estructura).
  * En el último nivel cada opción tiene `texto`, `desenlace` (resultado final en ≈40 palabras, con consecuencias para el negocio) y `leccion_aprendida` (qué principio de «{concept}» lo explica, ≤30 palabras).
- cierre: reflexión sobre cómo decidir bajo presión aplicando «{concept}».
[RESTRICCIONES] Los desenlaces deben diferir (no todo es éxito o desastre); las consecuencias justifican técnicamente el resultado.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _norm(node: dict, depth: int) -> dict:
    """Árbol compacto para el JS (claves cortas); tolera ramas incompletas."""
    opts = []
    for o in (node.get("opciones") or [])[:2]:
        if depth <= 1:
            opts.append({"t": o.get("texto", ""), "d": o.get("desenlace", ""), "l": o.get("leccion_aprendida", "")})
        else:
            nxt = o.get("siguiente_nodo")
            opts.append(
                {
                    "t": o.get("texto", ""),
                    "c": o.get("consecuencia", ""),
                    "n": _norm(nxt, depth - 1) if isinstance(nxt, dict) else None,
                }
            )
    return {"s": node.get("situacion", ""), "o": opts}


def render(data: dict, ctx: RenderContext) -> str:
    depth = int(ctx.params.get("num_decisions", 3))
    tree = _norm(data["nodo_raiz"], depth)
    return f"""
{header("ESCENARIO RAMIFICADO", data["titulo"], data["introduccion"])}
{KIT_CSS}
<style>
.er-opts{{display:grid;gap:10px;margin-top:10px}}
.er-log{{margin:0;padding-left:1.3rem;display:grid;gap:4px}}
.er-svg{{display:block;width:100%;height:auto;max-width:480px;margin-inline:auto}}
.er-edge{{stroke:var(--border);stroke-width:3;fill:none}}
.er-edge.on{{stroke:var(--primary);stroke-width:4}}
.er-dot{{fill:var(--surface);stroke:var(--border);stroke-width:3}}
.er-dot.on{{fill:var(--primary);stroke:var(--primary)}}
.er-leaf{{fill:var(--surface);stroke:var(--text-muted);stroke-width:3}}
.er-leaf.found{{fill:var(--success);stroke:var(--success)}}
</style>
{progress(NEEDED_ENDINGS, "Desenlaces distintos descubiertos")}
<article class="k-panel ova-stack" id="er-card" aria-live="polite">
<div class="k-row"><span class="k-chip" id="er-lvl"></span></div>
<div class="k-fb k-hide" id="er-cons"></div>
<p id="er-sit"></p>
<div class="er-opts" id="er-opts"></div>
<div id="er-end" class="ova-stack k-hide"></div></article>
<section class="ova-card ova-stack" aria-labelledby="er-map-h"><h2 id="er-map-h">Mapa de ramas</h2>
<upao-figure caption="Figura 1. Cada hoja es un desenlace; las verdes ya las descubriste."><svg id="er-svg" class="er-svg" viewBox="0 0 400 200" role="img" aria-label="Árbol de decisiones con sus desenlaces"><title>Árbol de decisiones</title></svg></upao-figure>
<div class="k-row"><span class="k-chip" id="er-found" aria-live="polite"></span>
<button type="button" class="k-btn" id="er-again">↺ Explorar otra rama</button></div>
<ol class="er-log" id="er-log" aria-label="Decisiones tomadas"></ol></section>
{summary(data["cierre"], "Reflexión")}
{json_data({"tree": tree, "depth": depth, "need": NEEDED_ENDINGS})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const found = new Set(), total = Math.pow(2, D.depth);
let node, path, level;
function sv(tag, a) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; }
function map() {
  const svg = $('er-svg'), W = 400, H = 40 + 46 * D.depth; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.textContent = '';
  const pos = (lv, idx) => { const n = Math.pow(2, lv); return [W * (idx + 0.5) / n, 20 + 46 * lv]; };
  const cur = path.join('');
  function walk(lv, idx, key) {
    if (lv >= D.depth) return;
    [0, 1].forEach(c => {
      const a = pos(lv, idx), b = pos(lv + 1, idx * 2 + c), k2 = key + c;
      const on = cur.startsWith(k2) || found.has(k2) || Array.from(found).some(f => f.startsWith(k2));
      const ln = sv('path', { d: 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1], class: 'er-edge' + (on ? ' on' : '') });
      svg.appendChild(ln); walk(lv + 1, idx * 2 + c, k2);
    });
  }
  walk(0, 0, '');
  const dots = (lv, idx, key) => {
    const p = pos(lv, idx);
    if (lv === D.depth) { const c = sv('circle', { cx: p[0], cy: p[1], r: 9, class: 'er-leaf' + (found.has(key) ? ' found' : '') }); svg.appendChild(c); return; }
    const on = cur.startsWith(key);
    svg.appendChild(sv('circle', { cx: p[0], cy: p[1], r: 8, class: 'er-dot' + (on ? ' on' : '') }));
    dots(lv + 1, idx * 2, key + '0'); dots(lv + 1, idx * 2 + 1, key + '1');
  };
  dots(0, 0, '');
}
function showNode() {
  $('er-sit').textContent = node.s; $('er-lvl').textContent = 'Decisión ' + (level + 1) + ' de ' + D.depth;
  const box = $('er-opts'); box.textContent = ''; $('er-end').classList.add('k-hide');
  node.o.forEach((o, i) => {
    const b = el('button', 'ova-option', o.t); b.type = 'button';
    b.addEventListener('click', () => choose(o, i)); box.appendChild(b);
  });
  map();
}
function choose(o, i) {
  path.push(i);
  const li = el('li', '', 'Decisión ' + (level + 1) + ': ' + o.t); $('er-log').appendChild(li);
  if (o.n) {
    const c = $('er-cons'); c.classList.remove('k-hide'); c.textContent = 'Consecuencia: ' + o.c;
    node = o.n; level++; showNode(); return;
  }
  const key = path.join(''); found.add(key);
  $('er-opts').textContent = ''; $('er-cons').classList.add('k-hide');
  const end = $('er-end'); end.textContent = ''; end.classList.remove('k-hide');
  end.appendChild(el('div', 'k-fb ok', 'Desenlace: ' + o.d));
  end.appendChild(el('p', 'k-label', 'Lección aprendida')); end.appendChild(el('p', '', o.l));
  $('er-sit').textContent = 'Fin de esta rama.'; $('er-lvl').textContent = 'Desenlace alcanzado';
  $('er-found').textContent = 'Desenlaces descubiertos: ' + found.size + ' de ' + total;
  if (found.size >= 1) window.ovaMark('fin-1');
  if (found.size >= D.need) window.ovaMark('fin-2');
  map();
}
function start() {
  node = D.tree; path = []; level = 0; $('er-log').textContent = ''; $('er-cons').classList.add('k-hide');
  $('er-found').textContent = 'Desenlaces descubiertos: ' + found.size + ' de ' + total; showNode();
}
$('er-again').addEventListener('click', start);
start();
''')}
"""


def _sample_node(level: int, tag: str, concept: str) -> dict:
    opts = []
    for k in (1, 2):
        t = f"{tag}{k}"
        if level <= 1:
            opts.append(
                {
                    "texto": f"Decisión {t}: actúa sobre {concept}.",
                    "desenlace": f"Desenlace de la rama {t}: el sistema {'se estabiliza' if k == 1 else 'queda degradado'}.",
                    "leccion_aprendida": f"La rama {t} muestra el principio de {concept}.",
                }
            )
        else:
            opts.append(
                {
                    "texto": f"Decisión {t}: ajusta un parámetro.",
                    "consecuencia": f"Efecto inmediato de {t} sobre el sistema.",
                    "siguiente_nodo": _sample_node(level - 1, t + ".", concept),
                }
            )
    return {"situacion": f"Situación {tag or 'inicial'}: el DBA observa síntomas relacionados con {concept}.", "opciones": opts}


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Crisis de {concept}"[:70],
        "introduccion": "Eres el DBA de guardia y debes decidir bajo presión.",
        "nodo_raiz": _sample_node(p["num_decisions"], "", concept),
        "cierre": "Decidir bien es leer la evidencia y anticipar la consecuencia.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=6,
    title="Escenario Ramificado",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
