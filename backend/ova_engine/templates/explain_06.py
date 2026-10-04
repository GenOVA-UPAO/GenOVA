"""EXPLAIN 6 — Glosario Visual: tarjetas de términos con definición, ejemplo y práctica de reconocimiento."""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    json_data,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

QUIZ_ROUNDS = 3

PARAMS = (
    Param("num_terms", 8, min=5, max=10, help="Número de términos del glosario"),
)


def schema(p: dict) -> dict:
    n = p["num_terms"]
    sch = obj(
        titulo=s(70),
        intro=s(180),
        terminos=arr(
            obj(
                termino=s(22),
                definicion=s(330),
                icono=s(8),
                icono_desc=s(110),
                ejemplo=s(220),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_terms"]
    return f"""[ROL] Lexicógrafo visual de sistemas de gestión de bases de datos.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Construye un glosario visual de exactamente {n} términos esenciales para comprender «{concept}», ordenados de lo más básico a lo más específico.
- titulo: título corto del glosario.
- intro: una frase que invite a explorar los términos.
- imagen (opcional): logo o imagen técnica representativa del tema (ej. logo de la tecnología o diagrama general).
- terminos: por cada término:
  * `termino`: el nombre exacto (≤20 caracteres).
  * `definicion`: definición autocontenida y precisa (≤50 palabras), sin usar el propio término para definirse.
  * `icono`: UN solo emoji distinto en cada término.
  * `icono_desc`: qué representa ese emoji respecto al término (≤15 palabras).
  * `ejemplo`: ejemplo real razonado (≤30 palabras): una situación del DBA o la sentencia/vista Oracle donde aparece el término.
- cierre: frase que conecte los términos entre sí y con «{concept}».
[RESTRICCIONES] Términos distintos entre sí, técnicamente correctos y sin tecnicismos sin definir.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    terms = data["terminos"]
    n = len(terms)
    rounds = min(QUIZ_ROUNDS, n)
    cards = []
    for k, t in enumerate(terms):
        cards.append(
            f'<article class="k-panel gl-card" data-i="{k}" data-term="{esc(t["termino"])}">'
            f'<div class="k-row"><span class="gl-ico" role="img" aria-label="{esc(t["icono_desc"])}">{esc(t["icono"])}</span>'
            f'<h3 class="gl-name">{esc(t["termino"])}</h3></div>'
            f'<button type="button" class="k-btn gl-btn" aria-expanded="false" aria-controls="gl-b{k}">Ver definición</button>'
            f'<div class="gl-body k-hide" id="gl-b{k}"><p>{esc(t["definicion"])}</p>'
            f'<p class="k-label">Ejemplo</p><p>{esc(t["ejemplo"])}</p></div></article>'
        )
    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Logotipo y diagrama de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""
{header("GLOSARIO VISUAL", data["titulo"], data["intro"])}
{KIT_CSS}
{IMAGE_FIGURE_CSS}
<style>
.gl-grid{{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))}}
.gl-ico{{font-size:2rem;line-height:1}}
.gl-name{{margin:0;font-size:1.1rem}}
.gl-card.seen{{border-color:var(--success)}}
.gl-body{{margin-top:10px}}
.gl-opts{{display:grid;gap:8px;margin-top:10px}}
</style>
{progress(n + rounds, "Términos explorados y práctica")}
{fig_html}
<div class="k-row"><label for="gl-q" class="k-label">Buscar término</label>
<input id="gl-q" type="search" class="ova-input k-grow" placeholder="Escribe para filtrar" autocomplete="off">
<span class="k-chip" id="gl-count" aria-live="polite">{n} términos</span></div>
<div class="gl-grid" id="gl-grid">{"".join(cards)}</div>
<p id="gl-empty" class="ova-muted k-hide" role="status">Ningún término coincide con la búsqueda.</p>
<section class="ova-card ova-stack" aria-labelledby="gl-quiz-h">
<h2 id="gl-quiz-h">Práctica: ¿de qué término se trata?</h2>
<p class="ova-muted">Lee la definición y elige el término correcto.</p>
<div id="gl-quiz" class="ova-stack"></div>
</section>
{summary(data["cierre"], "Resumen")}
{credits_sec}
{json_data({"t": [{"termino": t["termino"], "definicion": t["definicion"]} for t in terms], "rounds": rounds})}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const cards = Array.from(document.querySelectorAll('.gl-card'));
cards.forEach(c => {
  const btn = c.querySelector('.gl-btn'), body = c.querySelector('.gl-body');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    body.classList.toggle('k-hide', open);
    btn.textContent = open ? 'Ver definición' : 'Ocultar';
    if (!open) { c.classList.add('seen'); window.ovaMark('term-' + c.dataset.i); }
  });
});
const q = document.getElementById('gl-q');
q.addEventListener('input', () => {
  const v = norm(q.value); let shown = 0;
  cards.forEach(c => {
    const ok = !v || norm(c.dataset.term).includes(v) || norm(c.querySelector('.gl-body p').textContent).includes(v);
    c.classList.toggle('k-hide', !ok); if (ok) shown++;
  });
  document.getElementById('gl-count').textContent = shown + (shown === 1 ? ' término' : ' términos');
  document.getElementById('gl-empty').classList.toggle('k-hide', shown > 0);
});
const quiz = document.getElementById('gl-quiz');
const picks = shuffle(D.t.map((_, i) => i)).slice(0, D.rounds);
picks.forEach((idx, r) => {
  const box = el('div', 'k-panel');
  box.appendChild(el('p', '', D.t[idx].definicion));
  const fb = el('div', 'k-fb k-hide'); fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
  const others = shuffle(D.t.map((_, i) => i).filter(i => i !== idx)).slice(0, Math.min(3, D.t.length - 1));
  const opts = el('div', 'gl-opts');
  shuffle([idx].concat(others)).forEach(i => {
    const b = el('button', 'ova-option', D.t[i].termino); b.type = 'button';
    b.addEventListener('click', () => {
      if (box.dataset.done) return;
      const ok = i === idx;
      if (ok) { box.dataset.done = '1'; b.classList.add('is-correct'); window.ovaMark('quiz-' + r);
        fb.textContent = 'Correcto: ' + D.t[idx].termino + '.'; fb.className = 'k-fb ok'; }
      else { b.classList.add('is-wrong'); b.disabled = true;
        fb.textContent = 'Todavía no. Relee la definición e inténtalo con otra opción.'; fb.className = 'k-fb bad'; }
    });
    opts.appendChild(b);
  });
  box.appendChild(opts); box.appendChild(fb); quiz.appendChild(box);
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    icons = ["📘", "🔑", "🗄️", "⚙️", "🔍", "🧱", "📊", "🛡️", "⏱️", "🧩"]
    return {
        "titulo": f"Glosario de {concept}"[:70],
        "intro": f"Explora los términos clave para dominar {concept}.",
        "imagen": {
            "tipo": "logo",
            "descripcion": f"Logotipo representativo de {concept}",
            "marca": concept,
        },
        "terminos": [
            {
                "termino": f"Término {k}",
                "definicion": f"Definición autocontenida del término {k} dentro de {concept}.",
                "icono": icons[(k - 1) % len(icons)],
                "icono_desc": "Imagen que evoca el término.",
                "ejemplo": f"El DBA consulta una vista de Oracle donde aparece el término {k}.",
            }
            for k in range(1, p["num_terms"] + 1)
        ],
        "cierre": f"Estos términos se articulan para explicar {concept} de punta a punta.",
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=6,
    title="Glosario Visual",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
