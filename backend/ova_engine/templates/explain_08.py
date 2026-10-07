"""EXPLAIN 8 — Diagrama de Framework: SVG jerárquico explorable con zoom, flujo animado y comprobación."""

from __future__ import annotations

import re

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    json_data,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.icons import icon
from ova_engine.schema import arr, b, i, obj, s
from ova_engine.templates._kit_a import KIT_CSS, header, progress, summary

PARAMS = (
    Param("num_blocks", 5, min=3, max=8, help="Número de bloques jerárquicos del diagrama"),
)


def schema(p: dict) -> dict:
    n = p["num_blocks"]
    sch = obj(
        titulo=s(70),
        objetivo=s(180),
        bloques=arr(
            obj(nombre=s(26), rol=s(230), contiene=s(150), relacion=s(170)),
            min_items=n,
            max_items=n,
        ),
        flujo=arr(obj(paso=s(160), bloque=i()), 3, 4),
        pregunta=obj(
            enunciado=s(170),
            opciones=arr(obj(texto=s(100), correcta=b(), feedback=s(180)), 3, 4),
        ),
        sintesis=s(240),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_blocks"]
    return f"""[ROL] Diseñador de diagramas {d.pick("de arquitectura de bases de datos", "didácticos sobre «" + concept + "» para " + d.audiencia)}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Describe la arquitectura de «{concept}» como exactamente {n} bloques jerárquicos, del más externo/general al más interno/específico {d.pick(d.si_oracle("(p. ej. instancia > base de datos, o tablespace > segmento > extent > bloque, o niveles ANSI/SPARC)", "(p. ej. niveles ANSI/SPARC: externo > conceptual > interno, o servidor > base de datos > esquema > tabla)"), "(p. ej. de lo general a lo específico: sistema > subsistema > componente > parte)")}.
- titulo: título corto del diagrama.
- objetivo: objetivo de aprendizaje observable («Al terminar podrás interpretar…»).
- imagen (opcional): apoyo visual estructurado de la arquitectura:
  * "diagrama" para modelos conceptuales, componentes y capas (incluye objeto `diagrama` con tipo: "capas"|"arbol"|"flujo", titulo, nodos, aristas).
  * "logo" para tecnologías o marcas reconocidas.
  * "foto" ÚNICAMENTE si el concepto refiere a equipamiento o servidores físicos reales (no para abstracciones de software).
  * "escena" para ilustraciones conceptuales.
  Incluye {{"tipo": "diagrama"|"foto"|"logo"|"escena", "descripcion": "...", "consulta": "..." (en inglés)}}.
- bloques: en orden jerárquico, por cada bloque: `nombre` (≤24 caracteres), `rol` (qué función cumple, ≤35 palabras), `contiene` (qué hay dentro o qué lo compone, ≤20 palabras), `relacion` (cómo se conecta con el bloque siguiente y por qué existe esa jerarquía, ≤25 palabras).
- flujo: 3 o 4 pasos de un ejemplo trabajado de cómo viaja {d.pick("una operación (p. ej. una consulta)", "un elemento o proceso del tema")} por la estructura; cada uno con `paso` (≤25 palabras) y `bloque` (número entero: posición del bloque implicado, empezando en 1).
- pregunta: una pregunta de comprensión sobre por qué se organiza así la jerarquía, con 3-4 opciones; exactamente UNA `correcta: true`; cada `feedback` explica el porqué.
- sintesis: cierre que consolide la función de cada bloque.
[RESTRICCIONES] {d.pick(d.si_oracle("Nombres técnicos exactos de Oracle cuando existan", "Nombres técnicos exactos cuando existan"), "Nombres exactos y correctos del área del tema")}; sin inventar componentes.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_NUM_PREFIX = re.compile(r"^\s*(?:paso\s*)?\d+\s*[.):\-–]\s*", re.IGNORECASE)


def _strip_num(text) -> str:
    """Quita «1. » al inicio: la lista `<ol>` ya numera los pasos."""
    return _NUM_PREFIX.sub("", str(text or ""))


def normalize(data: dict, params: dict) -> dict:
    """Deja `num_blocks` bloques como máximo (recorta los sobrantes; si hay menos se usan los
    reales y la UI cuenta con ese número), ajusta el flujo a ellos y limpia su numeración."""
    n = params.get("num_blocks", 5)
    bloques = list(data.get("bloques") or [])[:n]
    flujo = []
    for f in data.get("flujo") or []:
        try:
            idx = int(f.get("bloque") or 1)
        except (TypeError, ValueError):
            idx = 1
        flujo.append({**f, "paso": _strip_num(f.get("paso")), "bloque": max(1, min(len(bloques) or 1, idx))})
    return {**data, "bloques": bloques, "flujo": flujo}


def _svg(blocks: list[dict]) -> str:
    n = len(blocks)
    h_blk, gap, step = 54, 30, 22
    height = 20 + n * (h_blk + gap) - gap + 10
    parts = [
        f'<svg id="fw-svg" viewBox="0 0 520 {height}" role="group" aria-label="Diagrama jerárquico de {n} bloques">'
        '<defs><marker id="fw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
        '<path d="M0 0L10 5L0 10z" fill="var(--text-muted)"/></marker></defs>'
    ]
    for k, bl in enumerate(blocks):
        x = 14 + k * step
        y = 20 + k * (h_blk + gap)
        w = 520 - 2 * 14 - k * step
        if k < n - 1:
            ay = y + h_blk
            parts.append(
                f'<line x1="{x + 40}" y1="{ay}" x2="{x + 40 + step}" y2="{ay + gap - 2}" stroke="var(--text-muted)" '
                'stroke-width="2.5" marker-end="url(#fw-arrow)"/>'
            )
        nm, rol = esc(bl["nombre"]), esc(bl["rol"])
        parts.append(
            f'<g class="fw-blk" data-i="{k}" tabindex="0" role="button" aria-pressed="false" '
            f'aria-label="Bloque {k + 1}: {nm}. Pulsa para ver el detalle">'
            f"<title>{nm}: {rol}</title>"
            f'<rect x="{x}" y="{y}" width="{w}" height="{h_blk}" rx="12" class="fw-rect"/>'
            f'<circle cx="{x + 24}" cy="{y + h_blk / 2}" r="13" fill="var(--surface)"/>'
            f'<text x="{x + 24}" y="{y + h_blk / 2 + 5}" text-anchor="middle" class="fw-num">{k + 1}</text>'
            f'<text x="{x + 48}" y="{y + h_blk / 2 + 5}" class="fw-name">{nm}</text></g>'
        )
    parts.append("</svg>")
    return "".join(parts)


def render(data: dict, ctx: RenderContext) -> str:
    bl = data["bloques"]
    n = len(bl)
    q = data["pregunta"]
    choices = "".join(
        f'<upao-choice group="fw-q" value="{chr(65 + k)}" correct="{str(bool(o["correcta"])).lower()}" '
        f'feedback="{esc(o["feedback"])}">{esc(o["texto"])}</upao-choice>'
        for k, o in enumerate(q["opciones"])
    )
    flujo = [{"paso": f["paso"], "bloque": max(1, min(n, int(f["bloque"] or 1))) - 1} for f in data["flujo"]]
    steps = "".join(f"<li>{esc(_strip_num(f['paso']))}</li>" for f in flujo)
    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Diagrama arquitectónico de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""
{header(ctx.title.upper(), data["titulo"])}
{KIT_CSS}
{IMAGE_FIGURE_CSS}
<style>
.fw-wrap{{overflow-x:auto;overflow-y:visible;border:1px solid var(--border);border-radius:12px;background:var(--surface)}}
#fw-svg{{display:block;width:100%;height:auto;transition:width .2s ease}}
.fw-rect{{fill:var(--primary);opacity:.88}}
.fw-blk{{cursor:pointer}}
.fw-blk:hover .fw-rect,.fw-blk:focus .fw-rect{{opacity:1}}
.fw-blk:focus{{outline:none}}
.fw-blk:focus-visible .fw-rect{{stroke:var(--accent);stroke-width:4}}
.fw-blk[aria-pressed="true"] .fw-rect{{fill:var(--action)}}
.fw-blk.seen .fw-rect{{stroke:var(--success);stroke-width:3}}
.fw-blk.glow .fw-rect{{fill:var(--accent);stroke:var(--text);stroke-width:3}}
.fw-name{{fill:#fff;font-size:15px;font-weight:700}}
.fw-num{{fill:var(--primary);font-size:14px;font-weight:800}}
.fw-leg{{display:flex;gap:16px;flex-wrap:wrap;font-size:.85rem}}
.fw-sw{{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:6px}}
</style>
<upao-objective>{esc(data["objetivo"])}</upao-objective>
{fig_html}
{progress(n + 1, "Bloques explorados + pregunta final")}
<div class="k-row" role="group" aria-label="Zoom del diagrama">
<button type="button" class="k-btn" id="fw-zin" aria-label="Acercar">+ Acercar</button>
<button type="button" class="k-btn" id="fw-zout" aria-label="Alejar">− Alejar</button>
<button type="button" class="k-btn" id="fw-zreset">Restablecer</button>
<span class="k-chip" id="fw-count" aria-live="polite">0 de {n + 1} pasos (bloques + pregunta)</span></div>
<upao-figure caption="Figura 1. Jerarquía de bloques; los números indican el orden de lo general a lo específico.">
<div class="fw-wrap" tabindex="0" role="region" aria-label="Diagrama desplazable">{_svg(bl)}</div></upao-figure>
<div class="fw-leg" aria-label="Leyenda"><span><i class="fw-sw" style="background:var(--primary)"></i>Bloque (pulsa o Enter)</span>
<span><i class="fw-sw" style="background:var(--action)"></i>Bloque seleccionado</span>
<span><i class="fw-sw" style="background:var(--accent)"></i>Paso del flujo</span><span>↓ Contiene / se conecta con</span></div>
<article class="k-panel ova-stack" id="fw-detail" aria-live="polite"><p class="ova-muted">Selecciona un bloque del diagrama para ver su función.</p></article>
<upao-example title="Ejemplo trabajado: recorrido de una operación"><upao-steps><ol>{steps}</ol></upao-steps>
<button type="button" class="k-btn main" id="fw-play">{icon('play')} Resaltar el recorrido en el diagrama</button>
<p class="k-fb k-hide" id="fw-play-t" role="status" aria-live="polite"></p></upao-example>
<upao-question number="1" prompt="{esc(q["enunciado"])}">{choices}</upao-question>
{summary(data["sintesis"], "Síntesis")}
{credits_sec}
{json_data({"b": [{"n": x["nombre"], "r": x["rol"], "c": x["contiene"], "x": x["relacion"]} for x in bl], "f": flujo})}
{script(PROGRESS_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const blks = Array.from(document.querySelectorAll('.fw-blk'));
const $ = id => document.getElementById(id);
const seen = new Set();
let asked = false;
function count() { $('fw-count').textContent = (seen.size + (asked ? 1 : 0)) + ' de ' + (D.b.length + 1) + ' pasos (bloques + pregunta)'; }
function mk(tag, cls, t) { const e = document.createElement(tag); if (cls) e.className = cls; if (t !== undefined) e.textContent = t; return e; }
function select(i) {
  blks.forEach((g, k) => g.setAttribute('aria-pressed', String(k === i)));
  const b = D.b[i], box = $('fw-detail'); box.textContent = '';
  box.appendChild(mk('span', 'k-chip', 'Bloque ' + (i + 1) + ' de ' + D.b.length));
  box.appendChild(mk('h3', '', b.n));
  [['Función', b.r], ['Contiene', b.c], ['Relación con el siguiente', b.x]].forEach(([l, t]) => {
    const d = mk('div'); d.appendChild(mk('p', 'k-label', l)); d.appendChild(mk('p', '', t)); box.appendChild(d);
  });
  blks[i].classList.add('seen'); seen.add(i);
  count();
  window.ovaMark('blk-' + i);
}
blks.forEach((g, i) => {
  g.addEventListener('click', () => select(i));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
});
let z = 1;
function zoom(v) { z = Math.max(1, Math.min(2.5, v)); $('fw-svg').style.width = (z * 100) + '%'; }
$('fw-zin').addEventListener('click', () => zoom(z + 0.25));
$('fw-zout').addEventListener('click', () => zoom(z - 0.25));
$('fw-zreset').addEventListener('click', () => zoom(1));
let timer = null;
$('fw-play').addEventListener('click', () => {
  if (timer) clearInterval(timer);
  let k = 0; const t = $('fw-play-t'); t.classList.remove('k-hide');
  function step() {
    blks.forEach(g => g.classList.remove('glow'));
    if (k >= D.f.length) { clearInterval(timer); timer = null; t.textContent = 'Recorrido terminado.'; return; }
    blks[D.f[k].bloque].classList.add('glow');
    t.textContent = 'Paso ' + (k + 1) + ': ' + D.f[k].paso + ' (bloque ' + D.b[D.f[k].bloque].n + ')';
    k++;
  }
  step(); timer = setInterval(step, 2200);
});
document.addEventListener('upao-choice-selected', () => { asked = true; count(); window.ovaMark('pregunta'); });
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_blocks"]
    return {
        "titulo": f"Arquitectura de {concept}"[:70],
        "objetivo": f"Al terminar podrás interpretar la jerarquía de bloques de {concept}.",
        "imagen": {
            "tipo": "diagrama",
            "descripcion": f"Diagrama arquitectónico formal de {concept}",
            "consulta": f"{concept} framework architecture diagram",
        },
        "bloques": [
            {
                "nombre": f"Bloque {k}",
                "rol": f"Función del bloque {k}: organiza una parte de {concept}.",
                "contiene": f"Elementos de nivel {k}.",
                "relacion": f"Se apoya en el bloque {k + 1} para almacenar sus datos.",
            }
            for k in range(1, n + 1)
        ],
        "flujo": [
            {"paso": f"La operación entra por el bloque {k}.", "bloque": k} for k in range(1, 4)
        ],
        "pregunta": {
            "enunciado": "¿Por qué los bloques se organizan de forma jerárquica?",
            "opciones": [
                {"texto": "Cada nivel oculta detalles del inferior", "correcta": True, "feedback": "Exacto: la abstracción por niveles simplifica la administración."},
                {"texto": "Es solo un criterio estético", "correcta": False, "feedback": "La jerarquía responde a responsabilidades distintas."},
                {"texto": "Para duplicar los datos", "correcta": False, "feedback": "La jerarquía no duplica; organiza."},
            ],
        },
        "sintesis": f"Cada bloque cumple un rol y juntos explican {concept}.",
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=8,
    title="Diagrama de Framework",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
    normalize=normalize,
)
