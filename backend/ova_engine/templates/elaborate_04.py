"""ELABORATE 4 — Simulación Aplicada: parámetros ajustables, métricas reactivas y 3 iteraciones de optimización."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

ITERATIONS = 3

PARAMS = (
    Param("num_params", 3, min=3, max=4, help="Número de parámetros ajustables de la simulación"),
)


def schema(p: dict) -> dict:
    n = p["num_params"]
    return obj(
        titulo=s(70),
        escenario=s(300),
        objetivo=s(190),
        parametros=arr(
            obj(
                nombre=s(32),
                unidad=s(14),
                minimo=i(),
                maximo=i(),
                inicial=i(),
                optimo=i(),
                si_bajo=s(180),
                si_alto=s(180),
            ),
            min_items=n,
            max_items=n,
        ),
        metrica_rendimiento=s(32),
        metrica_costo=s(32),
        ejemplo=s(300),
        cierre=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_params"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        f"""[ROL] Diseñador de simulaciones de administración de bases de datos {d.bd_adj}.""",
        f"""[ROL] Diseñador de simulaciones interactivas para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Diseña una simulación donde el estudiante aplique «{concept}» a un escenario {d.si_oracle("Oracle ", "")}realista (p. ej. {d.si_oracle("dimensionar la SGA", "dimensionar la memoria caché")}, planificar backups según el RPO, elegir índices) ajustando EXACTAMENTE {n} parámetros numéricos con sliders. Un valor ÓPTIMO interior a cada rango equilibra rendimiento y costo: ni todo al mínimo ni todo al máximo.""",
        f"""[TAREA] Diseña una simulación donde el estudiante aplique «{concept}» a un escenario realista del área del tema ajustando EXACTAMENTE {n} parámetros numéricos con sliders. Un valor ÓPTIMO interior a cada rango equilibra beneficio y costo: ni todo al mínimo ni todo al máximo.""",
    )
    _l3 = d.pick(
        """- escenario: la situación del DBA y la meta a lograr (≤45 palabras).""",
        """- escenario: la situación del estudiante y la meta a lograr (≤45 palabras).""",
    )
    _l4 = d.pick(
        """- metrica_rendimiento: nombre de la métrica de calidad que sube al acercarse al óptimo (p. ej. «Tasa de aciertos de caché»).""",
        """- metrica_rendimiento: nombre de la métrica de calidad o logro que sube al acercarse al óptimo.""",
    )
    _l5 = d.pick(
        """- metrica_costo: nombre del costo de recursos que sube con los valores altos (p. ej. «Memoria consumida»).""",
        """- metrica_costo: nombre del costo o recurso que sube con los valores altos.""",
    )
    _l6 = d.pick(
        f"""[RESTRICCIONES] Valores y unidades realistas {d.si_oracle("de Oracle", "del tema")}; los óptimos deben poder justificarse técnicamente.""",
        f"""[RESTRICCIONES] Valores y unidades realistas del área; los óptimos deben poder justificarse con el concepto. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
- titulo: título corto de la simulación.
{_l3}
- objetivo: objetivo de aprendizaje observable («Al terminar podrás optimizar…»).
- parametros: por cada parámetro: `nombre`, `unidad` (MB, %, min, sesiones…), `minimo`, `maximo` (enteros, minimo < maximo), `inicial` (valor de partida alejado del óptimo), `optimo` (entero dentro del rango, la mejor decisión técnica), `si_bajo` (qué problema ocurre si el valor queda por debajo del óptimo y por qué, ≤25 palabras) y `si_alto` (qué ocurre si queda por encima, ≤25 palabras).
{_l4}
{_l5}
- ejemplo: un ejemplo trabajado breve de cómo ajustar un parámetro razonando causa y efecto (≤40 palabras).
- cierre: patrón general que el estudiante debe llevarse.
{_l6}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _clean(par: dict) -> dict:
    lo = int(par["minimo"] or 0)
    hi = int(par["maximo"] or 0)
    if hi <= lo:
        hi = lo + 10
    clamp = lambda v: max(lo, min(hi, int(v or lo)))  # noqa: E731
    return {
        "n": par["nombre"],
        "u": par["unidad"],
        "lo": lo,
        "hi": hi,
        "ini": clamp(par["inicial"]),
        "opt": clamp(par["optimo"]),
        "bajo": par["si_bajo"],
        "alto": par["si_alto"],
    }


def render(data: dict, ctx: RenderContext) -> str:
    pars = [_clean(x) for x in data["parametros"]]
    sliders = "".join(
        f'<div class="si-row"><label for="si-p{k}"><strong>{esc(x["n"])}</strong></label>'
        f'<input type="range" id="si-p{k}" data-k="{k}" min="{x["lo"]}" max="{x["hi"]}" step="{max(1, (x["hi"] - x["lo"]) // 100)}" value="{x["ini"]}">'
        f'<output id="si-o{k}" for="si-p{k}">{x["ini"]} {esc(x["u"])}</output></div>'
        for k, x in enumerate(pars)
    )
    return f"""
{header("SIMULACIÓN APLICADA", data["titulo"])}
{KIT_CSS}
<style>
.si-row{{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;margin-bottom:12px}}
.si-row label{{grid-column:1/-1}}
.si-row input[type=range]{{width:100%;min-height:32px}}
.si-row output{{font-weight:700;color:var(--primary);min-width:70px;text-align:right}}
.si-svg{{display:block;width:100%;height:auto}}
.si-bar{{fill:var(--primary)}}
.si-t{{font-size:15px;fill:var(--text)}}
.si-hist td,.si-hist th{{padding:6px 8px;text-align:left}}
</style>
<upao-objective>{esc(data["objetivo"])}</upao-objective>
<article class="k-panel tint"><p class="k-label">Escenario</p><p>{esc(data["escenario"])}</p></article>
<upao-example title="Ejemplo trabajado"><p>{esc(data["ejemplo"])}</p></upao-example>
{progress(ITERATIONS, "Iteraciones de optimización")}
<section class="ova-card ova-stack" aria-labelledby="si-h"><h2 id="si-h">Ajusta los parámetros</h2>{sliders}
<div class="k-row"><button type="button" class="k-btn main" id="si-apply"><span>Aplicar configuración (iteración <span id="si-it">1</span> de {ITERATIONS})</span></button>
<button type="button" class="k-btn" id="si-reset">Volver a los valores iniciales</button></div></section>
<upao-status id="si-status" state="info">Mueve los controles y observa las métricas.</upao-status>
<upao-figure caption="Figura 1. Valor de cada parámetro dentro de su rango y métricas resultantes (se actualizan al instante).">
<svg id="si-svg" class="si-svg" viewBox="0 0 520 {40 + 44 * len(pars) + 130}" role="img" aria-label="Gráfico de parámetros y métricas de la simulación"><title>Barras con el valor de cada parámetro y las métricas de rendimiento y costo</title></svg></upao-figure>
<div class="k-fb" id="si-fb" role="status" aria-live="polite">Aún no has aplicado ninguna configuración.</div>
<div class="ova-table-scroll" role="region" tabindex="0" aria-label="Historial de iteraciones"><table class="si-hist"><caption>Historial de iteraciones</caption>
<thead><tr><th scope="col">#</th><th scope="col">Configuración</th><th scope="col">{esc(data["metrica_rendimiento"])}</th><th scope="col">{esc(data["metrica_costo"])}</th></tr></thead><tbody id="si-hist"></tbody></table></div>
{summary(data["cierre"], "Patrón aprendido")}
{json_data({"p": pars, "mr": data["metrica_rendimiento"], "mc": data["metrica_costo"], "it": ITERATIONS})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const sliders = D.p.map((_, k) => $('si-p' + k));
let iter = 0;
function frac(k, v) { return (v - D.p[k].lo) / (D.p[k].hi - D.p[k].lo); }
function metrics() {
  let dist = 0, cost = 0;
  D.p.forEach((p, k) => { const v = Number(sliders[k].value); dist += Math.min(1, Math.abs(v - p.opt) / (p.hi - p.lo)); cost += frac(k, v); });
  dist /= D.p.length; cost /= D.p.length;
  return { perf: Math.max(0, Math.round(100 * (1 - dist * 2.2))), cost: Math.round(cost * 100) };
}
function svgEl(tag, attrs, text) { const e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(a => e.setAttribute(a, attrs[a])); if (text !== undefined) e.textContent = text; return e; }
function draw() {
  const svg = $('si-svg'); Array.from(svg.querySelectorAll('g')).forEach(g => g.remove());
  const g = svgEl('g', {}); const m = metrics(); let y = 16;
  D.p.forEach((p, k) => {
    const v = Number(sliders[k].value);
    g.appendChild(svgEl('text', { x: 8, y: y + 12, class: 'si-t' }, p.n + ': ' + v + ' ' + p.u));
    g.appendChild(svgEl('rect', { x: 8, y: y + 18, width: 500, height: 14, rx: 6, fill: 'var(--surface-tint)' }));
    g.appendChild(svgEl('rect', { x: 8, y: y + 18, width: Math.max(4, 500 * frac(k, v)), height: 14, rx: 6, class: 'si-bar' }));
    y += 44;
  });
  y += 8;
  [[D.mr, m.perf, m.perf >= 85 ? 'var(--success)' : m.perf >= 55 ? 'var(--accent)' : 'var(--danger)'], [D.mc, m.cost, 'var(--primary)']].forEach(([lbl, val, col]) => {
    g.appendChild(svgEl('text', { x: 8, y: y + 10, class: 'si-t', 'font-weight': '700' }, lbl + ': ' + val + (lbl === D.mr ? ' / 100' : ' %')));
    g.appendChild(svgEl('rect', { x: 8, y: y + 16, width: 500, height: 18, rx: 9, fill: 'var(--surface-tint)' }));
    g.appendChild(svgEl('rect', { x: 8, y: y + 16, width: Math.max(4, 5 * val), height: 18, rx: 9, fill: col }));
    y += 50;
  });
  svg.appendChild(g);
}
function refresh() {
  D.p.forEach((p, k) => { $('si-o' + k).textContent = sliders[k].value + ' ' + p.u; });
  draw();
  const m = metrics(), st = $('si-status');
  st.setAttribute('state', m.perf >= 85 ? 'success' : m.perf >= 55 ? 'warning' : 'error');
  st.textContent = D.mr + ': ' + m.perf + ' / 100 · ' + D.mc + ': ' + m.cost + ' %';
}
sliders.forEach(sl => sl.addEventListener('input', refresh));
$('si-reset').addEventListener('click', () => { D.p.forEach((p, k) => { sliders[k].value = p.ini; }); refresh(); });
$('si-apply').addEventListener('click', () => {
  iter++;
  const m = metrics();
  const tr = el('tr');
  tr.appendChild(el('td', '', String(iter)));
  tr.appendChild(el('td', '', D.p.map((p, k) => p.n + '=' + sliders[k].value + p.u).join(' · ')));
  tr.appendChild(el('td', '', String(m.perf))); tr.appendChild(el('td', '', m.cost + ' %'));
  $('si-hist').appendChild(tr);
  let worst = 0, wd = -1;
  D.p.forEach((p, k) => { const d = Math.abs(Number(sliders[k].value) - p.opt) / (p.hi - p.lo); if (d > wd) { wd = d; worst = k; } });
  const p = D.p[worst], v = Number(sliders[worst].value), fb = $('si-fb');
  if (m.perf >= 85) { fb.className = 'k-fb ok'; fb.textContent = 'Muy buena configuración (' + m.perf + '/100). Cada parámetro está cerca de su punto de equilibrio entre rendimiento y costo.'; }
  else { fb.className = 'k-fb bad'; fb.textContent = 'El parámetro que más se aleja es «' + p.n + '». ' + (v < p.opt ? 'Valor bajo: ' + p.bajo : 'Valor alto: ' + p.alto) + ' Ajústalo y vuelve a aplicar.'; }
  $('si-it').textContent = String(Math.min(iter + 1, D.it));
  window.ovaMark('iter-' + Math.min(iter, D.it));
});
refresh();
''')}
"""


def sample(concept: str, p: dict) -> dict:
    names = [("Tamaño de buffer cache", "MB", 64, 2048, 128, 1024), ("Sesiones máximas", "ses", 10, 500, 20, 200),
             ("Tamaño de shared pool", "MB", 32, 1024, 48, 384), ("Frecuencia de checkpoint", "min", 1, 60, 2, 15)]
    return {
        "titulo": f"Simulación de {concept}"[:70],
        "escenario": f"Dimensiona {concept} para una base de datos Oracle de ventas con picos al fin de mes.",
        "objetivo": f"Al terminar podrás optimizar {concept} equilibrando rendimiento y costo.",
        "parametros": [
            {
                "nombre": nm, "unidad": u, "minimo": lo, "maximo": hi, "inicial": ini, "optimo": opt,
                "si_bajo": "Si es muy bajo, el motor hace más lecturas a disco y se degrada.",
                "si_alto": "Si es muy alto, se desperdician recursos y queda poca memoria para otros procesos.",
            }
            for nm, u, lo, hi, ini, opt in names[: p["num_params"]]
        ],
        "metrica_rendimiento": "Rendimiento global",
        "metrica_costo": "Recursos consumidos",
        "ejemplo": "Si el buffer cache sube de 128 a 512 MB, más bloques viven en memoria y bajan las lecturas físicas.",
        "cierre": "Optimizar es buscar el equilibrio, no el máximo.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=4,
    title="Simulación Aplicada",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
