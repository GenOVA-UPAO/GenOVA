"""EXPLAIN 9 — Tabla Comparativa: 3 alternativas × N dimensiones, balance ventaja/desventaja y reto de elección."""

from __future__ import annotations

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
from ova_engine.schema import arr, i, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_dimensions", 4, min=3, max=6, help="Dimensiones de comparación (filas de la tabla)"),
)


def schema(p: dict) -> dict:
    n = p["num_dimensions"]
    sch = obj(
        titulo=s(70),
        intro=s(180),
        dimensiones=arr(s(40), n, n),
        comparaciones=arr(
            obj(
                concepto=s(60),
                valores=arr(s(230), n, n),
                ventaja=s(210),
                desventaja=s(210),
            ),
            3,
            3,
        ),
        reto=obj(escenario=s(230), mejor=i(), explicacion=s(280)),
        conclusion=s(240),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_dimensions"]
    return f"""[ROL] Analista comparativo {d.pick("de administración de bases de datos", "experto en «" + concept + "»")}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Compara «{concept}» con otras alternativas o conceptos relacionados {d.pick(d.si_oracle("(p. ej. backup frío/caliente/incremental, DBMS_JOB/DBMS_SCHEDULER, Oracle/SQL Server/PostgreSQL)", "(alternativas, enfoques o conceptos cercanos del mismo tema, p. ej. variantes de una técnica o de un tipo de SGBD)"), "(alternativas, enfoques o conceptos cercanos del mismo tema)")}: EXACTAMENTE 3 elementos comparados (uno puede ser «{concept}») en {n} dimensiones medibles.
- titulo: título corto de la comparación.
- intro: una frase que explique qué se compara y para qué.
- imagen (opcional): recurso visual estructurado comparativo:
  * "logo" para marcas o tecnologías reconocidas comparadas (ej. {d.pick(d.si_oracle("Oracle vs PostgreSQL", "PostgreSQL vs MySQL"), "dos marcas o instituciones comparadas")}).
  * "diagrama" para esquemas conceptuales o contrastes arquitectónicos (incluye objeto `diagrama` con tipo "comparacion"|"capas"|"flujo", titulo, nodos, aristas).
  * "foto" ÚNICAMENTE para equipamiento físico o hardware tangible.
  * "escena" para ilustraciones pedagógicas.
  Incluye {{"tipo": "logo"|"diagrama"|"foto"|"escena", "descripcion": "...", "consulta": "..." (en inglés)}}.
- dimensiones: {n} criterios medibles (≤5 palabras cada uno, p. ej. «Tiempo de recuperación»).
- comparaciones: 3 objetos, cada uno con `concepto` (nombre), `valores` (EXACTAMENTE {n} textos, uno por dimensión y EN EL MISMO ORDEN que `dimensiones`; ≤30 palabras, con datos concretos y comparables), `ventaja` (balance de su principal ventaja, ≤30 palabras) y `desventaja` (su principal desventaja, ≤30 palabras).
- reto: `escenario` ({d.pick("situación realista de un DBA", "situación realista del tema")} donde hay que elegir entre los 3, ≤35 palabras), `mejor` (número 1, 2 o 3: posición de la mejor opción en `comparaciones`) y `explicacion` (por qué esa opción gana y qué se sacrifica, ≤40 palabras).
- conclusion: criterio general para decidir entre las alternativas.
[RESTRICCIONES] Sin sesgo a favor de ningún elemento: cada uno debe ganar en alguna dimensión.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    dims = data["dimensiones"]
    comps = data["comparaciones"]
    head = "".join(
        f'<th scope="col"><button type="button" class="k-btn cmp-col" data-c="{c}" aria-pressed="false">{esc(x["concepto"])}</button></th>'
        for c, x in enumerate(comps)
    )
    rows = []
    for r, d in enumerate(dims):
        cells = "".join(
            f'<td data-c="{c}">{esc(x["valores"][r] if r < len(x["valores"]) else "")}</td>' for c, x in enumerate(comps)
        )
        rows.append(
            f'<tr data-r="{r}"><th scope="row"><button type="button" class="k-btn cmp-row" data-r="{r}" aria-pressed="false">{esc(d)}</button></th>{cells}</tr>'
        )
    reto = data["reto"]
    opts = "".join(
        f'<button type="button" class="ova-option cmp-opt" data-c="{c}">{esc(x["concepto"])}</button>' for c, x in enumerate(comps)
    )
    best = max(1, min(3, int(reto["mejor"] or 1))) - 1
    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Comparativa de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""
{header("TABLA COMPARATIVA", data["titulo"], data["intro"])}
{KIT_CSS}
{IMAGE_FIGURE_CSS}
<style>
.cmp-table{{border-collapse:separate;border-spacing:0;min-width:640px}}
.cmp-table th,.cmp-table td{{vertical-align:top;padding:10px;text-align:left}}
.cmp-table td.hl,.cmp-table tr.hl th{{background:var(--surface-tint)}}
.cmp-table td.hl-col{{background:var(--accent-tint,#FFF6EC)}}
.cmp-bal{{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))}}
.cmp-good{{border-left:4px solid var(--success)}}
.cmp-bad{{border-left:4px solid var(--danger)}}
</style>
{progress(4, "Balances revisados + reto")}
{fig_html}
<p class="ova-muted">Pulsa una dimensión para resaltar su fila y un elemento para ver su balance de ventajas y desventajas.</p>
<div class="ova-table-scroll" role="region" aria-label="Tabla comparativa" tabindex="0">
<table class="cmp-table"><caption>Comparación en {len(dims)} dimensiones</caption>
<thead><tr><th scope="col">Dimensión</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>
<article class="k-panel ova-stack" id="cmp-bal" aria-live="polite"><p class="ova-muted">Aún no has abierto ningún balance.</p></article>
<section class="ova-card ova-stack" aria-labelledby="cmp-reto-h">
<h2 id="cmp-reto-h">Reto: elige la mejor opción</h2>
<p>{esc(reto["escenario"])}</p>
<div class="ova-stack" id="cmp-opts">{opts}</div>
<div class="k-fb k-hide" id="cmp-fb" role="status" aria-live="polite"></div>
</section>
{summary(data["conclusion"], "Conclusión")}
{credits_sec}
{json_data({"c": [{"n": x["concepto"], "v": x["ventaja"], "d": x["desventaja"]} for x in comps], "best": best, "exp": reto["explicacion"]})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const rows = Array.from(document.querySelectorAll('tbody tr'));
document.querySelectorAll('.cmp-row').forEach(b => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') !== 'true';
  document.querySelectorAll('.cmp-row').forEach(x => x.setAttribute('aria-pressed', 'false'));
  rows.forEach(r => { r.classList.remove('hl'); r.querySelectorAll('td').forEach(td => td.classList.remove('hl')); });
  if (on) { b.setAttribute('aria-pressed', 'true'); const r = rows[Number(b.dataset.r)]; r.classList.add('hl'); r.querySelectorAll('td').forEach(td => td.classList.add('hl')); }
}));
document.querySelectorAll('.cmp-col').forEach(b => b.addEventListener('click', () => {
  const c = Number(b.dataset.c);
  document.querySelectorAll('.cmp-col').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('td[data-c]').forEach(td => td.classList.toggle('hl-col', Number(td.dataset.c) === c));
  const box = $('cmp-bal'); box.textContent = '';
  box.appendChild(el('h3', '', D.c[c].n));
  const g = el('div', 'cmp-bal');
  const a = el('div', 'k-panel cmp-good'); a.appendChild(el('p', 'k-label', 'Ventaja')); a.appendChild(el('p', '', D.c[c].v));
  const d = el('div', 'k-panel cmp-bad'); d.appendChild(el('p', 'k-label', 'Desventaja')); d.appendChild(el('p', '', D.c[c].d));
  g.appendChild(a); g.appendChild(d); box.appendChild(g);
  window.ovaMark('bal-' + c);
}));
let solved = false;
document.querySelectorAll('.cmp-opt').forEach(b => b.addEventListener('click', () => {
  if (solved) return;
  const ok = Number(b.dataset.c) === D.best, fb = $('cmp-fb');
  fb.classList.remove('k-hide');
  if (ok) { solved = true; b.classList.add('is-correct'); fb.className = 'k-fb ok'; fb.textContent = 'Correcto. ' + D.exp; window.ovaMark('reto'); }
  else { b.classList.add('is-wrong'); b.disabled = true; fb.className = 'k-fb bad'; fb.textContent = 'No es la mejor para este escenario. Revisa las dimensiones relevantes y prueba otra.'; }
}));
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_dimensions"]
    return {
        "titulo": f"Comparativa: {concept}"[:70],
        "intro": f"Tres alternativas relacionadas con {concept} frente a criterios medibles.",
        "imagen": {
            "tipo": "logo",
            "descripcion": f"Logotipo representativo de {concept}",
            "marca": concept,
        },
        "dimensiones": [f"Dimensión {k}" for k in range(1, n + 1)],
        "comparaciones": [
            {
                "concepto": f"Alternativa {c}",
                "valores": [f"Valor de la alternativa {c} en la dimensión {k}" for k in range(1, n + 1)],
                "ventaja": f"La alternativa {c} destaca por su rendimiento.",
                "desventaja": f"La alternativa {c} exige más administración.",
            }
            for c in range(1, 4)
        ],
        "reto": {
            "escenario": f"Una empresa debe elegir entre las alternativas de {concept} con poco tiempo de ventana.",
            "mejor": 2,
            "explicacion": "La alternativa 2 equilibra tiempo y costo; se sacrifica algo de simplicidad.",
        },
        "conclusion": "Elige según el criterio que más pese en tu escenario.",
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=9,
    title="Tabla Comparativa",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
