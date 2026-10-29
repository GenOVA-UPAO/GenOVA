"""ELABORATE 3 — Mini-Proyecto: entregables con notas, cronómetro y autoevaluación con rúbrica."""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import (
    PROGRESS_JS,
    esc,
    paragraphs,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_deliverables", 3, min=2, max=5, help="Número de entregables del proyecto"),
)


def schema(p: dict) -> dict:
    n = p["num_deliverables"]
    sch = obj(
        titulo=s(70),
        objetivo=s(380),
        entregables=arr(s(180), n, n),
        dataset_sugerido=s(700),
        rubrica=arr(
            obj(criterio=s(40), basico=s(160), competente=s(160), avanzado=s(160)),
            4,
            4,
        ),
        cierre=s(230),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_deliverables"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        """[ROL] Diseñador de proyectos de bases de datos para un curso universitario.""",
        f"""[ROL] Diseñador de proyectos para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Diseña un mini-proyecto de 8-10 minutos donde el estudiante aplique «{concept}» en una pequeña empresa ficticia con {d.motor_corto if d.is_oracle else "un SGBD relacional"}.""",
        f"""[TAREA] Diseña un mini-proyecto de 8-10 minutos donde el estudiante aplique «{concept}» en una situación ficticia propia del área del tema.""",
    )
    _l3 = d.pick(
        f"""- dataset_sugerido: el caso de la pequeña empresa en ≤80 palabras: al menos 4 tablas con sus claves, filas estimadas, {d.si_oracle("tablespaces y ", "")}usuarios involucrados.""",
        """- dataset_sugerido: el caso o material de partida en ≤80 palabras: datos, elementos o fuentes con los que se trabaja y las personas o roles involucrados.""",
    )
    _l4 = d.pick(
        """  * tipo "diagrama" para flujos, modelos entidad-relación o arquitecturas del proyecto (incluye objeto `diagrama` con tipo: "flujo"|"er"|"capas"|"arbol", titulo, nodos, aristas).""",
        """  * tipo "diagrama" para flujos, esquemas o relaciones del proyecto (incluye objeto `diagrama` con tipo: "flujo"|"er"|"capas"|"arbol", titulo, nodos, aristas).""",
    )
    _l5 = d.pick(
        """  * tipo "foto" ÚNICAMENTE para hardware, servidores o infraestructura física real (consulta en inglés enfocada en hardware/datacenters).""",
        """  * tipo "foto" ÚNICAMENTE para objetos, lugares o instalaciones físicas reales (consulta en inglés).""",
    )
    _l6 = d.pick(
        f"""  * tipo "logo" para la tecnología o motor del proyecto (ej. {d.si_oracle("Oracle, PostgreSQL", "PostgreSQL, MySQL")}).""",
        """  * tipo "logo" para una marca o herramienta reconocible del proyecto, si la hay.""",
    )
    _l7 = d.pick(
        """[RESTRICCIONES] Entregables alcanzables en el tiempo; rúbrica con diferencias claras entre niveles.""",
        f"""[RESTRICCIONES] Entregables alcanzables en el tiempo; rúbrica con diferencias claras entre niveles. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
- titulo: título corto del proyecto.
- objetivo: qué debe lograr el estudiante y con qué resultado verificable (≤50 palabras).
- entregables: EXACTAMENTE {n} entregables concretos, realizables en pocos minutos y ordenados (cada uno ≤25 palabras, empieza con un verbo: «Define…», «Crea…», «Documenta…»).
{_l3}
- rubrica: EXACTAMENTE 4 criterios; cada uno con `criterio` (nombre corto) y tres descripciones observables de nivel `basico`, `competente` y `avanzado` (≤22 palabras cada una).
- cierre: cómo transferir el proyecto a un caso real.
- imagen (opcional): si añade valor conceptual sobre «{concept}» o el proyecto:
{_l4}
{_l5}
{_l6}
  * tipo "escena" para ilustraciones pedagógicas de la situación.
  Incluye {{"tipo": "diagrama"|"foto"|"logo"|"escena", "descripcion": "...", "consulta": "..." (en inglés)}}.
{_l7}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    ents = data["entregables"]
    n = len(ents)
    rub = data["rubrica"]
    ent_html = "".join(
        f'<li class="k-panel mp-ent ova-stack" data-i="{k}"><div class="k-row"><span class="k-chip">Entregable {k + 1}</span>'
        f'<span class="mp-st ova-muted" aria-live="polite">Pendiente</span></div>'
        f'<p><strong>{esc(e)}</strong></p>'
        f'<label for="mp-n{k}" class="k-label">Tu avance (breve)</label>'
        f'<textarea id="mp-n{k}" class="ova-input" rows="3" placeholder="Anota tu propuesta: nombres, sentencias o decisiones"></textarea>'
        f'<button type="button" class="k-btn mp-done" aria-pressed="false" disabled>Marcar como hecho</button></li>'
        for k, e in enumerate(ents)
    )
    rub_html = "".join(
        f'<fieldset class="k-panel mp-crit" data-c="{c}"><legend><strong>{esc(r["criterio"])}</strong></legend>'
        + "".join(
            f'<label class="mp-lvl"><input type="radio" name="mp-r{c}" value="{v}"> <span><em>{lbl}.</em> {esc(r[key])}</span></label>'
            for v, (lbl, key) in enumerate((("Básico", "basico"), ("Competente", "competente"), ("Avanzado", "avanzado")), 1)
        )
        + "</fieldset>"
        for c, r in enumerate(rub)
    )
    return f"""
{header("MINI-PROYECTO", data["titulo"])}
{KIT_CSS}
<style>
.mp-list{{list-style:none;margin:0;padding:0;display:grid;gap:12px}}
.mp-lvl{{display:flex;gap:8px;align-items:flex-start;padding:8px 4px;cursor:pointer}}
.mp-lvl input{{margin-top:5px;width:20px;height:20px;flex:none}}
fieldset.mp-crit{{margin:0 0 12px}}
.mp-ent.done{{border-color:var(--success)}}
</style>
<upao-objective>{esc(data["objetivo"])}</upao-objective>
{render_image_figure(data.get("imagen"), concept=ctx.concept)}
{progress(n + 1, "Entregables y autoevaluación")}
<article class="ova-card ova-stack" aria-labelledby="mp-ds-h"><h2 id="mp-ds-h">Caso y datos de partida</h2>{paragraphs(data["dataset_sugerido"])}</article>
<div class="k-row"><upao-timer id="tmr" seconds="600" label="Tiempo sugerido (10 min)"></upao-timer>
<button type="button" class="k-btn" id="mp-start">{icon('play')} Iniciar cronómetro</button></div>
<section class="ova-stack" aria-labelledby="mp-ent-h"><h2 id="mp-ent-h">Entregables</h2><ol class="mp-list">{ent_html}</ol></section>
<section class="ova-card ova-stack" aria-labelledby="mp-rub-h"><h2 id="mp-rub-h">Autoevalúa tu trabajo con la rúbrica</h2>
<p class="ova-muted">Elige el nivel que mejor describe tu entregable en cada criterio.</p>
{rub_html}
<div class="k-fb" id="mp-score" role="status" aria-live="polite">Evalúa los {len(rub)} criterios para ver tu resultado.</div></section>
{summary(data["cierre"], "Transferencia")}
{render_credits_section(data.get("imagen"))}
{script(PROGRESS_JS + UTIL_JS + '''
const $ = id => document.getElementById(id);
$('mp-start').addEventListener('click', () => { const t = $('tmr'); if (t && t.start) t.start(); $('mp-start').disabled = true; });
document.querySelectorAll('.mp-ent').forEach(li => {
  const i = li.dataset.i, ta = li.querySelector('textarea'), b = li.querySelector('.mp-done'), st = li.querySelector('.mp-st');
  ta.addEventListener('input', () => { if (b.getAttribute('aria-pressed') !== 'true') b.disabled = ta.value.trim().length < 10; });
  b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', 'true'); b.textContent = '✓ Hecho'; b.disabled = true; ta.readOnly = true;
    li.classList.add('done'); st.textContent = 'Completado'; window.ovaMark('ent-' + i);
  });
});
const crits = Array.from(document.querySelectorAll('.mp-crit'));
const names = ['', 'Básico', 'Competente', 'Avanzado'];
crits.forEach(f => f.addEventListener('change', () => {
  const vals = crits.map(c => { const r = c.querySelector('input:checked'); return r ? Number(r.value) : 0; });
  if (vals.some(v => !v)) return;
  const sum = vals.reduce((a, b) => a + b, 0), max = vals.length * 3, avg = sum / vals.length;
  const lvl = avg >= 2.5 ? 3 : avg >= 1.75 ? 2 : 1;
  const fb = $('mp-score'); fb.className = 'k-fb ' + (lvl === 3 ? 'ok' : '');
  fb.textContent = 'Puntaje: ' + sum + ' de ' + max + ' — nivel global ' + names[lvl] + '. ' +
    (lvl === 3 ? 'Excelente: revisa si puedes justificar cada decisión.' : 'Para subir de nivel, toma el criterio con menor puntaje y mejora tu entregable.');
  window.ovaMark('rubrica');
}));
''')}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Mini-proyecto: {concept}"[:70],
        "objetivo": f"Aplicar {concept} en una pequeña empresa y documentar la solución.",
        "entregables": [f"Entrega {k}: documenta una decisión de {concept}." for k in range(1, p["num_deliverables"] + 1)],
        "dataset_sugerido": "Tienda Andina: tablas CLIENTES (5 000 filas), PEDIDOS (40 000), PRODUCTOS (800) y DETALLE (120 000).\nTablespaces DATOS e INDICES; usuarios app_ventas y analista.",
        "rubrica": [
            {
                "criterio": f"Criterio {c}",
                "basico": "Resuelve parcialmente.",
                "competente": "Resuelve y justifica.",
                "avanzado": "Resuelve, justifica y optimiza.",
            }
            for c in range(1, 5)
        ],
        "cierre": "Lleva este patrón a una base de datos real de tu práctica.",
        "imagen": {
            "query": f"{concept} database architecture diagram",
            "tipo": "diagrama",
            "descripcion": f"Diagrama arquitectónico para {concept}",
        },
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=3,
    title="Mini-Proyecto",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
