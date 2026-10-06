"""EVALUATE 10 — Diploma de Logro: nombre del estudiante, vista del diploma e impresión (window.print)."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS

PARAMS = (
    Param("num_competencias", 4, min=3, max=6, help="Número de competencias que certifica el diploma"),
    Param(
        "estilo",
        "clasico",
        choices=("clasico", "moderno"),
        help="Composición visual del diploma (marco clásico o franja moderna)",
    ),
)

_CSS = """
<style>
.dp-form{display:grid;gap:var(--space-2,12px);max-width:460px}
.dp-form label{font-weight:700}
.dp-paper{background:#fff;color:#1b2437;text-align:center;padding:var(--space-5,32px) var(--space-4,24px);border-radius:var(--radius,12px);border:6px double var(--primary,#0A3D91);box-shadow:var(--shadow,0 4px 16px rgba(10,61,145,.15))}
.dp-paper.is-moderno{border:0;border-top:14px solid var(--primary,#0A3D91);border-bottom:14px solid var(--accent,#F47A20);border-radius:6px}
.dp-seal{font-size:2.6rem;line-height:1}
.dp-kicker{letter-spacing:.2em;text-transform:uppercase;font-size:.8rem;color:#52617A;margin:0}
.dp-title{font-size:clamp(1.3rem,4.5vw,2rem);color:var(--primary,#0A3D91);margin:8px 0;overflow-wrap:anywhere}
.dp-name{display:inline-block;max-width:100%;font-size:clamp(1.5rem,6vw,2.4rem);font-weight:800;color:var(--primary,#0A3D91);border-bottom:3px solid var(--accent,#F47A20);padding:0 16px 4px;margin:12px 0;overflow-wrap:anywhere}
.dp-name.is-empty{color:#8a93a6;font-weight:500}
.dp-comp{text-align:left;max-width:560px;margin:12px auto;padding-left:1.2em}
.dp-foot{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-around;margin-top:24px;align-items:flex-end}
.dp-sign{min-width:180px;border-top:2px solid #1b2437;padding-top:4px;font-style:italic}
@media print{
  @page{margin:12mm}
  html,body{background:#fff!important}
  .no-print{display:none!important}
  main>*:not(#diploma-wrap){display:none!important}
  #diploma-wrap{display:block!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important}
  .dp-paper{box-shadow:none;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
"""


_JS = r'''
const $ = id => document.getElementById(id);
const name = $('nombre');
const d = new Date();
$('d-date').textContent = d.toLocaleDateString('es-PE', {year: 'numeric', month: 'long', day: 'numeric'});
function generate() {
  const v = name.value.trim().replace(/\s+/g, ' ');
  const msg = $('nombre-msg');
  if (v.length < 3) {
    msg.hidden = false; msg.className = 'ev-fb is-bad';
    msg.textContent = 'Escribe tu nombre completo (mínimo 3 caracteres) para emitir el diploma.';
    name.focus(); return;
  }
  msg.hidden = true;
  const dn = $('d-name');
  dn.textContent = v; dn.classList.remove('is-empty');
  $('after').hidden = false;
  window.ovaMark('diploma');
  $('btn-print').focus();
}
$('form').addEventListener('submit', function (e) { e.preventDefault(); generate(); });
name.addEventListener('input', function () {
  const v = name.value.trim();
  const dn = $('d-name');
  if (!$('after').hidden) { dn.textContent = v || 'Tu nombre aparecerá aquí'; dn.classList.toggle('is-empty', !v); }
});
$('btn-print').addEventListener('click', function () {
  if (name.value.trim().length < 3) { generate(); return; }
  window.print();
});
$('btn-edit').addEventListener('click', function () { name.focus(); name.select(); });
'''


def schema(p: dict) -> dict:
    n = p["num_competencias"]
    return obj(
        titulo=s(120),
        descripcion_logro=s(320),
        competencias=arr(s(140), n, n),
        firma=s(60),
        reflexion=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_competencias"]
    return f"""[ROL] Diseñador de diplomas y certificados de logro académico.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Redacta el texto de un diploma profesional por haber completado la unidad «{concept}».
- titulo: título formal del diploma (≤20 palabras, ej. «Diploma de Logro en …»).
- descripcion_logro: qué logró el estudiante, en tercera persona impersonal, sin nombre propio (≤50 palabras).
- competencias: exactamente {n} competencias medibles que certifica, cada una iniciando con un verbo en infinitivo observable (≤18 palabras).
- firma: cargo o nombre simulado de quien firma (ej. «Coordinación Académica — Sistemas de BD», ≤8 palabras).
- reflexion: mensaje reflexivo para el estudiante sobre cómo usar estos logros en su práctica profesional (≤40 palabras).
[RESTRICCIONES] Tono formal y motivador. No inventes nombres de personas, instituciones reales ni fechas.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    comps = "".join(f"<li>{esc(c)}</li>" for c in data["competencias"])
    estilo = ctx.params.get("estilo", "clasico")
    return f"""{EV_CSS}{_CSS}
<div class="no-print"><upao-header eyebrow="DIPLOMA DE LOGRO" title="Tu diploma de logro"><p>Escribe tu nombre, genera el diploma e imprímelo o guárdalo como PDF.</p></upao-header></div>
<div class="no-print ev-hud"><upao-progress id="prog" current="0" total="1" label="Diploma emitido" show-fraction></upao-progress></div>
<section class="ev-card ova-stack no-print" id="form-card">
  <form class="dp-form" id="form" novalidate>
    <label for="nombre">Nombre completo</label>
    <input class="ev-in" id="nombre" name="nombre" type="text" maxlength="60" autocomplete="name" placeholder="Ej. Ana Pérez Rojas" aria-describedby="nombre-msg">
    <div class="ev-fb" id="nombre-msg" role="status" aria-live="polite" hidden></div>
    <div class="ev-row"><button type="submit" class="ev-btn" id="btn-gen">Generar diploma</button></div>
  </form>
</section>
<section class="ev-card" id="diploma-wrap" aria-label="Diploma">
  <article class="dp-paper is-{esc(estilo)}" id="diploma">
    <div class="dp-seal" aria-hidden="true">🏆</div>
    <p class="dp-kicker">Se otorga a</p>
    <p class="dp-name is-empty" id="d-name" aria-live="polite">Tu nombre aparecerá aquí</p>
    <h2 class="dp-title">{esc(data["titulo"])}</h2>
    <p>{esc(data["descripcion_logro"])}</p>
    <p class="dp-kicker">Competencias certificadas</p>
    <ul class="dp-comp">{comps}</ul>
    <div class="dp-foot"><span id="d-date"></span><span class="dp-sign">{esc(data["firma"])}</span></div>
  </article>
</section>
<section class="ev-card ova-stack no-print" id="after" hidden>
  <div class="ev-row"><button type="button" class="ev-btn" id="btn-print">Imprimir / guardar como PDF</button><button type="button" class="ev-btn is-ghost" id="btn-edit">Cambiar nombre</button></div>
  <div class="ev-fb" role="status" aria-live="polite"><strong>Reflexión.</strong> {esc(data["reflexion"])}</div>
</section>
<div class="no-print"><upao-summary title="Cierre">Has completado la unidad de {esc(ctx.concept)}. Lleva estas competencias a tu práctica profesional.<upao-complete slot="actions" label="Finalizar" locked></upao-complete></upao-summary></div>
{json_data({"n": len(data["competencias"])})}
{script(PROGRESS_JS)}
{script(_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_competencias"]
    base = [
        "Explicar la estructura jerárquica de un índice B-tree",
        "Crear índices adecuados al patrón de consulta en Oracle",
        "Interpretar planes de ejecución para validar el uso de índices",
        "Decidir cuándo no indexar una columna con criterios de costo",
        "Diagnosticar fragmentación y divisiones de bloque",
        "Relacionar estadísticas del optimizador con la elección del acceso",
    ]
    return {
        "titulo": f"Diploma de Logro en {concept}"[:120],
        "descripcion_logro": f"Por haber completado satisfactoriamente la unidad sobre {concept}, demostrando dominio conceptual y práctico.",
        "competencias": base[:n],
        "firma": "Coordinación Académica — Sistemas de BD",
        "reflexion": "Aplica estas competencias en tu próximo proyecto: mide antes de optimizar y justifica cada decisión.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=10,
    title="Diploma de Logro",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
