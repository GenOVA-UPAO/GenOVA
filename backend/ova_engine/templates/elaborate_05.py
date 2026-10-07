"""ELABORATE 5 — Análisis de Datos: tabla filtrable/ordenable, dos gráficos SVG reactivos y preguntas de conclusión."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, i, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_questions", 3, min=2, max=4, help="Número de preguntas de interpretación"),
)


def schema(p: dict) -> dict:
    n = p["num_questions"]
    return obj(
        titulo=s(70),
        contexto=s(260),
        columnas=obj(nombre=s(24), categoria=s(24), valor_a=s(28), valor_b=s(28)),
        registros=arr(obj(nombre=s(30), categoria=s(24), valor_a=i(), valor_b=i()), 15, 18),
        ejemplo=s(300),
        preguntas=arr(
            obj(
                enunciado=s(210),
                opciones=arr(obj(texto=s(110), correcta=b(), feedback=s(210)), 3, 4),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_questions"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        f"""[ROL] Diseñador de dashboards de monitoreo de bases de datos {d.bd_adj}.""",
        f"""[ROL] Diseñador de tableros de datos para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Crea un conjunto de datos de monitoreo relacionado con «{concept}» (p. ej. como saldría de {d.si_oracle("DBA_SEGMENTS, V$SESSION o un reporte Statspack", "una consulta de monitoreo o un reporte de rendimiento")}) para analizarlo con una tabla y dos gráficos.""",
        f"""[TAREA] Crea un conjunto de datos plausible relacionado con «{concept}» (como el que saldría de una medición, encuesta, experimento o registro del área) para analizarlo con una tabla y dos gráficos.""",
    )
    _l3 = d.pick(
        """- contexto: qué se monitorea y qué decisión debe tomar el DBA (≤40 palabras).""",
        """- contexto: qué se mide y qué decisión debe tomar el estudiante con ello (≤40 palabras).""",
    )
    _l4 = d.pick(
        f"""- columnas: nombres de columna: `nombre` (qué identifica cada registro, p. ej. «Segmento»), `categoria` (la agrupación, p. ej. «{d.si_oracle("Tablespace", "Tabla")}»), `valor_a` (primera métrica con su unidad, p. ej. «Tamaño (MB)») y `valor_b` (segunda métrica con unidad, p. ej. «Lecturas físicas»).""",
        """- columnas: nombres de columna: `nombre` (qué identifica cada registro), `categoria` (la agrupación), `valor_a` (primera magnitud con su unidad) y `valor_b` (segunda magnitud con unidad), todo propio del tema.""",
    )
    _l5 = d.pick(
        """[RESTRICCIONES] Las respuestas correctas deben ser verificables con los datos; no uses datos contradictorios.""",
        f"""[RESTRICCIONES] Las respuestas correctas deben ser verificables con los datos; no uses datos contradictorios. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
- titulo: título corto del dashboard.
{_l3}
{_l4}
- registros: entre 15 y 18 registros plausibles: `nombre`, `categoria` (usa solo 3 o 4 categorías distintas, repetidas), `valor_a` y `valor_b` (enteros positivos; incluye 1 o 2 valores atípicos y alguna relación visible entre A y B).
- ejemplo: ejemplo trabajado de cómo leer los datos y llegar a una conclusión (≤45 palabras, citando registros concretos).
- preguntas: EXACTAMENTE {n} preguntas de interpretación que SE RESPONDAN con los datos generados (p. ej. cuál es el mayor, qué categoría concentra el problema, qué relación hay entre A y B), cada una con 3-4 opciones, UNA `correcta: true` y un `feedback` que explique el porqué citando valores.
- cierre: conclusión de monitoreo y acción recomendada.
{_l5}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    cols = data["columnas"]
    recs = [
        {"n": r["nombre"], "c": r["categoria"], "a": int(r["valor_a"] or 0), "b": int(r["valor_b"] or 0)}
        for r in data["registros"]
    ]
    cats = []
    for r in recs:
        if r["c"] not in cats:
            cats.append(r["c"])
    qs = data["preguntas"]
    qhtml = "".join(
        f'<upao-question number="{k + 1}" prompt="{esc(q["enunciado"])}">'
        + "".join(
            f'<upao-choice group="da-q{k}" value="{chr(65 + j)}" correct="{str(bool(o["correcta"])).lower()}" '
            f'feedback="{esc(o["feedback"])}">{esc(o["texto"])}</upao-choice>'
            for j, o in enumerate(q["opciones"])
        )
        + "</upao-question>"
        for k, q in enumerate(qs)
    )
    return f"""
{header("ANÁLISIS DE DATOS", data["titulo"], data["contexto"])}
{KIT_CSS}
<style>
.da-svg{{display:block;width:100%;height:auto}}
.da-t{{font-size:10px;fill:var(--text)}}
.da-sort{{background:none;border:0;font:inherit;font-weight:700;color:var(--primary);cursor:pointer;padding:4px;min-height:32px}}
.da-leg{{display:flex;flex-wrap:wrap;gap:10px;font-size:.82rem}}
.da-sw{{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:4px;vertical-align:-1px}}
</style>
{progress(len(qs), "Preguntas respondidas")}
<upao-example title="Ejemplo trabajado de lectura"><p>{esc(data["ejemplo"])}</p></upao-example>
<div class="k-row"><label for="da-cat" class="k-label">Filtrar por {esc(cols["categoria"])}</label>
<select id="da-cat" class="ova-input k-grow"><option value="">Todas</option>{"".join(f'<option value="{esc(c)}">{esc(c)}</option>' for c in cats)}</select>
<span class="k-chip" id="da-count" aria-live="polite"></span></div>
<div class="ova-table-scroll" role="region" aria-label="Tabla de datos" tabindex="0"><table><caption>Registros de monitoreo (ordena con los encabezados)</caption>
<thead><tr><th scope="col" aria-sort="none"><button type="button" class="da-sort" data-key="n">{esc(cols["nombre"])} ↕</button></th>
<th scope="col" aria-sort="none"><button type="button" class="da-sort" data-key="c">{esc(cols["categoria"])} ↕</button></th>
<th scope="col" aria-sort="none"><button type="button" class="da-sort" data-key="a">{esc(cols["valor_a"])} ↕</button></th>
<th scope="col" aria-sort="none"><button type="button" class="da-sort" data-key="b">{esc(cols["valor_b"])} ↕</button></th></tr></thead>
<tbody id="da-body"></tbody></table></div>
<div class="ova-grid">
<upao-figure caption="Gráfico 1. {esc(cols["valor_a"])} por registro (según el filtro).">
<svg id="da-bars" class="da-svg" viewBox="0 0 400 100" role="img" aria-label="Barras de {esc(cols["valor_a"])} por registro"><title>Barras de {esc(cols["valor_a"])}</title></svg></upao-figure>
<upao-figure caption="Gráfico 2. Relación entre {esc(cols["valor_a"])} y {esc(cols["valor_b"])}.">
<svg id="da-scatter" class="da-svg" viewBox="0 0 400 300" role="img" aria-label="Dispersión de {esc(cols["valor_a"])} contra {esc(cols["valor_b"])}"><title>Dispersión A contra B</title></svg></upao-figure></div>
<div class="da-leg" id="da-leg" aria-label="Leyenda de categorías"></div>
{qhtml}
{summary(data["cierre"], "Conclusión")}
{json_data({"r": recs, "cats": cats, "ca": cols["valor_a"], "cb": cols["valor_b"]})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const COL = ['#0A3D91', '#F47A20', '#1E8E5A', '#8E44AD', '#C0392B', '#16A085'];
const colOf = c => COL[D.cats.indexOf(c) % COL.length];
let sortKey = null, dir = 1;
function sv(tag, a, t) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (t !== undefined) e.textContent = t; return e; }
function rows() {
  const f = $('da-cat').value;
  let r = D.r.filter(x => !f || x.c === f);
  if (sortKey) r = r.slice().sort((p, q) => (typeof p[sortKey] === 'number' ? p[sortKey] - q[sortKey] : String(p[sortKey]).localeCompare(String(q[sortKey]))) * dir);
  return r;
}
function bars(r) {
  const svg = $('da-bars'); svg.textContent = '';
  const h = 18 + r.length * 22; svg.setAttribute('viewBox', '0 0 400 ' + h);
  const max = Math.max(1, ...r.map(x => x.a));
  r.forEach((x, k) => {
    const y = 8 + k * 22, w = Math.max(2, 240 * x.a / max);
    svg.appendChild(sv('text', { x: 0, y: y + 12, class: 'da-t' }, x.n.length > 16 ? x.n.slice(0, 15) + '…' : x.n));
    svg.appendChild(sv('rect', { x: 110, y: y, width: w, height: 16, rx: 3, fill: colOf(x.c) }));
    svg.appendChild(sv('text', { x: 114 + w, y: y + 12, class: 'da-t' }, String(x.a)));
  });
}
function scatter(r) {
  const svg = $('da-scatter'); svg.textContent = '';
  const ma = Math.max(1, ...D.r.map(x => x.a)), mb = Math.max(1, ...D.r.map(x => x.b));
  svg.appendChild(sv('line', { x1: 40, y1: 260, x2: 390, y2: 260, stroke: 'var(--text-muted)' }));
  svg.appendChild(sv('line', { x1: 40, y1: 10, x2: 40, y2: 260, stroke: 'var(--text-muted)' }));
  svg.appendChild(sv('text', { x: 215, y: 290, 'text-anchor': 'middle', class: 'da-t' }, D.ca));
  const yl = sv('text', { x: 12, y: 135, 'text-anchor': 'middle', class: 'da-t', transform: 'rotate(-90 12 135)' }, D.cb); svg.appendChild(yl);
  r.forEach(x => {
    const c = sv('circle', { cx: 40 + 340 * x.a / ma, cy: 260 - 240 * x.b / mb, r: 6, fill: colOf(x.c), 'fill-opacity': '.8', stroke: '#fff' });
    c.appendChild(sv('title', {}, x.n + ' (' + x.a + ', ' + x.b + ')')); svg.appendChild(c);
  });
}
function draw() {
  const r = rows(), tb = $('da-body'); tb.textContent = '';
  r.forEach(x => {
    const tr = el('tr'); [x.n, x.c, x.a, x.b].forEach(v => tr.appendChild(el('td', '', String(v)))); tb.appendChild(tr);
  });
  $('da-count').textContent = r.length + ' de ' + D.r.length + ' registros';
  bars(r); scatter(r);
}
$('da-cat').addEventListener('change', draw);
document.querySelectorAll('.da-sort').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.key; dir = (sortKey === k) ? -dir : 1; sortKey = k;
  document.querySelectorAll('th[aria-sort]').forEach(th => th.setAttribute('aria-sort', 'none'));
  b.closest('th').setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending'); draw();
}));
const leg = $('da-leg');
D.cats.forEach(c => { const s = el('span'); const d = el('i', 'da-sw'); d.style.background = colOf(c); s.appendChild(d); s.appendChild(document.createTextNode(c)); leg.appendChild(s); });
draw();
document.addEventListener('upao-choice-selected', e => window.ovaMark('q-' + (e.detail && e.detail.group)));
''')}
"""


def sample(concept: str, p: dict) -> dict:
    cats = ["USERS", "DATA", "INDX"]
    return {
        "titulo": f"Monitoreo de {concept}"[:70],
        "contexto": f"Revisa los segmentos relacionados con {concept} y decide cuáles requieren acción.",
        "columnas": {"nombre": "Segmento", "categoria": "Tablespace", "valor_a": "Tamaño (MB)", "valor_b": "Lecturas físicas"},
        "registros": [
            {"nombre": f"SEG_{k:02d}", "categoria": cats[k % 3], "valor_a": 40 + (k * 37) % 400, "valor_b": 100 + (k * 91) % 900}
            for k in range(16)
        ],
        "ejemplo": "SEG_05 tiene 225 MB y 555 lecturas: es grande y muy consultado, candidato a revisar primero.",
        "preguntas": [
            {
                "enunciado": f"Pregunta {k}: ¿qué conclusión sostienen los datos?",
                "opciones": [
                    {"texto": "Los segmentos grandes concentran más lecturas", "correcta": True, "feedback": "Los registros de mayor tamaño muestran más lecturas físicas."},
                    {"texto": "El tamaño no influye en nada", "correcta": False, "feedback": "Observa el gráfico de dispersión: hay relación."},
                    {"texto": "Todos los tablespaces son idénticos", "correcta": False, "feedback": "La tabla muestra diferencias entre categorías."},
                ],
            }
            for k in range(1, p["num_questions"] + 1)
        ],
        "cierre": "Actúa primero sobre los segmentos con más tamaño y más lecturas.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=5,
    title="Análisis de Datos",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
