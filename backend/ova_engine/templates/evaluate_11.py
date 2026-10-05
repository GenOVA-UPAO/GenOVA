"""EVALUATE 11 — Quiz Adaptativo: banco multinivel con ajuste dinámico de dificultad y reporte SCORM."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, obj, s
from ova_engine.templates._evaluate_common import EV_CSS

PARAMS = (
    Param("num_per_level", 3, min=2, max=4, help="Preguntas por nivel en el banco"),
    Param("max_questions", 5, min=4, max=6, help="Máximo de preguntas evaluadas"),
    Param("mastery_threshold", 2, min=2, max=3, help="Aciertos en nivel alto para dominar"),
)


def _q_obj() -> dict:
    return obj(
        id=s(12),
        enunciado=s(240),
        opciones=arr(obj(texto=s(120), correcta=b()), 4, 4),
        feedback_correcto=s(140),
        feedback_incorrecto=s(140),
    )


def schema(p: dict) -> dict:
    n = p["num_per_level"]
    return obj(
        titulo=s(70),
        instrucciones=s(180),
        banco=obj(
            bajo=arr(_q_obj(), min_items=n, max_items=n),
            medio=arr(_q_obj(), min_items=n, max_items=n),
            alto=arr(_q_obj(), min_items=n, max_items=n),
        ),
        cierre=s(220),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_per_level"]
    max_q = p["max_questions"]
    return f"""[ROL] Diseñador de evaluaciones adaptativas universitarias.
[CONCEPTO] «{concept}».
[TAREA] Diseña un banco de preguntas adaptativo estructurado en 3 niveles de dificultad sobre «{concept}». La prueba inicia en nivel medio, sube tras acierto y baja tras fallo, terminando tras un máximo de {max_q} preguntas o al dominar el nivel alto.
- titulo: título del quiz (≤10 palabras).
- instrucciones: frase orientadora sobre la mecánica adaptativa multinivel (≤25 palabras).
- banco:
  * `bajo`: exactamente {n} preguntas de nivel básico (recuerdo de conceptos clave, sintaxis fundamental, definiciones directas).
  * `medio`: exactamente {n} preguntas de nivel intermedio (aplicación práctica, análisis de consultas, comprensión de comportamientos).
  * `alto`: exactamente {n} preguntas de nivel avanzado (optimización crítica, diagnóstico de fallos complejos, casos límite).
  Cada pregunta con:
  - `id`: identificador corto único (ej: 'b1', 'm1', 'a1').
  - `enunciado`: pregunta directa y sin ambigüedad (≤40 palabras).
  - `opciones`: exactamente 4 opciones plausibles (≤15 palabras cada una); EXACTAMENTE UNA con `correcta: true`.
  - `feedback_correcto`: explicación concisa del fundamento de la respuesta correcta (≤20 palabras).
  - `feedback_incorrecto`: explicación del error común y corrección conceptual (≤20 palabras).
- cierre: frase final de consolidación formativa (≤35 palabras).
[RESTRICCIONES] Distractores verosímiles. Sin ambigüedad ni 'todas las anteriores'. Sin código HTML.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


ADAPTIVE_CSS = """
<style>
.ad-box{background:var(--surface,#fff);border:2px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:var(--space-3,16px);margin-top:14px}
.ad-meta{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.ad-lvl{font-size:.82rem;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:.03em;text-transform:uppercase}
.ad-lvl-bajo{background:#e0f2fe;color:#0369a1}
.ad-lvl-medio{background:#fef3c7;color:#b45309}
.ad-lvl-alto{background:#dcfce7;color:#15803d}
.ad-counter{font-size:.85rem;color:var(--text-muted,#475569);font-weight:600}
.ad-actions{display:flex;gap:10px;margin-top:14px;align-items:center}
.ad-breakdown{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0}
.ad-stat-card{background:var(--surface-tint,#eef2ff);border:1px solid var(--border,#cbd5e1);border-radius:8px;padding:10px;text-align:center}
.ad-stat-val{font-size:1.4rem;font-weight:800;color:var(--primary,#0A3D91)}
.ad-stat-lbl{font-size:.8rem;color:var(--text-muted,#475569);font-weight:600}
</style>
"""

ADAPTIVE_JS = """
const cfg = JSON.parse(document.getElementById('ova-data').textContent);
const banco = cfg.banco;
const maxQuestions = cfg.max_questions;
const masteryThreshold = cfg.mastery_threshold;

let currentLevel = 1; // 0: bajo, 1: medio, 2: alto
let highHits = 0;
let answeredCount = 0;
let selectedOptionIndex = null;
let currentQuestion = null;

const usedIds = new Set();
const stats = {
  bajo: { asked: 0, correct: 0 },
  medio: { asked: 0, correct: 0 },
  alto: { asked: 0, correct: 0 }
};

const levelKeys = ['bajo', 'medio', 'alto'];
const levelLabels = ['Nivel Básico', 'Nivel Intermedio', 'Nivel Avanzado'];
const levelClasses = ['ad-lvl-bajo', 'ad-lvl-medio', 'ad-lvl-alto'];

function pickQuestion(lvl) {
  const pool = banco[levelKeys[lvl]] || [];
  const available = pool.filter(function (q) { return !usedIds.has(q.id); });
  if (available.length > 0) {
    return available[0];
  }
  for (let offset = 1; offset <= 2; offset++) {
    const nextLvl = (lvl + offset) % 3;
    const fallbackPool = banco[levelKeys[nextLvl]] || [];
    const fallbackAvail = fallbackPool.filter(function (q) { return !usedIds.has(q.id); });
    if (fallbackAvail.length > 0) {
      currentLevel = nextLvl;
      return fallbackAvail[0];
    }
  }
  return null;
}

function renderQuestion() {
  currentQuestion = pickQuestion(currentLevel);
  if (!currentQuestion || answeredCount >= maxQuestions || highHits >= masteryThreshold) {
    finishQuiz();
    return;
  }

  usedIds.add(currentQuestion.id);
  selectedOptionIndex = null;

  const badge = document.getElementById('ad-badge');
  badge.className = 'ad-lvl ' + levelClasses[currentLevel];
  badge.textContent = levelLabels[currentLevel];

  document.getElementById('ad-counter').textContent = 'Pregunta ' + (answeredCount + 1) + ' de ' + maxQuestions;
  document.getElementById('ad-enunciado').textContent = currentQuestion.enunciado;

  const optsContainer = document.getElementById('ad-opts');
  optsContainer.innerHTML = '';
  document.getElementById('ad-fb').hidden = true;
  document.getElementById('ad-fb').textContent = '';

  const confirmBtn = document.getElementById('ad-confirm-btn');
  confirmBtn.hidden = false;
  confirmBtn.disabled = true;
  document.getElementById('ad-next-btn').hidden = true;

  currentQuestion.opciones.forEach(function (opt, idx) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ev-opt';
    btn.setAttribute('aria-pressed', 'false');

    const keySpan = document.createElement('span');
    keySpan.className = 'ev-key';
    keySpan.textContent = String.fromCharCode(65 + idx);

    const txtSpan = document.createElement('span');
    txtSpan.textContent = opt.texto;

    btn.appendChild(keySpan);
    btn.appendChild(txtSpan);

    btn.addEventListener('click', function () {
      document.querySelectorAll('#ad-opts .ev-opt').forEach(function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      btn.setAttribute('aria-pressed', 'true');
      selectedOptionIndex = idx;
      confirmBtn.disabled = false;
    });

    optsContainer.appendChild(btn);
  });
}

function confirmAnswer() {
  if (selectedOptionIndex === null || !currentQuestion) return;

  const optButtons = document.querySelectorAll('#ad-opts .ev-opt');
  optButtons.forEach(function (btn) { btn.disabled = true; });

  const chosenOpt = currentQuestion.opciones[selectedOptionIndex];
  const isCorrect = Boolean(chosenOpt && chosenOpt.correcta);

  const lvlKey = levelKeys[currentLevel];
  stats[lvlKey].asked++;
  if (isCorrect) stats[lvlKey].correct++;

  optButtons.forEach(function (btn, idx) {
    if (currentQuestion.opciones[idx].correcta) {
      btn.classList.add('is-ok');
    } else if (idx === selectedOptionIndex && !isCorrect) {
      btn.classList.add('is-bad');
    }
  });

  const fb = document.getElementById('ad-fb');
  fb.hidden = false;
  if (isCorrect) {
    fb.className = 'ev-fb is-ok';
    fb.textContent = '¡Correcto! ' + currentQuestion.feedback_correcto;
  } else {
    fb.className = 'ev-fb is-bad';
    fb.textContent = 'Incorrecto. ' + currentQuestion.feedback_incorrecto;
  }

  answeredCount++;
  const prog = document.getElementById('prog');
  if (prog && prog.set) prog.set(answeredCount);

  if (isCorrect) {
    if (currentLevel === 2) {
      highHits++;
    } else {
      currentLevel++;
    }
  } else {
    highHits = 0;
    if (currentLevel > 0) {
      currentLevel--;
    }
  }

  document.getElementById('ad-confirm-btn').hidden = true;
  const nextBtn = document.getElementById('ad-next-btn');
  nextBtn.hidden = false;

  if (answeredCount >= maxQuestions || highHits >= masteryThreshold) {
    nextBtn.textContent = 'Ver resultados finales';
  } else {
    nextBtn.textContent = 'Siguiente pregunta';
  }
}

function nextQuestion() {
  if (answeredCount >= maxQuestions || highHits >= masteryThreshold) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function calculateScore() {
  const wBajo = stats.bajo.correct * 15;
  const wMedio = stats.medio.correct * 20;
  const wAlto = stats.alto.correct * 25;
  const totalEarned = wBajo + wMedio + wAlto;

  const totalAsked = stats.bajo.asked + stats.medio.asked + stats.alto.asked;
  if (totalAsked === 0) return 0;

  const maxPossible = (stats.bajo.asked * 15) + (stats.medio.asked * 20) + (stats.alto.asked * 25);
  let pct = maxPossible > 0 ? Math.round((totalEarned / maxPossible) * 100) : 0;

  if (highHits >= masteryThreshold) {
    pct = Math.max(pct, 90);
  }
  return Math.min(100, Math.max(0, pct));
}

function finishQuiz() {
  document.getElementById('ad-active-section').hidden = true;
  const resultCard = document.getElementById('result');
  resultCard.hidden = false;

  const finalScore = calculateScore();
  const scoreEl = document.getElementById('score');
  if (scoreEl && scoreEl.set) scoreEl.set(finalScore);

  document.getElementById('result-big').textContent = finalScore + ' / 100 puntos';

  document.getElementById('stat-bajo-val').textContent = stats.bajo.correct + ' / ' + stats.bajo.asked;
  document.getElementById('stat-medio-val').textContent = stats.medio.correct + ' / ' + stats.medio.asked;
  document.getElementById('stat-alto-val').textContent = stats.alto.correct + ' / ' + stats.alto.asked;

  let verdictMsg = '';
  let masteryText = '';
  if (finalScore >= 85 || highHits >= masteryThreshold) {
    masteryText = 'Dominio Alto (Avanzado)';
    verdictMsg = '¡Sobresaliente! Demostraste un dominio sólido en el nivel avanzado.';
  } else if (finalScore >= 60) {
    masteryText = 'Dominio Medio (Intermedio)';
    verdictMsg = 'Buen desempeño: consolidaste con éxito los conceptos clave en nivel medio.';
  } else {
    masteryText = 'En Proceso (Requiere Refuerzo)';
    verdictMsg = 'Continúa repasando los fundamentos básicos para afianzar el aprendizaje.';
  }

  document.getElementById('dom-badge').textContent = masteryText;
  document.getElementById('result-msg').textContent = verdictMsg;

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'genova-resource-completed', score: finalScore }, '*');
  }
  if (typeof window._scormComplete === 'function') {
    window._scormComplete(finalScore);
  }

  document.querySelectorAll('upao-complete[locked]').forEach(function (b) {
    if (b.unlock) b.unlock();
  });
  if (typeof window.ovaMark === 'function') {
    window.ovaMark('quiz_adaptativo_complete');
  }
}

window.confirmAnswer = confirmAnswer;
window.nextQuestion = nextQuestion;

renderQuestion();
"""


def _fix_correct(opts: list) -> list[dict]:
    flags = [bool(o.get("correcta")) for o in opts]
    if flags.count(True) != 1:
        first = flags.index(True) if True in flags else 0
        return [{"texto": o.get("texto", ""), "correcta": i == first} for i, o in enumerate(opts)]
    return [{"texto": o.get("texto", ""), "correcta": bool(o.get("correcta"))} for o in opts]


def render(data: dict, ctx: RenderContext) -> str:
    p = ctx.params or {}
    max_q = p.get("max_questions", 5)
    mastery = p.get("mastery_threshold", 2)

    banco_raw = data.get("banco") or {}
    prepared_banco = {}
    for lvl in ("bajo", "medio", "alto"):
        items = banco_raw.get(lvl) or []
        fixed_items = []
        for i_idx, q in enumerate(items, 1):
            opts = _fix_correct(q.get("opciones") or [])
            fixed_items.append(
                {
                    "id": q.get("id") or f"{lvl}_{i_idx}",
                    "enunciado": q.get("enunciado", ""),
                    "opciones": opts,
                    "feedback_correcto": q.get("feedback_correcto", ""),
                    "feedback_incorrecto": q.get("feedback_incorrecto", ""),
                }
            )
        prepared_banco[lvl] = fixed_items

    return f"""{EV_CSS}
{ADAPTIVE_CSS}
<upao-header eyebrow="QUIZ ADAPTATIVO" title="{esc(data["titulo"])}">
  <p>{esc(data["instrucciones"])}</p>
</upao-header>

<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{max_q}" label="Preguntas evaluadas" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="100" label="Puntuación"></upao-score>
</div>

<section class="ad-box" id="ad-active-section" aria-live="polite">
  <div class="ad-meta">
    <span class="ad-lvl ad-lvl-medio" id="ad-badge">Nivel Intermedio</span>
    <span class="ad-counter" id="ad-counter">Pregunta 1 de {max_q}</span>
  </div>
  <h2 class="ev-q" id="ad-enunciado">Cargando pregunta...</h2>
  <div class="ev-opts" id="ad-opts" role="group" aria-labelledby="ad-enunciado"></div>
  <div class="ev-fb" id="ad-fb" hidden aria-live="polite"></div>
  <div class="ad-actions">
    <button type="button" class="ev-btn" id="ad-confirm-btn" onclick="confirmAnswer()" disabled>Confirmar respuesta</button>
    <button type="button" class="ev-btn is-ghost" id="ad-next-btn" onclick="nextQuestion()" hidden>Continuar</button>
  </div>
</section>

<section class="ev-card ev-result" id="result" aria-live="polite" hidden>
  <span class="ev-badge" id="dom-badge">Dominio</span>
  <p class="ev-big" id="result-big">0 / 100</p>
  <div class="ad-breakdown">
    <div class="ad-stat-card">
      <div class="ad-stat-val" id="stat-alto-val">0 / 0</div>
      <div class="ad-stat-lbl">Nivel Alto</div>
    </div>
    <div class="ad-stat-card">
      <div class="ad-stat-val" id="stat-medio-val">0 / 0</div>
      <div class="ad-stat-lbl">Nivel Medio</div>
    </div>
    <div class="ad-stat-card">
      <div class="ad-stat-val" id="stat-bajo-val">0 / 0</div>
      <div class="ad-stat-lbl">Nivel Bajo</div>
    </div>
  </div>
  <p id="result-msg"></p>
</section>

<upao-summary title="Cierre">
  {esc(data["cierre"])}
  <upao-complete slot="actions" label="Finalizar quiz adaptativo" locked></upao-complete>
</upao-summary>

{json_data({"banco": prepared_banco, "max_questions": max_q, "mastery_threshold": mastery})}
{script(PROGRESS_JS)}
{script(ADAPTIVE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_per_level", 3)

    pool_bajo = [
        ("¿Cuál es el rol principal de este componente?", "Almacenar y facilitar el acceso a los datos de forma estructurada", ["Eliminar registros aleatoriamente", "Compilar el código fuente del sistema operativo", "Sustituir la memoria RAM"]),
        ("¿Qué término describe una clave primaria en una tabla?", "Un identificador único de cada registro", ["Una columna que admite valores duplicados", "Un archivo temporal en disco", "Un parámetro de red"]),
        ("¿Qué comando SQL se usa para consultar registros?", "SELECT", ["DELETE", "GRANT", "DROP"]),
        ("¿Qué propiedad garantiza que una transacción se complete por completo o nada?", "Atomicidad", ["Aislamiento parcial", "Duplicación", "Lectura sucia"]),
    ]

    pool_medio = [
        ("¿Por qué el optimizador puede elegir un índice B-tree frente a un escaneo completo?", "Porque el filtro es muy selectivo y reduce los bloques a leer", ["Porque los índices siempre son más rápidos sin importar el volumen", "Porque la tabla no tiene almacenamiento físico", "Para evitar usar memoria en el buffer cache"]),
        ("Al ejecutar un UPDATE masivo en una transacción, ¿qué recurso de bloqueo se adquiere?", "Bloqueos exclusivos sobre las filas modificadas", ["Bloqueo total exclusivo de toda la instancia", "Ningún bloqueo en absoluto", "Bloqueos de lectura compartida"]),
        ("Si una consulta tarda mucho por lecturas físicas excesivas, ¿cuál es el diagnóstico inicial?", "Falta de índice adecuado o estadísticas desactualizadas", ["El disco está desconectado", "El puerto TCP está saturado", "El dialecto SQL no es compatible"]),
        ("¿Qué ventaja ofrece particionar una tabla grande?", "Poda de particiones para leer solo los bloques relevantes", ["Aumenta el número de transacciones fallidas", "Reduce el tamaño de las filas a cero", "Duplica el costo de las sentencias SELECT"]),
    ]

    pool_alto = [
        ("En un escenario de alta concurrencia con contention de buffer busy waits, ¿cuál es la solución técnica óptima?", "Aumentar los freelists o particionar la tabla para dispersar inserciones", ["Reducir el buffer cache a 16 MB", "Eliminar todas las claves foráneas", "Desactivar los redo logs"]),
        ("Si el plan de ejecución muestra un HASH JOIN con desborde a disco (temp space spill), ¿qué acción mitiga el problema?", "Incrementar PGA_AGGREGATE_TARGET o revisar estimaciones de cardinalidad", ["Reducir el tamaño de bloque de BD", "Forzar un FULL SCAN en todas las tablas", "Aumentar LOG_BUFFER"]),
        ("¿Qué mecanismo previene el fenómeno de 'library cache lock' durante la recompilación de paquetes en producción?", "Uso de edición basada en redefinición (EBR) y ventanas de bajo tráfico", ["Reiniciar la base de datos de inmediato", "Desactivar el listener de red", "Eliminar el shared pool"]),
        ("Ante un deadlock (ORA-00060), ¿cómo actúa el motor de la base de datos?", "Cancela la sentencia del participante que detectó el ciclo y revierte su operación", ["Detiene la instancia por completo", "Elimina ambas sesiones del sistema operativo", "Sobrescribe los datos en conflicto"]),
    ]

    def _make_qs(pool, prefix):
        res = []
        for k in range(n):
            enun, ok, bad = pool[k % len(pool)]
            opts = [{"texto": ok, "correcta": True}] + [{"texto": b_text, "correcta": False} for b_text in bad]
            # Rotate options to not keep correct in position 0
            shift = k % 4
            opts = opts[shift:] + opts[:shift]
            res.append(
                {
                    "id": f"{prefix}_{k + 1}",
                    "enunciado": f"{enun} ({concept})"[:240],
                    "opciones": opts,
                    "feedback_correcto": "Exacto: la justificación técnica coincide con el principio evaluado.",
                    "feedback_incorrecto": "Incorrecto: revisa el fundamento teórico y la aplicación en este nivel.",
                }
            )
        return res

    return {
        "titulo": f"Quiz Adaptativo: {concept}"[:70],
        "instrucciones": "Responde cada pregunta; el sistema ajustará la dificultad según tus respuestas.",
        "banco": {
            "bajo": _make_qs(pool_bajo, "b"),
            "medio": _make_qs(pool_medio, "m"),
            "alto": _make_qs(pool_alto, "a"),
        },
        "cierre": f"Has completado la evaluación formativa adaptativa sobre {concept}.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=11,
    title="Quiz Adaptativo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
