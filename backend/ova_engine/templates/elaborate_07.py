"""ELABORATE 7 — Lab de Código: ejercicios SQL/PL-SQL con editor, validación por palabras clave y solución tras 2 intentos."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_exercises", 3, min=2, max=4, help="Número de ejercicios de código"),
)


def schema(p: dict) -> dict:
    n = p["num_exercises"]
    return obj(
        titulo=s(70),
        objetivo=s(190),
        ejemplo=obj(titulo=s(70), pasos=arr(s(170), 3, 4), codigo=s(320)),
        ejercicios=arr(
            obj(
                enunciado=s(270),
                codigo_inicial=s(380),
                palabras_clave=arr(s(36), 2, 6),
                solucion=s(440),
                error_comun=s(230),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(230),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_exercises"]
    return f"""[ROL] Diseñador de laboratorios de código SQL y PL/SQL de Oracle.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Crea {n} ejercicios de código sobre «{concept}» al estilo de examen (p. ej. «crea un índice por LAST_NAME y EMAIL en EMPLOYEES»), de dificultad creciente.
- titulo: título corto del laboratorio.
- objetivo: objetivo de aprendizaje observable («Al terminar podrás escribir…»).
- ejemplo: un ejemplo trabajado DISTINTO a los ejercicios: `titulo`, `pasos` (3-4 pasos de razonamiento, ≤25 palabras cada uno) y `codigo` (la sentencia resuelta).
- ejercicios: EXACTAMENTE {n}; cada uno con:
  * `enunciado`: lo que se pide, con tabla y columnas concretas (≤40 palabras).
  * `codigo_inicial`: la sentencia INCOMPLETA con huecos marcados como ___ (varias líneas si hace falta).
  * `palabras_clave`: 2-6 palabras o símbolos (en minúsculas o mayúsculas, da igual) que DEBE contener cualquier respuesta correcta, sin exigir el texto exacto (p. ej. «create index», «employees», «last_name»).
  * `solucion`: la sentencia correcta completa.
  * `error_comun`: el error más frecuente en este ejercicio y por qué ocurre (≤30 palabras).
- cierre: consolida la sintaxis y cuándo aplicarla.
[RESTRICCIONES] Sintaxis Oracle válida. Las palabras clave deben admitir distintas formas correctas de escribir la solución.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_FLOW = """<svg viewBox="0 0 520 90" role="img" aria-label="Flujo del laboratorio: leer el enunciado, completar el código y ejecutar la validación"><title>Flujo del laboratorio</title>
<defs><marker id="lc-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--text-muted)"/></marker></defs>
<rect x="8" y="20" width="140" height="50" rx="10" fill="var(--surface-tint)" stroke="var(--primary)" stroke-width="2"/>
<text x="78" y="50" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">1. Lee</text>
<rect x="190" y="20" width="140" height="50" rx="10" fill="var(--surface-tint)" stroke="var(--primary)" stroke-width="2"/>
<text x="260" y="50" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">2. Completa</text>
<rect x="372" y="20" width="140" height="50" rx="10" fill="var(--surface-tint)" stroke="var(--primary)" stroke-width="2"/>
<text x="442" y="50" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">3. Ejecuta</text>
<path d="M150 45H186" stroke="var(--text-muted)" stroke-width="2.5" marker-end="url(#lc-ar)"/>
<path d="M332 45H368" stroke="var(--text-muted)" stroke-width="2.5" marker-end="url(#lc-ar)"/></svg>"""


def render(data: dict, ctx: RenderContext) -> str:
    ex = data["ejercicios"]
    n = len(ex)
    e = data["ejemplo"]
    ejemplo = (
        f'<upao-example title="{esc(e["titulo"])}"><upao-steps><ol>'
        + "".join(f"<li>{esc(x)}</li>" for x in e["pasos"])
        + f'</ol></upao-steps><pre class="k-code"><code>{esc(e["codigo"])}</code></pre></upao-example>'
    )
    boxes = "".join(
        f'<section class="k-panel ova-stack lc-ex" data-i="{k}" aria-labelledby="lc-h{k}">'
        f'<div class="k-row"><span class="k-chip">Ejercicio {k + 1} de {n}</span><upao-status class="lc-st" state="info">Pendiente</upao-status></div>'
        f'<h3 id="lc-h{k}" style="margin:0">{esc(x["enunciado"])}</h3>'
        f'<label for="lc-a{k}" class="k-label">Editor (completa los ___)</label>'
        f'<textarea id="lc-a{k}" class="k-code-in" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off">{esc(x["codigo_inicial"])}</textarea>'
        f'<div class="k-row"><button type="button" class="k-btn main lc-run">▶ Ejecutar</button>'
        f'<button type="button" class="k-btn lc-reset">Restablecer</button>'
        f'<button type="button" class="k-btn lc-sol k-hide">Ver solución</button></div>'
        f'<div class="lc-out k-hide" aria-live="polite"></div></section>'
        for k, x in enumerate(ex)
    )
    return f"""
{header("LAB DE CÓDIGO", data["titulo"])}
{KIT_CSS}
<upao-objective>{esc(data["objetivo"])}</upao-objective>
<upao-figure caption="Figura 1. Cómo se resuelve cada ejercicio.">{_FLOW}</upao-figure>
{ejemplo}
{progress(n, "Ejercicios completados")}
<div class="ova-stack">{boxes}</div>
{summary(data["cierre"], "Cierre")}
{json_data([{"i": x["codigo_inicial"], "k": x["palabras_clave"], "s": x["solucion"], "e": x["error_comun"]} for x in ex])}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
document.querySelectorAll('.lc-ex').forEach(box => {
  const i = Number(box.dataset.i), ta = box.querySelector('textarea'), out = box.querySelector('.lc-out');
  const st = box.querySelector('.lc-st'), sol = box.querySelector('.lc-sol'), run = box.querySelector('.lc-run');
  let tries = 0, done = false;
  function lock() { done = true; ta.readOnly = true; run.disabled = true; sol.classList.add('k-hide'); }
  function say(cls, msg) { out.classList.remove('k-hide'); out.textContent = ''; out.appendChild(el('div', 'k-fb ' + cls, msg)); }
  run.addEventListener('click', () => {
    if (done) return;
    const code = ta.value;
    if (code.indexOf('___') !== -1) { st.setAttribute('state', 'warning'); st.textContent = 'Incompleto'; say('bad', 'Aún quedan huecos (___) por completar.'); return; }
    const miss = D[i].k.filter(k => !kwHit(code, k));
    if (!miss.length) {
      lock(); st.setAttribute('state', 'success'); st.textContent = 'Correcto';
      say('ok', '✓ La sentencia contiene todos los elementos esperados. Solución de referencia:');
      out.appendChild(el('pre', 'k-code', D[i].s)); window.ovaMark('ex-' + i); return;
    }
    tries++; st.setAttribute('state', 'error'); st.textContent = 'Con errores (intento ' + tries + ')';
    say('bad', 'Falta ' + miss.length + ' elemento(s) clave en tu sentencia. Error frecuente: ' + D[i].e);
    if (tries >= 2) sol.classList.remove('k-hide');
  });
  box.querySelector('.lc-reset').addEventListener('click', () => { if (!done) { ta.value = D[i].i; out.classList.add('k-hide'); } });
  sol.addEventListener('click', () => {
    lock(); ta.value = D[i].s; st.setAttribute('state', 'info'); st.textContent = 'Solución revelada';
    say('', 'Esta es la solución de referencia. Compárala con tu intento y repasa el error frecuente: ' + D[i].e);
    window.ovaMark('ex-' + i);
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Laboratorio de código: {concept}"[:70],
        "objetivo": f"Al terminar podrás escribir la sentencia correcta para {concept}.",
        "ejemplo": {
            "titulo": "Ejemplo trabajado: índice compuesto",
            "pasos": ["Identifica la tabla y las columnas de búsqueda.", "Elige CREATE INDEX con nombre claro.", "Lista las columnas en orden de selectividad."],
            "codigo": "CREATE INDEX idx_emp_name ON employees (last_name, first_name);",
        },
        "ejercicios": [
            {
                "enunciado": f"Ejercicio {k}: crea un índice por LAST_NAME y EMAIL en EMPLOYEES.",
                "codigo_inicial": "CREATE ___ idx_emp ON ___ (last_name, ___);",
                "palabras_clave": ["create index", "employees", "last_name", "email"],
                "solucion": "CREATE INDEX idx_emp ON employees (last_name, email);",
                "error_comun": "Olvidar la palabra INDEX o escribir mal el nombre de la tabla.",
            }
            for k in range(1, p["num_exercises"] + 1)
        ],
        "cierre": "Recuerda la sintaxis: objeto, tabla y columnas.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=7,
    title="Lab de Código",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
