"""EVALUATE 2 — Rúbrica de Autoevaluación: criterios con 3 niveles, puntaje y reflexión por rango."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, trim_to_param

PARAMS = (
    Param("num_criteria", 4, min=3, max=6, help="Número de criterios autoevaluables"),
)

_CSS = """
<style>
.rb-levels{display:grid;gap:var(--space-2,12px);margin-top:var(--space-2,12px)}
@media (min-width:640px){.rb-levels{grid-template-columns:repeat(3,1fr)}}
.rb-lvl{position:relative;display:block;cursor:pointer;border:2px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:var(--space-2,12px);background:var(--surface,#fff);min-height:44px}
.rb-lvl:hover{border-color:var(--primary,#0A3D91)}
.rb-lvl input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.rb-lvl:has(input:checked){border-color:var(--primary,#0A3D91);background:var(--surface-tint,#eef2ff)}
.rb-lvl:has(input:focus-visible){outline:3px solid var(--primary,#0A3D91);outline-offset:2px}
.rb-name{display:block;font-weight:700;color:var(--primary,#0A3D91);text-transform:capitalize}
.rb-pts{display:block;margin-bottom:4px;font-size:.8rem;color:var(--text-muted,#5b6578)}
.rb-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:6px 0}
</style>
"""

_LEVELS = (("inicial", 1, "Inicial"), ("desarrollo", 2, "En desarrollo"), ("logrado", 3, "Logrado"))


def schema(p: dict) -> dict:
    n = p["num_criteria"]
    return obj(
        titulo=s(70),
        instrucciones=s(160),
        criterios=arr(
            obj(criterio=s(160), inicial=s(200), en_desarrollo=s(200), logrado=s(200)),
            min_items=n,
            max_items=n,
        ),
        reflexion_baja=s(240),
        reflexion_media=s(240),
        reflexion_alta=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Diseñador de rúbricas de autoevaluación para universitarios.", f"Diseñador de rúbricas de autoevaluación para {d.audiencia}. {d.guia_nivel}")
    extra = d.pick("Incluye sentencias o elementos de Oracle cuando aplique.", "Mantente estrictamente en el tema y el nivel indicados, con ejemplos propios del tema.")
    n = p["num_criteria"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña una rúbrica de {n} criterios que el estudiante usa para valorar su propio dominio de «{concept}».
- titulo: título corto de la rúbrica.
- instrucciones: una frase que explique cómo autoevaluarse con honestidad.
- criterios: exactamente {n}. Cada uno con:
  * `criterio`: capacidad observable a evaluar (≤25 palabras).
  * `inicial`: descriptor del nivel inicial (1 punto), en primera persona «Puedo…» (≤30 palabras).
  * `en_desarrollo`: descriptor del nivel en desarrollo (2 puntos), «Puedo…» (≤30 palabras).
  * `logrado`: descriptor del nivel logrado (3 puntos), «Puedo…» (≤30 palabras).
- reflexion_baja / reflexion_media / reflexion_alta: mensaje reflexivo y accionable según el puntaje total (rango bajo <50 %, medio 50–79 %, alto ≥80 %), ≤35 palabras cada uno, con una sugerencia concreta de estudio.
[RESTRICCIONES] Los tres niveles deben diferenciarse por profundidad y autonomía, no por adjetivos vagos. {extra}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    crit = data["criterios"]
    n = len(crit)
    cards = []
    for k, c in enumerate(crit, 1):
        descs = (c["inicial"], c["en_desarrollo"], c["logrado"])
        lv = "".join(
            f'<label class="rb-lvl"><input type="radio" name="c{k}" value="{pts}" data-k="{k}">'
            f'<span class="rb-name">{esc(label)}</span><span class="rb-pts">{pts} punto{"s" if pts > 1 else ""}</span>'
            f"<span>{esc(descs[pts - 1])}</span></label>"
            for _key, pts, label in _LEVELS
        )
        cards.append(
            f'<fieldset class="ev-card"><legend class="ev-badge">Criterio {k} de {n}</legend>'
            f'<p class="ev-q">{esc(c["criterio"])}</p><div class="rb-levels">{lv}</div></fieldset>'
        )
    ref = {"baja": data["reflexion_baja"], "media": data["reflexion_media"], "alta": data["reflexion_alta"]}
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="AUTOEVALUACIÓN" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Criterios valorados" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{n * 3}" label="Puntos"></upao-score>
</div>
<div class="ova-stack">{"".join(cards)}</div>
<section class="ev-card ev-result ova-stack" id="result" aria-live="polite" hidden>
  <p class="ev-big" id="result-big"></p>
  <div class="ev-bar" aria-hidden="true"><span id="result-bar"></span></div>
  <p><strong id="result-level"></strong></p>
  <p id="result-msg"></p>
</section>
<upao-summary title="Tu reflexión"><span id="sum-text">Valora todos los criterios para ver tu reflexión.</span><upao-complete slot="actions" label="Finalizar autoevaluación" locked></upao-complete></upao-summary>
{json_data({"n": n, "reflexion": ref})}
{script(PROGRESS_JS)}
{script('''
const cfg = JSON.parse(document.getElementById('ova-data').textContent);
const score = document.getElementById('score');
const picked = {};
function refresh() {
  const sum = Object.values(picked).reduce((a, b) => a + b, 0);
  score.set(sum);
  const count = Object.keys(picked).length;
  if (count < cfg.n) return;
  const pct = Math.round(100 * sum / (cfg.n * 3));
  const key = pct >= 80 ? 'alta' : pct >= 50 ? 'media' : 'baja';
  const label = {alta: 'Nivel logrado', media: 'Nivel en desarrollo', baja: 'Nivel inicial'}[key];
  document.getElementById('result').hidden = false;
  document.getElementById('result-big').textContent = sum + ' / ' + (cfg.n * 3) + ' puntos (' + pct + ' %)';
  document.getElementById('result-bar').style.width = pct + '%';
  document.getElementById('result-level').textContent = label;
  document.getElementById('result-msg').textContent = cfg.reflexion[key];
  document.getElementById('sum-text').textContent = cfg.reflexion[key];
}
document.querySelectorAll('input[type=radio]').forEach(function (r) {
  r.addEventListener('change', function () {
    picked[r.dataset.k] = Number(r.value);
    window.ovaMark('c' + r.dataset.k);
    refresh();
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_criteria"]
    base = [
        "Explico la estructura jerárquica del índice y el papel de cada tipo de bloque",
        "Interpreto un plan de ejecución para saber si se usa el índice",
        "Escribo sentencias CREATE INDEX adecuadas al patrón de consulta",
        "Decido cuándo NO conviene indexar una columna",
        "Diagnostico divisiones de bloque y fragmentación del índice",
        "Relaciono estadísticas del optimizador con la elección del índice",
    ]
    crit = [
        {
            "criterio": f"{base[k]} ({concept})"[:160],
            "inicial": "Puedo nombrar el concepto pero necesito apoyo para aplicarlo.",
            "en_desarrollo": "Puedo aplicarlo en casos guiados con pocos errores.",
            "logrado": "Puedo aplicarlo y justificarlo de forma autónoma en casos nuevos.",
        }
        for k in range(n)
    ]
    return {
        "titulo": f"Autoevaluación: {concept}"[:70],
        "instrucciones": "Elige el nivel que mejor describe lo que HOY puedes hacer.",
        "criterios": crit,
        "reflexion_baja": "Repasa la teoría base y practica con un ejemplo guiado antes de seguir.",
        "reflexion_media": "Vas bien: practica con casos nuevos para ganar autonomía.",
        "reflexion_alta": "Dominas el tema: intenta explicarlo a un compañero o resolver casos complejos.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=2,
    title="Rúbrica de Autoevaluación",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("criterios", "num_criteria"),
)
