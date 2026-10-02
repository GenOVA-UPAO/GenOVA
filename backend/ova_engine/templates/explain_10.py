"""EXPLAIN 10 — Infografía Interactiva: secciones con dato clave, revelación progresiva y mapa de avance."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, header, progress, summary

PARAMS = (
    Param("num_sections", 5, min=4, max=6, help="Número de secciones de la infografía"),
)


def schema(p: dict) -> dict:
    n = p["num_sections"]
    return obj(
        titulo=s(70),
        objetivo=s(180),
        secciones=arr(
            obj(titulo=s(40), emoji=s(8), dato=s(36), explicacion=s(270), porque=s(210)),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_sections"]
    return f"""[ROL] Diseñador de infografías educativas de bases de datos.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Escribe el contenido de una infografía de «{concept}» con exactamente {n} secciones que se revelan en secuencia, de la idea general a la aplicación.
- titulo: título corto y atractivo.
- objetivo: objetivo de aprendizaje observable («Al terminar podrás integrar…»).
- secciones: por cada una: `titulo` (≤5 palabras), `emoji` (un solo emoji), `dato` (el dato clave destacado en grande: una cifra, sigla, comando o frase muy corta ≤5 palabras, p. ej. «8 KB», «ROWID», «COMMIT»), `explicacion` (qué significa y cómo se aplica, ≤40 palabras) y `porque` (por qué ese dato importa o por qué es así, ≤30 palabras).
- sintesis: cierre que integre las {n} ideas.
[RESTRICCIONES] Datos técnicamente correctos y verificables; cada sección aporta una idea distinta y las secciones forman una secuencia lógica.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _map(secs: list[dict]) -> str:
    n = len(secs)
    w = 520
    gap = w / n
    parts = [f'<svg viewBox="0 0 {w} 90" role="group" aria-label="Mapa de avance de la infografía">']
    parts.append(f'<line x1="{gap / 2}" y1="34" x2="{w - gap / 2}" y2="34" stroke="var(--border)" stroke-width="4"/>')
    for k, sec in enumerate(secs):
        cx = gap * k + gap / 2
        t = esc(sec["titulo"])
        short = esc(sec["titulo"][:14])
        parts.append(
            f'<g class="ig-node" data-i="{k}" tabindex="0" role="button" aria-label="Ir a la sección {k + 1}: {t}">'
            f'<circle cx="{cx:.1f}" cy="34" r="20" class="ig-c"/>'
            f'<text x="{cx:.1f}" y="40" text-anchor="middle" class="ig-n">{k + 1}</text>'
            f'<text x="{cx:.1f}" y="78" text-anchor="middle" class="ig-l">{short}</text></g>'
        )
    parts.append("</svg>")
    return "".join(parts)


def render(data: dict, ctx: RenderContext) -> str:
    secs = data["secciones"]
    n = len(secs)
    cards = []
    for k, sec in enumerate(secs):
        hidden = "" if k == 0 else " hidden"
        cards.append(
            f'<section class="k-panel ig-sec" id="ig-s{k}" data-i="{k}" aria-labelledby="ig-h{k}"{hidden}>'
            f'<div class="k-row"><span class="ig-emo" aria-hidden="true">{esc(sec["emoji"])}</span>'
            f'<h2 id="ig-h{k}" style="margin:0">{k + 1}. {esc(sec["titulo"])}</h2></div>'
            f'<p class="ig-big" aria-label="Dato clave">{esc(sec["dato"])}</p>'
            f'<p>{esc(sec["explicacion"])}</p>'
            f'<button type="button" class="k-btn ig-why" aria-expanded="false" aria-controls="ig-w{k}">¿Por qué importa?</button>'
            f'<div class="k-fb k-hide" id="ig-w{k}">{esc(sec["porque"])}</div></section>'
        )
    return f"""
{header("INFOGRAFÍA INTERACTIVA", data["titulo"])}
{KIT_CSS}
<style>
.ig-sec{{border-left:6px solid var(--accent)}}
.ig-emo{{font-size:2rem;line-height:1}}
.ig-big{{font-size:clamp(1.8rem,7vw,2.8rem);font-weight:800;color:var(--primary);margin:.2em 0;line-height:1.1}}
.ig-node{{cursor:pointer}}
.ig-node:focus{{outline:none}}
.ig-node:focus-visible .ig-c{{stroke:var(--accent);stroke-width:4}}
.ig-c{{fill:var(--surface);stroke:var(--border);stroke-width:3}}
.ig-node.on .ig-c{{fill:var(--primary);stroke:var(--primary)}}
.ig-node.on .ig-n{{fill:#fff}}
.ig-n{{font-size:16px;font-weight:800;fill:var(--text-muted)}}
.ig-l{{font-size:11px;fill:var(--text)}}
</style>
<upao-objective>{esc(data["objetivo"])}</upao-objective>
{progress(n, "Secciones reveladas")}
<upao-figure caption="Figura 1. Mapa de la infografía: se ilumina cada sección que revelas.">{_map(secs)}</upao-figure>
<div class="ova-stack" id="ig-list">{"".join(cards)}</div>
<div class="k-row"><button type="button" class="k-btn main" id="ig-next">Revelar siguiente sección →</button>
<span class="k-chip" id="ig-count" aria-live="polite">1 de {n}</span></div>
<div id="ig-end" hidden>{summary(data["sintesis"], "Síntesis")}</div>
{script(PROGRESS_JS + '''
const secs = Array.from(document.querySelectorAll('.ig-sec'));
const nodes = Array.from(document.querySelectorAll('.ig-node'));
const nextBtn = document.getElementById('ig-next');
let shown = 0;
function reveal(i) {
  secs[i].hidden = false; nodes[i].classList.add('on');
  window.ovaMark('sec-' + i);
}
function more() {
  if (shown + 1 >= secs.length) return;
  shown++; reveal(shown);
  secs[shown].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('ig-count').textContent = (shown + 1) + ' de ' + secs.length;
  if (shown + 1 >= secs.length) { nextBtn.disabled = true; document.getElementById('ig-end').hidden = false; }
}
reveal(0);
nextBtn.addEventListener('click', more);
nodes.forEach((nd, i) => {
  const go = () => { if (i <= shown) secs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  nd.addEventListener('click', go);
  nd.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
secs.forEach(sec => {
  const b = sec.querySelector('.ig-why'), w = sec.querySelector('.k-fb');
  b.addEventListener('click', () => { const open = w.classList.toggle('k-hide') === false; b.setAttribute('aria-expanded', String(open)); });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    emos = ["🧠", "🗄️", "⚡", "🔐", "📈", "🧩"]
    return {
        "titulo": f"{concept} en una mirada"[:70],
        "objetivo": f"Al terminar podrás integrar las ideas clave de {concept}.",
        "secciones": [
            {
                "titulo": f"Idea {k}",
                "emoji": emos[(k - 1) % len(emos)],
                "dato": f"{k * 8} KB",
                "explicacion": f"Explicación de la idea {k} y su aplicación en {concept}.",
                "porque": f"Importa porque condiciona el rendimiento del paso {k}.",
            }
            for k in range(1, p["num_sections"] + 1)
        ],
        "sintesis": f"Las ideas se encadenan para dar forma a {concept}.",
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=10,
    title="Infografía Interactiva",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
