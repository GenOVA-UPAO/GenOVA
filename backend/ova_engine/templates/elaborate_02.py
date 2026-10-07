"""ELABORATE 2 — Ejercicio Guiado: laboratorio por pasos con pista, validación por palabras clave y solución."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_steps", 5, min=4, max=6, help="Número de pasos incrementales del laboratorio"),
)


def schema(p: dict) -> dict:
    n = p["num_steps"]
    return obj(
        titulo=s(70),
        enunciado=s(280),
        pasos=arr(
            obj(
                instruccion=s(270),
                pista=s(210),
                resultado_esperado=s(330),
                validacion=s(280),
                palabras_clave=arr(s(32), 2, 5),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(230),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_steps"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        """[ROL] Instructor de laboratorio Oracle de un curso universitario.""",
        f"""[ROL] {d.docente.capitalize()} que diseña ejercicios guiados para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Diseña un ejercicio guiado de laboratorio sobre «{concept}» con un enunciado concreto (p. ej. «user02 solo puede actualizar EMAIL de EMPLOYEES si DEPARTMENT_ID <> 60») resuelto en EXACTAMENTE {n} pasos incrementales, sin saltos lógicos.""",
        f"""[TAREA] Diseña un ejercicio guiado sobre «{concept}» con un enunciado concreto y cotidiano para {d.audiencia}, resuelto en EXACTAMENTE {n} pasos incrementales, sin saltos lógicos.""",
    )
    _l3 = d.pick(
        """- titulo: título corto del laboratorio.""",
        """- titulo: título corto del ejercicio.""",
    )
    _l4 = d.pick(
        """- enunciado: el problema a resolver, con usuario, tabla/objeto y condición (≤40 palabras).""",
        """- enunciado: el problema a resolver, con datos y condición concretos (≤40 palabras).""",
    )
    _l5 = d.pick(
        """  * `pista`: ayuda que orienta sin dar la sentencia (≤25 palabras).""",
        """  * `pista`: ayuda que orienta sin dar el resultado (≤25 palabras).""",
    )
    _l6 = d.pick(
        """  * `resultado_esperado`: la sentencia SQL/PL-SQL/comando Oracle correcta, en una o pocas líneas.""",
        """  * `resultado_esperado`: el resultado correcto del paso (operación, expresión, respuesta o procedimiento), en una o pocas líneas.""",
    )
    _l7 = d.pick(
        """  * `palabras_clave`: 2-5 palabras o símbolos que DEBE contener la respuesta del estudiante y que aparecen literalmente dentro de `resultado_esperado` (p. ej. «GRANT», «UPDATE», «EMPLOYEES»).""",
        """  * `palabras_clave`: 2-5 palabras, números o símbolos que DEBE contener la respuesta del estudiante y que aparecen literalmente dentro de `resultado_esperado`.""",
    )
    _l8 = d.pick(
        """[RESTRICCIONES] Cada paso depende del anterior. Sintaxis Oracle correcta. Las palabras clave deben estar contenidas dentro del texto de resultado_esperado.""",
        f"""[RESTRICCIONES] Cada paso depende del anterior. Las palabras clave deben estar contenidas dentro del texto de resultado_esperado. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
{_l3}
{_l4}
- pasos: por cada paso:
  * `instruccion`: qué debe hacer el estudiante en este paso (≤35 palabras).
{_l5}
{_l6}
  * `validacion`: cómo comprobar que se logró y POR QUÉ funciona (≤35 palabras).
{_l7}
- cierre: qué logró el estudiante y cómo se generaliza.
{_l8}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    ps = data["pasos"]
    n = len(ps)
    steps = []
    for k, p in enumerate(ps):
        hidden = "" if k == 0 else " hidden"
        steps.append(
            f'<section class="k-panel ova-stack eg-step" data-i="{k}" aria-labelledby="eg-h{k}"{hidden}>'
            f'<div class="k-row"><span class="k-chip">Paso {k + 1} de {n}</span><h3 id="eg-h{k}" style="margin:0">{esc(p["instruccion"])}</h3></div>'
            f'<label for="eg-a{k}" class="k-label">Tu sentencia o respuesta</label>'
            f'<textarea id="eg-a{k}" class="k-code-in" spellcheck="false" autocomplete="off" rows="3"></textarea>'
            f'<div class="k-row"><button type="button" class="k-btn main eg-check">Comprobar</button>'
            f'<button type="button" class="k-btn eg-hint">Ver pista</button>'
            f'<button type="button" class="k-btn eg-sol k-hide">Ver solución</button></div>'
            f'<div class="k-fb k-hide eg-hintbox">{icon("bulb")} {esc(p["pista"])}</div>'
            f'<div class="eg-res k-hide" aria-live="polite"></div></section>'
        )
    return f"""
{header(ctx.title.upper(), data["titulo"])}
{KIT_CSS}
<article class="k-panel tint"><p class="k-label">Enunciado</p><p>{esc(data["enunciado"])}</p></article>
{progress(n, "Pasos completados")}
<div class="ova-stack" aria-live="polite">{"".join(steps)}</div>
<div id="eg-end" hidden>{summary(data["cierre"], "Cierre")}</div>
{json_data([{"r": p["resultado_esperado"], "v": p["validacion"], "k": p["palabras_clave"]} for p in ps])}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
const steps = Array.from(document.querySelectorAll('.eg-step'));
steps.forEach(box => {
  const i = Number(box.dataset.i), ta = box.querySelector('textarea'), res = box.querySelector('.eg-res');
  const hintBox = box.querySelector('.eg-hintbox'), sol = box.querySelector('.eg-sol'), check = box.querySelector('.eg-check');
  let tries = 0;
  function finish(ok) {
    ta.readOnly = true; check.disabled = true; box.querySelector('.eg-hint').disabled = true; sol.classList.add('k-hide');
    res.classList.remove('k-hide'); res.textContent = '';
    res.appendChild(el('div', 'k-fb ' + (ok ? 'ok' : ''), (ok ? '✓ Correcto. ' : 'Solución revelada. ') + D[i].v));
    res.appendChild(el('p', 'k-label', 'Sentencia de referencia'));
    res.appendChild(el('pre', 'k-code', D[i].r));
    window.ovaMark('paso-' + i);
    if (i + 1 < steps.length) { steps[i + 1].hidden = false; steps[i + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else document.getElementById('eg-end').hidden = false;
  }
  box.querySelector('.eg-hint').addEventListener('click', () => hintBox.classList.remove('k-hide'));
  sol.addEventListener('click', () => finish(false));
  check.addEventListener('click', () => {
    if (ta.value.trim().length < 3) { res.classList.remove('k-hide'); res.textContent = ''; res.appendChild(el('div', 'k-fb bad', 'Escribe tu respuesta antes de comprobar.')); return; }
    const missing = D[i].k.filter(k => !kwHit(ta.value, k));
    if (!missing.length) return finish(true);
    tries++;
    res.classList.remove('k-hide'); res.textContent = '';
    res.appendChild(el('div', 'k-fb bad', 'Aún falta algo: tu respuesta debería incluir ' + missing.length + ' elemento(s) clave más. Revisa la instrucción' + (tries >= 1 ? ' y la pista.' : '.')));
    hintBox.classList.remove('k-hide');
    if (tries >= 2) sol.classList.remove('k-hide');
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Laboratorio guiado: {concept}"[:70],
        "enunciado": "El usuario user02 solo puede actualizar la columna EMAIL de EMPLOYEES si DEPARTMENT_ID <> 60.",
        "pasos": [
            {
                "instruccion": f"Paso {k}: escribe la sentencia que avanza el laboratorio de {concept}.",
                "pista": "Piensa en el privilegio o la sentencia mínima necesaria.",
                "resultado_esperado": "GRANT UPDATE (email) ON employees TO user02;",
                "validacion": "Consulta DBA_COL_PRIVS: debe aparecer UPDATE sobre EMAIL, porque el privilegio es a nivel de columna.",
                "palabras_clave": ["grant", "update", "employees"],
            }
            for k in range(1, p["num_steps"] + 1)
        ],
        "cierre": "Lograste el objetivo con el mínimo privilegio necesario.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=2,
    title="Ejercicio Guiado",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
