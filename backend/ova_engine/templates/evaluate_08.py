"""EVALUATE 8 — Preguntas de Desarrollo: respuesta escrita, comparación con modelo y checklist de criterios."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, NORM_JS, trim_to_param

PARAMS = (
    Param("num_questions", 3, min=2, max=5, help="Número de preguntas abiertas"),
)

_CSS = """
<style>
.dv-area{width:100%;min-height:130px;padding:var(--space-2,12px);border:2px solid var(--primary,#0A3D91);border-radius:var(--radius,12px);font:inherit;color:var(--text,#1b2437);background:var(--surface,#fff);resize:vertical}
.dv-area:focus-visible{outline:3px solid var(--accent,#F47A20);outline-offset:2px}
.dv-count{font-size:.9rem;color:var(--text-muted,#5b6578)}
.dv-cmp{border-left:4px solid var(--accent,#F47A20);background:var(--surface-tint,#eef2ff);border-radius:0 10px 10px 0;padding:var(--space-3,16px)}
.dv-list{list-style:none;margin:8px 0;padding:0;display:grid;gap:8px}
.dv-list label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.dv-list input{width:22px;height:22px;flex:none;accent-color:var(--primary,#0A3D91)}
.dv-model{background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:10px;padding:var(--space-2,12px)}
</style>
"""

MIN_WORDS = 12


_JS = r'''
const cfg = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const score = $('score');
const total = cfg.crit.length;
const totalCrit = cfg.crit.reduce((a, b) => a + b, 0);
const got = new Array(total).fill(null);
function words(t) { return (t.trim().match(/\S+/g) || []).length; }
document.querySelectorAll('.dv-area').forEach(function (ta) {
  const k = ta.dataset.q;
  ta.addEventListener('input', function () {
    const w = words(ta.value);
    $('cnt' + k).textContent = w + ' palabras (mínimo ' + cfg.min + ')';
    $('cmp' + k).disabled = w < cfg.min;
  });
});
document.querySelectorAll('[id^="cmp"]').forEach(function (b) {
  b.addEventListener('click', function () {
    const k = b.dataset.q;
    $('ta' + k).readOnly = true; b.disabled = true;
    $('res' + k).hidden = false;
    $('res' + k).scrollIntoView({block: 'nearest'});
  });
});
document.querySelectorAll('[id^="done"]').forEach(function (b) {
  b.addEventListener('click', function () {
    const k = Number(b.dataset.q);
    const marked = document.querySelectorAll('#res' + k + ' input[type=checkbox]:checked').length;
    const n = cfg.crit[k];
    got[k] = marked;
    b.disabled = true;
    document.querySelectorAll('#res' + k + ' input').forEach(i => i.disabled = true);
    const pct = marked / n;
    say($('fb' + k), marked + ' de ' + n + ' criterios cumplidos. ' + (pct === 1
      ? 'Tu respuesta cubre todo lo esperado.'
      : pct >= 0.5 ? 'Buen avance: completa los criterios que faltan releyendo el modelo.'
      : 'Reescribe tu respuesta siguiendo la lógica del modelo y vuelve a intentarlo por tu cuenta.'), pct === 1 ? 'ok' : 'bad');
    score.set(got.reduce((a, v) => a + (v || 0), 0));
    window.ovaMark('d' + k);
    if (got.every(v => v !== null)) {
      const sum = got.reduce((a, v) => a + v, 0);
      $('result').hidden = false;
      $('result-big').textContent = sum + ' / ' + totalCrit + ' criterios (' + Math.round(100 * sum / totalCrit) + ' %)';
      $('result-msg').textContent = sum === totalCrit ? 'Fundamentas con rigor.' : 'Repasa los criterios no cumplidos en cada modelo.';
    }
  });
});
'''


def schema(p: dict) -> dict:
    n = p["num_questions"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        preguntas=arr(
            obj(
                enunciado=s(300),
                criterios=arr(s(140), 3, 4),
                respuesta_modelo=s(520),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Evaluador universitario de bases de datos.", f"Evaluador de {d.topic} para {d.audiencia}. {d.guia_nivel}")
    exigir = d.pick("justificar una decisión del DBA o escribir y explicar una sentencia Oracle.", "justificar una decisión, explicar un razonamiento o resolver un problema propio del tema.")
    n = p["num_questions"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Redacta {n} preguntas de desarrollo (respuesta abierta) sobre «{concept}» que exijan {exigir}
- titulo: título corto.
- instrucciones: una frase (escribe tu respuesta, compárala con el modelo y marca los criterios que cumpliste).
- preguntas: exactamente {n}. Cada una con:
  * `enunciado`: pregunta abierta (≤50 palabras), NO de sí/no.
  * `criterios`: 3 o 4 criterios OBSERVABLES que debe cumplir una buena respuesta (≤18 palabras cada uno, redactados como afirmaciones verificables, ej. «Menciona X y explica Y»).
  * `respuesta_modelo`: respuesta ejemplar razonada que cumple todos los criterios (≤80 palabras).
- cierre: frase que consolide cómo fundamentar respuestas técnicas.
[RESTRICCIONES] Los criterios deben poder comprobarse leyendo la respuesta. Sin preguntas de memoria pura.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    qs = data["preguntas"]
    n = len(qs)
    total_crit = sum(len(q["criterios"]) for q in qs)
    blocks = []
    for k, q in enumerate(qs):
        crit = "".join(
            f'<li><label><input type="checkbox" data-q="{k}"><span>{esc(c)}</span></label></li>'
            for c in q["criterios"]
        )
        blocks.append(
            f'<section class="ev-card ova-stack" id="dq{k}"><span class="ev-badge">Pregunta {k + 1} de {n}</span>'
            f'<h2 class="ev-q">{esc(q["enunciado"])}</h2>'
            f'<label for="ta{k}"><strong>Tu respuesta</strong></label>'
            f'<textarea class="dv-area" id="ta{k}" data-q="{k}" placeholder="Escribe aquí tu respuesta..."></textarea>'
            f'<div class="dv-count" id="cnt{k}" aria-live="polite">0 palabras (mínimo {MIN_WORDS})</div>'
            f'<div class="ev-row"><button type="button" class="ev-btn" id="cmp{k}" data-q="{k}" disabled>Comparar con el modelo</button></div>'
            f'<div class="dv-cmp ova-stack" id="res{k}" hidden>'
            f'<div class="dv-model"><strong>Respuesta modelo</strong><p>{esc(q["respuesta_modelo"])}</p></div>'
            f'<fieldset><legend><strong>Autoevalúate: marca los criterios que cumple tu respuesta</strong></legend>'
            f'<ul class="dv-list">{crit}</ul></fieldset>'
            f'<div class="ev-row"><button type="button" class="ev-btn is-ghost" id="done{k}" data-q="{k}">Registrar mi autoevaluación</button></div>'
            f'<div class="ev-fb" id="fb{k}" role="status" aria-live="polite" hidden></div></div></section>'
        )
    payload = [len(q["criterios"]) for q in qs]
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="PREGUNTAS DE DESARROLLO" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Preguntas completadas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{total_crit}" label="Criterios cumplidos"></upao-score>
</div>
<div class="ova-stack">{"".join(blocks)}</div>
<section class="ev-card ev-result" id="result" aria-live="polite" hidden><p class="ev-big" id="result-big"></p><p id="result-msg"></p></section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar evaluación" locked></upao-complete></upao-summary>
{json_data({"crit": payload, "min": MIN_WORDS})}
{script(PROGRESS_JS)}
{script(NORM_JS + _JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_questions"]
    base = [
        (
            "Una tabla de pedidos crece a 50 millones de filas y la consulta por cliente tarda segundos. Justifica qué índice crearías y cómo verificarías la mejora.",
            ["Propone un índice B-tree sobre la columna de cliente", "Explica por qué reduce lecturas de bloques", "Indica cómo comprobar el plan de ejecución"],
            "Crearía un índice B-tree sobre ID_CLIENTE porque el filtro devuelve pocas filas: el índice evita leer la tabla completa. Después revisaría el plan con EXPLAIN PLAN para confirmar INDEX RANGE SCAN y compararía las lecturas lógicas antes y después.",
        ),
        (
            "Escribe la sentencia para crear un índice sobre APELLIDO y explica qué ocurre con él al insertar miles de registros ascendentes.",
            ["Escribe una sentencia CREATE INDEX válida", "Menciona las divisiones de bloques hoja", "Relaciona el efecto con el rendimiento"],
            "CREATE INDEX idx_apellido ON clientes(apellido). Al insertar valores ascendentes los bloques hoja de la derecha se llenan y se dividen, lo que aumenta el espacio usado y puede degradar el rendimiento si no se mantiene el índice.",
        ),
        (
            "¿Cuándo decidirías NO indexar una columna? Argumenta con dos situaciones.",
            ["Da al menos dos situaciones distintas", "Justifica con costo de mantenimiento o selectividad", "Usa terminología correcta del optimizador"],
            "No indexaría columnas de baja selectividad porque el optimizador preferirá un full scan, ni tablas muy pequeñas o con muchas escrituras, ya que cada DML debe mantener el índice y el costo supera al beneficio.",
        ),
        (
            "Compara un acceso por INDEX UNIQUE SCAN con un TABLE ACCESS FULL y explica cuándo el segundo es mejor.",
            ["Describe ambos accesos", "Indica un caso donde el full scan gana", "Menciona el rol de las estadísticas"],
            "El unique scan baja por el árbol hasta una hoja y lee una fila por ROWID; el full scan lee todos los bloques. Si se necesita gran parte de la tabla, el full scan con lecturas multibloque es más barato; las estadísticas guían esa decisión.",
        ),
        (
            "Un DBA reconstruye índices cada noche. Evalúa si es una buena práctica y justifica.",
            ["Toma una postura clara", "Menciona el costo de reconstruir", "Propone una alternativa basada en medición"],
            "No es buena práctica generalizada: reconstruir consume E/S y bloquea recursos, y los B-tree se autobalancean. Conviene medir fragmentación y reconstruir solo índices con evidencia de degradación.",
        ),
    ]
    return {
        "titulo": f"Desarrollo: {concept}"[:70],
        "instrucciones": "Escribe tu respuesta, compárala con el modelo y marca los criterios que cumpliste.",
        "preguntas": [
            {"enunciado": base[k][0], "criterios": base[k][1], "respuesta_modelo": base[k][2]}
            for k in range(n)
        ],
        "cierre": f"Fundamentar tus decisiones sobre {concept} es la clave del DBA.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=8,
    title="Preguntas de Desarrollo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("preguntas", "num_questions"),
)
