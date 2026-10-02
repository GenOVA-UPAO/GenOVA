"""EVALUATE 1 — Quiz Interactivo: preguntas progresivas con feedback por ítem y puntaje."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, obj, s
from ova_engine.templates._evaluate_common import EV_CSS

PARAMS = (
    Param("num_questions", 5, min=4, max=8, help="Número de preguntas del quiz"),
)


def schema(p: dict) -> dict:
    n = p["num_questions"]
    return obj(
        titulo=s(70),
        instrucciones=s(160),
        preguntas=arr(
            obj(
                enunciado=s(240),
                opciones=arr(obj(texto=s(120), correcta=b()), 4, 4),
                feedback_correcto=s(140),
                feedback_incorrecto=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_questions"]
    return f"""[ROL] Diseñador de quizzes universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña un quiz de {n} preguntas PROGRESIVAS (de teoría básica a aplicación práctica con Oracle) sobre «{concept}».
- titulo: título corto del quiz.
- instrucciones: una frase que explique cómo responder.
- preguntas: exactamente {n}. Cada una con:
  * `enunciado`: la pregunta (≤40 palabras).
  * `opciones`: exactamente 4 opciones plausibles (≤15 palabras cada una, sin prefijo A/B/C/D); EXACTAMENTE UNA con `correcta: true`; varía la posición de la correcta.
  * `feedback_correcto`: por qué es correcta (≤20 palabras).
  * `feedback_incorrecto`: qué error conceptual suele llevar a fallar y cuál es la idea correcta (≤20 palabras).
- cierre: frase final que consolide lo evaluado.
[RESTRICCIONES] Distractores plausibles, sin «todas las anteriores». Sin ambigüedad.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _fix_correct(opts: list) -> list[int]:
    flags = [bool(o.get("correcta")) for o in opts]
    if flags.count(True) != 1:  # el LLM es entrada no confiable: una sola correcta
        first = flags.index(True) if True in flags else 0
        flags = [i == first for i in range(len(opts))]
    return flags


def render(data: dict, ctx: RenderContext) -> str:
    qs = data["preguntas"]
    n = len(qs)
    blocks = []
    for k, q in enumerate(qs, 1):
        flags = _fix_correct(q["opciones"])
        choices = "".join(
            f'<upao-choice group="q{k}" value="{chr(65 + j)}" correct="{str(flags[j]).lower()}" '
            f'feedback="{esc(q["feedback_correcto"] if flags[j] else q["feedback_incorrecto"])}">'
            f'{esc(o["texto"])}</upao-choice>'
            for j, o in enumerate(q["opciones"])
        )
        blocks.append(
            f'<upao-question number="{k}" prompt="{esc(q["enunciado"])}">{choices}</upao-question>'
        )
    return f"""{EV_CSS}
<upao-header eyebrow="QUIZ INTERACTIVO" title="{esc(data["titulo"])}"><p>{esc(data["instrucciones"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Preguntas respondidas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{n * 10}" label="Puntuación"></upao-score>
</div>
<div class="ova-stack">{"".join(blocks)}</div>
<section class="ev-card ev-result" id="result" aria-live="polite" hidden>
  <p class="ev-big" id="result-big"></p>
  <p id="result-msg"></p>
</section>
<upao-summary title="Cierre">{esc(data["cierre"])}<upao-complete slot="actions" label="Finalizar quiz" locked></upao-complete></upao-summary>
{json_data({"total": n})}
{script(PROGRESS_JS)}
{script('''
const total = JSON.parse(document.getElementById('ova-data').textContent).total;
const score = document.getElementById('score');
let hits = 0, answered = 0;
document.addEventListener('upao-choice-selected', function (e) {
  answered++;
  if (e.detail && e.detail.correct) { hits++; score.add(10); }
  window.ovaMark(e.detail && e.detail.group);
  if (answered >= total) {
    const pct = Math.round(100 * hits / total);
    document.getElementById('result').hidden = false;
    document.getElementById('result-big').textContent = hits + ' / ' + total + ' correctas (' + pct + ' %)';
    document.getElementById('result-msg').textContent = pct >= 80
      ? 'Excelente dominio del tema.'
      : pct >= 50 ? 'Buen avance: repasa las preguntas con feedback en rojo.'
      : 'Necesitas repasar el tema antes de continuar.';
  }
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_questions"]
    pool = [
        ("¿Qué estructura organiza las claves de un índice B-tree?", "Un árbol balanceado de bloques raíz, rama y hoja", ["Una lista enlazada de filas", "Una tabla hash en memoria", "Un archivo plano ordenado"]),
        ("¿Qué guardan los bloques hoja de un índice B-tree?", "Pares clave-ROWID ordenados", ["Filas completas de la tabla", "Sentencias SQL compiladas", "Estadísticas del optimizador"]),
        ("¿Qué operación del plan indica el uso de un índice por igualdad?", "INDEX UNIQUE SCAN", ["TABLE ACCESS FULL", "HASH JOIN", "SORT AGGREGATE"]),
        ("Una tabla de 10 filas, ¿por qué el optimizador puede ignorar el índice?", "Leer la tabla completa cuesta menos que recorrer el índice", ["Los índices no funcionan con tablas pequeñas", "El índice está corrupto", "Oracle no soporta índices en tablas chicas"]),
        ("¿Qué sentencia crea un índice B-tree sobre APELLIDO?", "CREATE INDEX idx_ap ON clientes(apellido)", ["CREATE KEY apellido ON clientes", "ALTER TABLE clientes ADD INDEX", "INDEX clientes(apellido) CREATE"]),
        ("¿Qué ocurre con el índice tras muchos INSERT ascendentes?", "Se producen divisiones de bloques hoja", ["Se elimina la raíz", "La tabla se reordena físicamente", "El índice pasa a ser bitmap"]),
        ("¿Qué vista del diccionario lista los índices de un usuario?", "USER_INDEXES", ["USER_TABLES", "V$SESSION", "DBA_USERS"]),
        ("¿Cuándo conviene un índice sobre una columna?", "Cuando los filtros devuelven pocas filas", ["Cuando todas las consultas leen toda la tabla", "Cuando la columna es constante", "Nunca en columnas de texto"]),
    ]
    qs = []
    for k in range(n):
        enun, ok, bad = pool[k % len(pool)]
        pos = k % 4
        texts = bad[:]
        texts.insert(pos, ok)
        qs.append(
            {
                "enunciado": f"{enun} ({concept})"[:280],
                "opciones": [{"texto": t, "correcta": j == pos} for j, t in enumerate(texts)],
                "feedback_correcto": "Correcto: así funciona el mecanismo.",
                "feedback_incorrecto": "Revisa la definición; ese enfoque no corresponde.",
            }
        )
    return {
        "titulo": f"Quiz: {concept}"[:70],
        "instrucciones": "Elige una opción por pregunta; verás el porqué al instante.",
        "preguntas": qs,
        "cierre": f"Has repasado los puntos clave de {concept}.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=1,
    title="Quiz Interactivo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
