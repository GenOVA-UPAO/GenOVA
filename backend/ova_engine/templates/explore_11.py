"""EXPLORE 11 — Applet GeoGebra: construcción matemática interactiva con consignas guiadas."""

from __future__ import annotations

import re

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param("num_steps", 4, min=3, max=5, help="Número de consignas guiadas"),
)

_DISALLOWED_PATTERNS = re.compile(
    r"\b(execute|eval|javascript|script|window|document|cookie|fetch|xmlhttprequest|location|alert|open|parent|top|function)\b",
    re.IGNORECASE,
)
_URL_PATTERN = re.compile(r"(https?://|ftp://|//|www\.)", re.IGNORECASE)
_TAG_PATTERN = re.compile(r"<[^>]*>")


def is_safe_geogebra_command(cmd: str) -> bool:
    """Valida que un comando GeoGebra sea seguro (sin Execute, URLs, JS ni HTML)."""
    if not isinstance(cmd, str):
        return False
    trimmed = cmd.strip()
    if not trimmed or len(trimmed) > 300:
        return False
    if _DISALLOWED_PATTERNS.search(trimmed):
        return False
    if _URL_PATTERN.search(trimmed):
        return False
    if _TAG_PATTERN.search(trimmed):
        return False
    return not any(c in trimmed for c in ("`", "\\", "$"))


def schema(p: dict) -> dict:
    n = p["num_steps"]
    return obj(
        titulo=s(70),
        objetivo=s(160),
        comandos=arr(s(200), min_items=3, max_items=10),
        consignas=arr(
            obj(
                paso=i(),
                indicacion=s(180),
                pregunta=s(180),
                respuesta_esperada=s(80),
                feedback_correcto=s(140),
                feedback_incorrecto=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_steps"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Docente universitario experto en matemáticas, funciones, geometría y modelado computacional con GeoGebra.
[CONCEPTO] «{concept}».
[TAREA] Diseña un applet interactivo con GeoGebra para explorar matemáticamente «{concept}».
- titulo: título claro de la actividad (≤10 palabras).
- objetivo: qué patrón o propiedad matemática descubrirá el alumno (≤25 palabras).
- comandos: lista de 3 a 8 comandos GeoGebra limpios (ej: 'a = Slider(-5, 5, 0.5)', 'f(x) = a * x^2 + 1', 'P = (0, 0)', 'Intersect(f, g)', etc.). PROHIBIDO Execute, URLs, scripts o JS.
- consignas: exactamente {n} consignas guiadas paso a paso. Por cada consigna:
  * `paso`: número secuencial (1 a {n}).
  * `indicacion`: qué slider o elemento mover en el applet (≤20 palabras).
  * `pregunta`: qué valor, propiedad o cambio se observa (≤20 palabras).
  * `respuesta_esperada`: respuesta concisa esperada (número, signo, fórmula o palabra clave, ≤6 palabras).
  * `feedback_correcto`: explicación de por qué ocurre esa relación matemática (≤20 palabras).
  * `feedback_incorrecto`: pista que oriente a manipular el applet y verificar (≤20 palabras).
- cierre: síntesis conceptual de lo descubierto (≤35 palabras).
[RESTRICCIONES] Comandos matemáticos estándar de GeoGebra. Sin código HTML ni Markdown fuera del JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Docente experto en matemáticas, funciones, geometría y modelado computacional con GeoGebra.
[CONCEPTO] «{concept}».
[TAREA] Diseña un applet interactivo con GeoGebra para explorar matemáticamente «{concept}».
- titulo: título claro de la actividad (≤10 palabras).
- objetivo: qué patrón o propiedad matemática descubrirá el alumno (≤25 palabras).
- comandos: lista de 3 a 8 comandos GeoGebra limpios (ej: 'a = Slider(-5, 5, 0.5)', 'f(x) = a * x^2 + 1', 'P = (0, 0)', 'Intersect(f, g)', etc.). PROHIBIDO Execute, URLs, scripts o JS.
- consignas: exactamente {n} consignas guiadas paso a paso. Por cada consigna:
  * `paso`: número secuencial (1 a {n}).
  * `indicacion`: qué slider o elemento mover en el applet (≤20 palabras).
  * `pregunta`: qué valor, propiedad o cambio se observa (≤20 palabras).
  * `respuesta_esperada`: respuesta concisa esperada (número, signo, fórmula o palabra clave, ≤6 palabras).
  * `feedback_correcto`: explicación de por qué ocurre esa relación matemática (≤20 palabras).
  * `feedback_incorrecto`: pista que oriente a manipular el applet y verificar (≤20 palabras).
- cierre: síntesis conceptual de lo descubierto (≤35 palabras).
[RESTRICCIONES] Comandos matemáticos estándar de GeoGebra. Sin código HTML ni Markdown fuera del JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


GGB_CSS = """
<style>
.ggb-card{background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:var(--space-3,16px);margin-bottom:var(--space-3,16px)}
.ggb-offline-notice{background:var(--surface-tint,#eef2ff);border-left:4px solid var(--primary,#0A3D91);padding:12px 16px;border-radius:0 8px 8px 0;font-size:.9rem;color:var(--text,#1b2437);margin-bottom:16px}
.ggb-fallback{background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:16px;color:#856404;font-weight:600;text-align:center;margin:12px 0}
.ggb-wrapper{display:flex;flex-direction:column;gap:12px;align-items:center;background:var(--surface-tint,#eef2ff);border:1px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:12px;overflow-x:auto}
.ggb-container{width:100%;max-width:760px;min-height:480px;border-radius:8px;overflow:hidden;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.ggb-commands-box{width:100%;max-width:760px;background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:8px;padding:8px 12px;font-size:.85rem}
.ggb-commands-box summary{cursor:pointer;font-weight:700;color:var(--primary,#0A3D91)}
.ggb-commands-box code{display:block;white-space:pre-wrap;background:#f8fafc;padding:8px;border-radius:6px;margin-top:6px;font-family:monospace;color:#0f172a}
.ggb-steps{display:grid;gap:14px;margin-top:16px}
.ggb-step{background:var(--surface,#fff);border:2px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:16px;transition:border-color .2s ease}
.ggb-step.is-done{border-color:var(--success,#1a7f4b);background:rgba(26,127,75,.04)}
.ggb-step-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.ggb-badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--primary,#0A3D91);color:#fff;font-weight:700;font-size:.85rem}
.ggb-step.is-done .ggb-badge{background:var(--success,#1a7f4b)}
.ggb-step-title{font-weight:700;font-size:1rem;color:var(--text,#1b2437)}
.ggb-ind{color:var(--text-muted,#475569);font-size:.92rem;margin-bottom:8px}
.ggb-q{font-weight:600;font-size:.95rem;margin-bottom:10px}
.ggb-input-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ggb-in{flex:1;min-width:180px;padding:8px 12px;border:2px solid var(--border,#cbd5e1);border-radius:8px;font:inherit}
.ggb-btn{padding:8px 16px;border-radius:8px;border:2px solid var(--primary,#0A3D91);background:var(--primary,#0A3D91);color:#fff;font:inherit;font-weight:700;cursor:pointer}
.ggb-btn:hover:not(:disabled){background:#083075}
.ggb-btn:disabled{opacity:.5;cursor:not-allowed}
.ggb-fb{margin-top:10px;padding:10px 12px;border-radius:6px;font-size:.9rem}
.ggb-fb.is-ok{background:rgba(26,127,75,.12);color:var(--success,#1a7f4b);border-left:4px solid var(--success,#1a7f4b)}
.ggb-fb.is-bad{background:rgba(192,57,43,.12);color:var(--danger,#c0392b);border-left:4px solid var(--danger,#c0392b)}
.ggb-fb[hidden]{display:none}
@media (max-width: 600px) {
  .ggb-container{min-height:360px}
}
</style>
"""

GGB_JS = """
const ggbData = JSON.parse(document.getElementById('ova-data').textContent);
const totalSteps = ggbData.total;
const consignas = ggbData.consignas || [];
const completedSteps = new Set();

function onGgbScriptError() {
  const fb = document.getElementById('ggb-fallback');
  if (fb) fb.hidden = false;
}
window.onGgbScriptError = onGgbScriptError;
window.addEventListener('offline', onGgbScriptError);

function initGgb() {
  if (typeof GGBApplet === 'undefined') {
    setTimeout(function () {
      if (typeof GGBApplet === 'undefined') {
        onGgbScriptError();
      } else {
        mountGgb();
      }
    }, 2500);
    return;
  }
  mountGgb();
}

function mountGgb() {
  const params = {
    appName: 'classic',
    width: 760,
    height: 480,
    showToolBar: false,
    showAlgebraInput: false,
    showMenuBar: false,
    showResetIcon: true,
    enableShiftDragZoom: true,
    appletOnLoad: function (api) {
      const cmds = ggbData.comandos || [];
      cmds.forEach(function (cmd) {
        try {
          api.evalCommand(cmd);
        } catch (err) {
          console.warn('GeoGebra command error:', err);
        }
      });
    }
  };
  try {
    const applet = new GGBApplet(params, true);
    applet.inject('ggb-element');
  } catch (e) {
    onGgbScriptError();
  }
}

initGgb();

function norm(t) {
  return String(t == null ? '' : t)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/\\s+/g, ' ')
    .trim();
}

window.checkStep = function (k) {
  const item = consignas[k - 1];
  if (!item) return;
  const input = document.getElementById('in-' + k);
  const fb = document.getElementById('fb-' + k);
  const btn = document.getElementById('btn-' + k);
  const card = document.getElementById('step-' + k);
  const badge = document.getElementById('badge-' + k);

  const val = norm(input.value);
  const exp = norm(item.respuesta_esperada);

  if (!val) {
    fb.hidden = false;
    fb.className = 'ggb-fb is-bad';
    fb.textContent = 'Por favor escribe tu respuesta antes de verificar.';
    return;
  }

  const numVal = parseFloat(val.replace(',', '.'));
  const numExp = parseFloat(exp.replace(',', '.'));
  const isNumericMatch = !isNaN(numVal) && !isNaN(numExp) && Math.abs(numVal - numExp) < 0.05;
  const isTextMatch = val === exp || exp.includes(val) || val.includes(exp);

  if (isNumericMatch || isTextMatch) {
    fb.hidden = false;
    fb.className = 'ggb-fb is-ok';
    fb.textContent = '¡Correcto! ' + item.feedback_correcto;
    input.disabled = true;
    btn.disabled = true;
    card.classList.add('is-done');
    if (badge) badge.textContent = '✓';

    completedSteps.add(k);
    window.ovaMark('paso_' + k);
  } else {
    fb.hidden = false;
    fb.className = 'ggb-fb is-bad';
    fb.textContent = 'Revisa de nuevo: ' + item.feedback_incorrecto;
  }
};
"""


def render(data: dict, ctx: RenderContext) -> str:
    raw_cmds = data.get("comandos") or []
    safe_cmds = [c for c in raw_cmds if is_safe_geogebra_command(c)]
    if not safe_cmds:
        safe_cmds = ["f(x) = x^2"]

    consignas = data.get("consignas") or []
    n = len(consignas)

    steps_html = []
    for k, item in enumerate(consignas, 1):
        steps_html.append(
            f"""<div class="ggb-step" id="step-{k}" data-step="{k}">
  <div class="ggb-step-head">
    <span class="ggb-badge" id="badge-{k}">{k}</span>
    <span class="ggb-step-title">Paso {k}</span>
  </div>
  <p class="ggb-ind"><strong>Indicación:</strong> {esc(item.get("indicacion", ""))}</p>
  <p class="ggb-q">{esc(item.get("pregunta", ""))}</p>
  <div class="ggb-input-row">
    <input type="text" class="ggb-in" id="in-{k}" placeholder="Escribe tu respuesta..." aria-label="Respuesta para el paso {k}">
    <button type="button" class="ggb-btn" id="btn-{k}" onclick="checkStep({k})">Verificar</button>
  </div>
  <div class="ggb-fb" id="fb-{k}" hidden aria-live="polite"></div>
</div>"""
        )

    cmds_code = esc("\n".join(safe_cmds))

    return f"""{GGB_CSS}
<script src="https://www.geogebra.org/apps/deployggb.js" async onerror="onGgbScriptError()"></script>
<upao-header eyebrow="APPLET GEOGEBRA" title="{esc(data["titulo"])}">
  <p>{esc(data.get("objetivo", ""))}</p>
</upao-header>

<div class="ggb-offline-notice" role="note">
  <p><strong>Aviso para modo sin conexión:</strong> Este recurso interactivo necesita conexión para cargar GeoGebra. En formatos offline (como EPUB o exportación desconectada), revisa los comandos matemáticos y las consignas guiadas a continuación.</p>
</div>

<div class="ggb-card">
  <div class="ggb-wrapper">
    <div id="ggb-fallback" class="ggb-fallback" hidden role="alert">
      Este recurso necesita conexión para cargar GeoGebra.
    </div>
    <div id="ggb-element" class="ggb-container" role="region" aria-label="Construcción interactiva de GeoGebra"></div>
    <details class="ggb-commands-box">
      <summary>Ver comandos de la construcción GeoGebra ({len(safe_cmds)})</summary>
      <code>{cmds_code}</code>
    </details>
  </div>
</div>

<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Consignas completadas" show-fraction></upao-progress>
</div>

<div class="ggb-steps">
  {"".join(steps_html)}
</div>

<upao-summary title="Síntesis">
  {esc(data.get("cierre", ""))}
  <upao-complete slot="actions" label="Finalizar exploración" locked></upao-complete>
</upao-summary>

{json_data({"total": n, "comandos": safe_cmds, "consignas": consignas})}
{script(PROGRESS_JS)}
{script(GGB_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_steps", 4)
    pool = [
        (
            "Desplaza el deslizador a hacia valores positivos (a > 0) y luego negativos (a < 0).",
            "¿Hacia dónde se abren las ramas de la parábola cuando a es negativo?",
            "hacia abajo",
            "Cuando el coeficiente cuadrático es negativo, la parábola es cóncava hacia abajo.",
            "Observa la orientación de la curva cuando a < 0 en el plano cartesiano.",
        ),
        (
            "Fija a = 1 y varía el deslizador c entre -4 y 4 manteniendo b = 0.",
            "¿Qué punto notable de la parábola coincide con el valor de c cuando x = 0?",
            "intersección con el eje y",
            "El término independiente c indica exactamente el punto de corte con el eje vertical (0, c).",
            "Revisa las coordenadas del punto donde la curva corta la recta vertical x = 0.",
        ),
        (
            "Configura a = 1, b = 0 y c = -4.",
            "¿Cuáles son las raíces o intersecciones de la parábola con el eje x?",
            "2 y -2",
            "Resolviendo x^2 - 4 = 0 obtenemos las dos raíces reales x = 2 y x = -2.",
            "Observa los valores en el eje horizontal donde la curva cruza el eje de abscisas.",
        ),
        (
            "Aumenta el valor absoluto de a de 1 a 4.",
            "¿Cómo cambia la apertura o amplitud de las ramas de la parábola?",
            "se estrecha",
            "A mayor valor absoluto de a, mayor velocidad de crecimiento vertical y ramas más estrechas.",
            "Compara el ancho de la curva cuando a = 1 frente a cuando a = 4.",
        ),
        (
            "Mueve el deslizador b hacia la derecha (b > 0) manteniendo a = 1 y c = 0.",
            "¿Hacia qué lado del plano cartesiano se desplaza el vértice de la curva?",
            "hacia la izquierda",
            "La coordenada x del vértice es -b/(2a); si b > 0 y a > 0, el vértice se desplaza a la izquierda.",
            "Recuerda la fórmula de la abscisa del vértice xv = -b / (2a).",
        ),
    ]

    consignas = []
    for k in range(n):
        ind, preg, resp, f_ok, f_bad = pool[k % len(pool)]
        consignas.append(
            {
                "paso": k + 1,
                "indicacion": ind,
                "pregunta": preg,
                "respuesta_esperada": resp,
                "feedback_correcto": f_ok,
                "feedback_incorrecto": f_bad,
            }
        )

    return {
        "titulo": f"Exploración con GeoGebra: {concept}"[:70],
        "objetivo": f"Explora los parámetros y relaciones geométricas de {concept} mediante el applet dinámico."[:160],
        "comandos": [
            "a = Slider(-5, 5, 0.5)",
            "b = Slider(-5, 5, 0.5)",
            "c = Slider(-5, 5, 0.5)",
            "SetValue(a, 1)",
            "SetValue(b, 0)",
            "SetValue(c, 0)",
            "f(x) = a * x^2 + b * x + c",
            "V = Vertex(f)",
        ],
        "consignas": consignas,
        "cierre": f"Has verificado experimentalmente el comportamiento gráfico y analítico de {concept}."[:220],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=11,
    title="Applet GeoGebra",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
