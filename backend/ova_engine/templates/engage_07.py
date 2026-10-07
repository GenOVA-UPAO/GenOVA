"""ENGAGE 7 — Juego de Roles: simulación operativa de DBA junior con toma de decisiones.

El estudiante asume el rol de DBA junior en su primer día y afronta
un dilema crítico vinculado al concepto, observando consecuencias sin
que se revele la solución directamente, culminando en reflexión técnica.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.icons import icon
from ova_engine.schema import obj, s

PARAMS = (
    Param(
        "context_words",
        70,
        min=50,
        max=90,
        help="Palabras del contexto de rol",
    ),
)


def schema(p: dict) -> dict:
    return obj(
        titulo=s(70),
        contexto_rol=s(500),
        pregunta_decision=s(180),
        opcion_A=s(120),
        opcion_B=s(120),
        feedback_A=s(250),
        feedback_B=s(250),
        pregunta_cierre=s(160),
        reflexion_final=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    words = p["context_words"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador de experiencias de aprendizaje basadas en roles para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un escenario interactivo de juego de roles donde el estudiante actúa como un DBA junior en su primer día enfrentando un problema crítico en la base de datos que se resuelve mediante el entendimiento de «{concept}».
- titulo: título profesional y sugerente para la simulación de rol (≤10 palabras).
- contexto_rol: narrativa inmersiva en segunda persona ("tú") de aproximadamente {words} palabras que sitúa al estudiante como DBA junior en su primer día. Describe el entorno de la empresa, la presión del incidente y la tensión operativa relacionada directamente con «{concept}».
- pregunta_decision: el dilema técnico y operativo inmediato ante el cual debes tomar una decisión de guardia (≤25 palabras).
- opcion_A: primera alternativa de acción concreta y verosímil ante el incidente (≤15 palabras).
- opcion_B: segunda alternativa de acción concreta y verosímil con un enfoque técnico distinto (≤15 palabras).
- feedback_A: consecuencia y análisis inmediato de optar por la opción A (≤35 palabras). Valida el razonamiento sin revelar directamente la respuesta definitiva ni cerrar el caso.
- feedback_B: consecuencia y análisis inmediato de optar por la opción B (≤35 palabras). Valida el razonamiento sin revelar directamente la respuesta definitiva ni cerrar el caso.
- pregunta_cierre: pregunta provocadora para reflexionar sobre el impacto y balance de la decisión tomada (≤20 palabras).
- reflexion_final: síntesis reflexiva que analiza las tensiones del dilema y conecta la experiencia con los fundamentos de «{concept}» (≤45 palabras).
[RESTRICCIONES] Empatía total con el novato: transmite la ansiedad realista del primer día sin toxicidad laboral. Sin jerga técnica impenetrable ni fórmulas matemáticas. El feedback debe mostrar causas y efectos sin limitarse a un juicio binario de "correcto/incorrecto" ni regalar la solución.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador de experiencias de aprendizaje basadas en roles para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un escenario interactivo de juego de roles donde el estudiante actúa como un especialista junior en su primer día enfrentando un problema crítico que se resuelve mediante el entendimiento de «{concept}».
- titulo: título profesional y sugerente para la simulación de rol (≤10 palabras).
- contexto_rol: narrativa inmersiva en segunda persona ("tú") de aproximadamente {words} palabras que sitúa al estudiante como especialista junior en su primer día. Describe el entorno de la empresa, la presión del incidente y la tensión operativa relacionada directamente con «{concept}».
- pregunta_decision: el dilema técnico y operativo inmediato ante el cual debes tomar una decisión de guardia (≤25 palabras).
- opcion_A: primera alternativa de acción concreta y verosímil ante el incidente (≤15 palabras).
- opcion_B: segunda alternativa de acción concreta y verosímil con un enfoque técnico distinto (≤15 palabras).
- feedback_A: consecuencia y análisis inmediato de optar por la opción A (≤35 palabras). Valida el razonamiento sin revelar directamente la respuesta definitiva ni cerrar el caso.
- feedback_B: consecuencia y análisis inmediato de optar por la opción B (≤35 palabras). Valida el razonamiento sin revelar directamente la respuesta definitiva ni cerrar el caso.
- pregunta_cierre: pregunta provocadora para reflexionar sobre el impacto y balance de la decisión tomada (≤20 palabras).
- reflexion_final: síntesis reflexiva que analiza las tensiones del dilema y conecta la experiencia con los fundamentos de «{concept}» (≤45 palabras).
[RESTRICCIONES] Empatía total con el novato: transmite la ansiedad realista del primer día sin toxicidad laboral. Sin jerga técnica impenetrable ni fórmulas matemáticas. El feedback debe mostrar causas y efectos sin limitarse a un juicio binario de "correcto/incorrecto" ni regalar la solución.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.ova-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
  border-radius: 999px;
  font-size: 0.825rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.ova-role-tag {
  font-size: 0.8rem;
  color: var(--text-muted, #64748B);
  font-weight: 500;
}
.ova-role-text {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--text, #1E293B);
  margin: 0;
}
.ova-decision-prompt {
  font-size: 1.05rem;
  color: var(--text, #1E293B);
  margin-block: 8px 12px;
}
.ova-decision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 14px;
}
.ova-decision-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: var(--surface, #ffffff);
  border: 2px solid var(--border, #E2E8F0);
  border-radius: var(--radius, 12px);
  padding: 16px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text, #1E293B);
  transition: border-color .2s ease, box-shadow .2s ease, transform .15s ease;
  min-height: 44px;
  width: 100%;
}
.ova-decision-card:hover {
  border-color: var(--primary, #0A3D91);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 61, 145, 0.08);
}
.ova-decision-card:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-decision-card.is-selected {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EEF2FF);
  box-shadow: 0 0 0 2px var(--primary, #0A3D91);
}
.ova-decision-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  width: 100%;
}
.ova-opt-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary, #0A3D91);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
  transition: background .2s ease;
}
.ova-decision-card.is-selected .ova-opt-letter {
  background: var(--action, #F47A20);
}
.ova-opt-text {
  margin: 0;
  line-height: 1.5;
  color: var(--text, #1E293B);
}
.ova-feedback-panel {
  margin-top: 20px;
  border-radius: var(--radius, 12px);
  background: var(--surface-tint, #EEF2FF);
  border-left: 4px solid var(--action, #F47A20);
  padding: 16px 20px;
}
.ova-feedback-item h3 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: var(--primary, #0A3D91);
}
.ova-feedback-item p {
  margin: 0;
  line-height: 1.6;
  color: var(--text, #1E293B);
}
.ova-reflection-prompt {
  font-size: 1rem;
  color: var(--text, #1E293B);
  margin-block: 8px 12px;
}
</style>
"""

_ROLE_JS = """
(function () {
  const btnA = document.getElementById('btn-opt-a');
  const btnB = document.getElementById('btn-opt-b');
  const fbPanel = document.getElementById('feedback-panel');
  const fbA = document.getElementById('feedback-a');
  const fbB = document.getElementById('feedback-b');
  const rev = document.getElementById('reveal-reflexion');

  function selectOption(opt) {
    if (fbPanel) fbPanel.hidden = false;
    if (opt === 'A') {
      if (btnA) {
        btnA.classList.add('is-selected');
        btnA.setAttribute('aria-pressed', 'true');
      }
      if (btnB) {
        btnB.classList.remove('is-selected');
        btnB.setAttribute('aria-pressed', 'false');
      }
      if (fbA) fbA.hidden = false;
      if (fbB) fbB.hidden = true;
    } else if (opt === 'B') {
      if (btnB) {
        btnB.classList.add('is-selected');
        btnB.setAttribute('aria-pressed', 'true');
      }
      if (btnA) {
        btnA.classList.remove('is-selected');
        btnA.setAttribute('aria-pressed', 'false');
      }
      if (fbA) fbA.hidden = true;
      if (fbB) fbB.hidden = false;
    }
    window.ovaMark('decision');
  }

  if (btnA) {
    btnA.addEventListener('click', function () {
      selectOption('A');
    });
  }
  if (btnB) {
    btnB.addEventListener('click', function () {
      selectOption('B');
    });
  }

  if (rev) {
    rev.addEventListener('click', function () {
      window.ovaMark('reflexion');
    });
    const origReveal = rev.reveal;
    if (typeof origReveal === 'function') {
      rev.reveal = function () {
        origReveal.apply(this, arguments);
        window.ovaMark('reflexion');
      };
    }
    const origToggle = rev.toggle;
    if (typeof origToggle === 'function') {
      rev.toggle = function () {
        origToggle.apply(this, arguments);
        window.ovaMark('reflexion');
      };
    }
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    return f"""{_STYLE}
<upao-header eyebrow="JUEGO DE ROLES" title="{esc(data["titulo"])}">
  <p>Asume el rol de un especialista junior en su primer día y toma una decisión operativa clave.</p>
</upao-header>

<upao-progress id="prog" current="0" total="2" label="Progreso del caso" show-fraction></upao-progress>

<section class="ova-card">
  <div class="ova-role-header">
    <span class="ova-role-badge">{icon('user')} Rol: Especialista junior (Día 1)</span>
    <span class="ova-role-tag">Entorno de producción</span>
  </div>
  <h2>Situación operativa</h2>
  <p class="ova-role-text">{esc(data["contexto_rol"])}</p>
</section>

<section class="ova-card">
  <h2>{icon('bolt')} Dilema de decisión</h2>
  <p class="ova-decision-prompt"><strong>{esc(data["pregunta_decision"])}</strong></p>
  <p class="ova-muted" style="font-size:0.875rem;margin-bottom:14px">
    Selecciona la opción que consideres más adecuada para analizar su impacto en el sistema:
  </p>
  <div class="ova-decision-grid" role="group" aria-label="Alternativas de decisión">
    <button type="button" class="ova-decision-card" id="btn-opt-a" data-option="A" aria-pressed="false" aria-label="Opción A: {esc(data["opcion_A"])}">
      <div class="ova-decision-head">
        <span class="ova-opt-letter" aria-hidden="true">A</span>
        <strong>Opción A</strong>
      </div>
      <p class="ova-opt-text">{esc(data["opcion_A"])}</p>
    </button>
    <button type="button" class="ova-decision-card" id="btn-opt-b" data-option="B" aria-pressed="false" aria-label="Opción B: {esc(data["opcion_B"])}">
      <div class="ova-decision-head">
        <span class="ova-opt-letter" aria-hidden="true">B</span>
        <strong>Opción B</strong>
      </div>
      <p class="ova-opt-text">{esc(data["opcion_B"])}</p>
    </button>
  </div>

  <div id="feedback-panel" class="ova-feedback-panel" aria-live="polite" hidden>
    <div id="feedback-a" class="ova-feedback-item" hidden>
      <h3>Impacto y consecuencias de la Opción A</h3>
      <p>{esc(data["feedback_A"])}</p>
    </div>
    <div id="feedback-b" class="ova-feedback-item" hidden>
      <h3>Impacto y consecuencias de la Opción B</h3>
      <p>{esc(data["feedback_B"])}</p>
    </div>
  </div>
</section>

<section class="ova-card">
  <h2>Reflexión y Transferencia</h2>
  <p class="ova-reflection-prompt"><strong>{esc(data["pregunta_cierre"])}</strong></p>
  <p class="ova-muted" style="font-size:0.875rem;margin-bottom:14px">
    Abre la reflexión guiada para conectar las consecuencias observadas con los fundamentos teóricos:
  </p>
  <upao-reveal id="reveal-reflexion" label="Abrir análisis y reflexión guiada" icon="{esc(icon('bulb'))}">
    <p>{esc(data["reflexion_final"])}</p>
  </upao-reveal>
</section>

<upao-summary title="Cierre de la simulación">
  <p>
    Cada acción sobre una base de datos en producción conlleva un balance entre inmediatez, consistencia y estabilidad del servicio.
  </p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(_ROLE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Primer día de guardia: La encrucijada de {concept}"[:70],
        "contexto_rol": (
            f"Es tu primer día como DBA junior en ServiRed. A las 10:00 AM, el monitor "
            f"dispara alertas críticas: las transacciones de producción reportan retrasos "
            f"severos y bloqueos concurrentes vinculados al comportamiento de {concept}. "
            f"Tu líder de equipo está reunido con gerencia y la operación depende de tu calma "
            f"para evaluar el incidente antes de intervenir."
        )[:500],
        "pregunta_decision": (
            f"¿Qué acción prioritaria decides ejecutar ante la saturación vinculada a {concept}?"
        )[:180],
        "opcion_A": "Forzar la terminación inmediata de las sesiones que acumulan mayor tiempo de espera."[:120],
        "opcion_B": "Inspeccionar las métricas de contención y dependencias antes de interrumpir procesos."[:120],
        "feedback_A": (
            "Interrumpir sesiones alivia la memoria al instante, pero las transacciones abortadas "
            "dejan estados pendientes y el cuello de botella resurge cuando los clientes reintentan."
        )[:250],
        "feedback_B": (
            "Analizar las dependencias evita pérdidas operativas y permite identificar la causa raíz, "
            "aunque requiere sostener la presión del reloj mientras los usuarios esperan."
        )[:250],
        "pregunta_cierre": (
            "¿Cómo equilibra un DBA la urgencia del negocio frente a la estabilidad del motor?"
        )[:160],
        "reflexion_final": (
            f"En la administración de bases de datos, entender {concept} previene respuestas "
            f"apresuradas que agravan las caídas. Identificar la raíz del conflicto antes de "
            f"actuar es lo que define a un DBA confiable."
        )[:300],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=7,
    title="Juego de Roles",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
