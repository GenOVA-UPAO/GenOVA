"""EXPLORE 2 — Agente Socrático: indagación guiada con DBGuide sobre evidencias reales de BD.

El estudiante interactúa con un agente socrático (DBA mentor) que presenta datos
de rendimiento, consultas SQL y planes de ejecución, formulando hipótesis para
descubrir progresivamente los principios internos del concepto.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.icons import icon
from ova_engine.schema import arr, b, i, obj, s

PARAMS = (Param("num_turns", 4, min=3, max=6, help="Número de turnos socráticos"),)


def schema(p: dict) -> dict:
    n = p["num_turns"]
    return obj(
        titulo=s(70),
        intro=s(160),
        turnos=arr(
            obj(
                turno=i(),
                dato_mostrado=s(250),
                pregunta=s(180),
                pista=s(180),
                opciones=arr(
                    obj(
                        texto=s(100),
                        feedback=s(160),
                        correcta=b(),
                    ),
                    2,
                    3,
                ),
            ),
            min_items=n,
            max_items=n,
        ),
        revelacion_final=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_turns"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Agente pedagógico socrático «DBGuide», DBA mentor experto — guías con agudeza, nunca revelas la respuesta directamente.
[CURSO] Sistemas de Gestión de Base de Datos.
[CONCEPTO] «{concept}».
[TAREA] Diseña una sesión socrática interactiva de {n} turnos que guíe al estudiante a descubrir la idea central, arquitectura y comportamiento de «{concept}». En cada turno presentas evidencia empírica real de base de datos (salidas de vistas V$, fragmentos SQL/DDL/DML, trazas de eventos o planes de ejecución explain plan) y planteas una pregunta inductiva que lo incite a formular hipótesis.
- titulo: título inspirador de la sesión de indagación (≤10 palabras).
- intro: mensaje inicial de DBGuide saludando al estudiante y planteando el enigma técnico a resolver (≤25 palabras).
- turnos: exactamente {n} turnos secuenciales con dificultad creciente (1 a {n}). Para cada turno:
  * `turno`: número correlativo del turno (1 a {n}).
  * `dato_mostrado`: evidencia técnica real y concisa de base de datos (ej. consulta SQL, salida de V$SESSION/V$SQL/V$SYSSTAT, parámetros del motor o explain plan) (≤35 palabras).
  * `pregunta`: pregunta socrática inductiva sobre el dato mostrado, que guía al estudiante hacia la deducción sin revelar la respuesta (≤25 palabras).
  * `pista`: orientación de apoyo de DBGuide para encauzar el razonamiento si el estudiante vacila (≤25 palabras).
  * `opciones`: entre 2 y 3 hipótesis formuladas por el estudiante. Exactamente UNA con `correcta: true`; cada una con `feedback` de DBGuide validando el acierto o aclarando constructivamente la imprecisión (≤25 palabras por feedback).
- revelacion_final: síntesis integradora de DBGuide uniendo todas las pistas para confirmar el principio fundamental deducido sobre «{concept}» (≤45 palabras).
[RESTRICCIONES] Nunca digas "la respuesta es". Tono de mentor curioso, analítico y cercano. Los datos mostrados deben representar situaciones técnicas creíbles en un motor relacional. No generes etiquetas HTML ni markdown en el JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Agente pedagógico socrático «Guía», mentor experto en «{concept}» — guías con agudeza, nunca revelas la respuesta directamente.
[CURSO] Nivel: {d.audiencia}.
[CONCEPTO] «{concept}».
[TAREA] Diseña una sesión socrática interactiva de {n} turnos que guíe al estudiante a descubrir la idea central, arquitectura y comportamiento de «{concept}». En cada turno presentas evidencia empírica real del tema (datos, mediciones, observaciones, fragmentos de texto, fórmulas o ejemplos concretos) y planteas una pregunta inductiva que lo incite a formular hipótesis.
- titulo: título inspirador de la sesión de indagación (≤10 palabras).
- intro: mensaje inicial de Guía saludando al estudiante y planteando el enigma técnico a resolver (≤25 palabras).
- turnos: exactamente {n} turnos secuenciales con dificultad creciente (1 a {n}). Para cada turno:
  * `turno`: número correlativo del turno (1 a {n}).
  * `dato_mostrado`: evidencia real y concisa del tema (ej. una medición, una tabla pequeña, una observación o un ejemplo concreto) (≤35 palabras).
  * `pregunta`: pregunta socrática inductiva sobre el dato mostrado, que guía al estudiante hacia la deducción sin revelar la respuesta (≤25 palabras).
  * `pista`: orientación de apoyo de Guía para encauzar el razonamiento si el estudiante vacila (≤25 palabras).
  * `opciones`: entre 2 y 3 hipótesis formuladas por el estudiante. Exactamente UNA con `correcta: true`; cada una con `feedback` de Guía validando el acierto o aclarando constructivamente la imprecisión (≤25 palabras por feedback).
- revelacion_final: síntesis integradora de Guía uniendo todas las pistas para confirmar el principio fundamental deducido sobre «{concept}» (≤45 palabras).
[RESTRICCIONES] Nunca digas "la respuesta es". Tono de mentor curioso, analítico y cercano. Los datos mostrados deben representar situaciones técnicas creíbles en un motor relacional. No generes etiquetas HTML ni markdown en el JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.socratic-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 20px);
}
.socratic-chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 20px);
}
.socratic-turn {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: clamp(16px, 3vw, 24px);
  box-shadow: 0 2px 8px rgba(10, 61, 145, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: socratic-fade-in .3s ease-out;
}
@keyframes socratic-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.socratic-turn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.socratic-mentor-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.socratic-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface-tint, #eaf0fb);
  border: 2px solid var(--primary, #0A3D91);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}
.socratic-mentor-name {
  font-weight: 700;
  color: var(--primary, #0A3D91);
  font-size: 1rem;
  margin: 0;
  line-height: 1.2;
}
.socratic-mentor-role {
  font-size: 0.78rem;
  color: var(--text-muted, #5a6b85);
  margin: 0;
}
.socratic-turn-badge {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #eaf0fb);
  color: var(--primary, #0A3D91);
  border: 1px solid var(--border, #cbd5e1);
}
.socratic-evidence-box {
  background: #0f172a;
  color: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #334155;
}
.socratic-evidence-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
}
.socratic-terminal-dots {
  display: inline-flex;
  gap: 4px;
}
.socratic-terminal-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
}
.socratic-terminal-dots span:nth-child(1) { background: #ef4444; }
.socratic-terminal-dots span:nth-child(2) { background: #f59e0b; }
.socratic-terminal-dots span:nth-child(3) { background: #10b981; }
.socratic-code {
  margin: 0;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  color: #38bdf8;
  background: #0f172a;
}
.socratic-question-card {
  background: var(--surface-tint, #eaf0fb);
  border-left: 4px solid var(--primary, #0A3D91);
  border-radius: 0 var(--radius, 8px) var(--radius, 8px) 0;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.socratic-q-icon {
  font-size: 1.2rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}
.socratic-q-text {
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--text, #15233b);
  margin: 0;
  font-weight: 600;
}
.socratic-options-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.socratic-options-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted, #5a6b85);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}
.socratic-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.socratic-opt-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 48px;
  border: 2px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  background: var(--surface, #ffffff);
  color: var(--text, #15233b);
  font-family: inherit;
  font-size: 0.94rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease;
}
.socratic-opt-btn:hover:not(:disabled) {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #eaf0fb);
}
.socratic-opt-btn:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.socratic-opt-btn:disabled {
  cursor: default;
}
.socratic-opt-btn.is-correct {
  border-color: var(--success, #146c49);
  background: var(--success-bg, #f0fdf4);
}
.socratic-opt-btn.is-wrong {
  border-color: var(--accent, #f47a20);
  background: var(--warning-bg, #fffbeb);
}
.socratic-opt-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary, #0A3D91);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color .2s;
}
.socratic-opt-btn.is-correct .socratic-opt-badge {
  background: var(--success, #146c49);
}
.socratic-opt-btn.is-wrong .socratic-opt-badge {
  background: var(--accent, #f47a20);
}
.socratic-opt-text {
  flex: 1;
}
.socratic-response-zone {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border, #cbd5e1);
  animation: socratic-fade-in .25s ease-out;
}
.socratic-bubble {
  border-radius: var(--radius, 10px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.socratic-bubble.is-correct {
  background: var(--success-bg, #f0fdf4);
  border: 1px solid #bbf7d0;
  border-left: 4px solid var(--success, #146c49);
}
.socratic-bubble.is-wrong {
  background: var(--warning-bg, #fffbeb);
  border: 1px solid #fde68a;
  border-left: 4px solid var(--accent, #f47a20);
}
.socratic-bubble-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.socratic-fb-badge {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.socratic-bubble.is-correct .socratic-fb-badge {
  background: var(--success-bg, #dcfce7);
  color: var(--success, #146c49);
}
.socratic-bubble.is-wrong .socratic-fb-badge {
  background: var(--warning-bg, #fef3c7);
  color: var(--warning, #92400e);
}
.socratic-fb-msg {
  font-size: 0.94rem;
  line-height: 1.5;
  color: var(--text, #15233b);
  margin: 0;
}
.socratic-pista-card {
  margin-top: 4px;
  padding: 10px 12px;
  background: var(--surface-2, rgba(255, 255, 255, 0.7));
  border-radius: 6px;
  border: 1px dashed var(--accent, #f47a20);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--warning, #78350f);
}
.socratic-turn-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
.socratic-next-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary, #0A3D91);
  color: #ffffff;
  border: none;
  border-radius: var(--radiusSm, 8px);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .15s ease, transform .15s ease;
}
.socratic-next-btn:hover {
  background: var(--primary-hover, #072c6b);
  transform: translateY(-1px);
}
.socratic-next-btn:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.socratic-final-card {
  background: var(--surface, #ffffff);
  border: 2px solid var(--primary, #0A3D91);
  border-radius: var(--radius, 12px);
  padding: clamp(18px, 3vw, 26px);
  box-shadow: 0 4px 16px rgba(10, 61, 145, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: socratic-fade-in .35s ease-out;
}
.socratic-final-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.socratic-final-head h2 {
  font-family: var(--font-display, system-ui);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
  margin: 0;
}
.socratic-final-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--accent-tint, #fdeee0);
  color: var(--action-hover, #923b00);
}
.socratic-final-text {
  font-size: 1.02rem;
  line-height: 1.6;
  color: var(--text, #15233b);
  margin: 0;
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    turnos = data.get("turnos", [])
    total_turns = len(turnos)

    turnos_html = []
    for t_idx, t in enumerate(turnos, 1):
        num_turno = t.get("turno", t_idx)
        dato_mostrado = esc(t.get("dato_mostrado", ""))
        pregunta = esc(t.get("pregunta", ""))
        pista = esc(t.get("pista", ""))
        opciones = t.get("opciones", [])

        opts_html = []
        for opt_idx, opt in enumerate(opciones):
            letter = chr(65 + opt_idx)
            texto = esc(opt.get("texto", ""))
            feedback = esc(opt.get("feedback", ""))
            correcta_str = "true" if opt.get("correcta") else "false"

            opts_html.append(
                f'<button type="button" class="socratic-opt-btn" '
                f'data-turn="{t_idx}" data-opt="{opt_idx}" data-correct="{correcta_str}" '
                f'data-feedback="{feedback}" data-pista="{pista}" '
                f'aria-label="Opción {letter}: {texto}">'
                f'<span class="socratic-opt-badge" aria-hidden="true">{letter}</span>'
                f'<span class="socratic-opt-text">{texto}</span>'
                f"</button>"
            )

        is_first = t_idx == 1
        is_last = t_idx == total_turns
        next_label = "Ver Revelación Final" if is_last else f"Continuar al Turno {t_idx + 1} →"
        next_val = "final" if is_last else str(t_idx + 1)

        turnos_html.append(
            f'<article class="socratic-turn" id="turn-{t_idx}" data-turn="{t_idx}"{" " if is_first else " hidden "}>'
            f'  <div class="socratic-turn-header">'
            f'    <div class="socratic-mentor-info">'
            f'      <span class="socratic-avatar" aria-hidden="true">{icon("bot")}</span>'
            f"      <div>"
            f'        <p class="socratic-mentor-name">Guía</p>'
            f'        <p class="socratic-mentor-role">Mentor</p>'
            f"      </div>"
            f"    </div>"
            f'    <span class="socratic-turn-badge">Turno {num_turno} de {total_turns}</span>'
            f"  </div>"
            f'  <div class="socratic-evidence-box">'
            f'    <div class="socratic-evidence-top">'
            f'      <span class="socratic-terminal-dots" aria-hidden="true"><span></span><span></span><span></span></span>'
            f'      <span>EVIDENCIA BD #{num_turno}</span>'
            f"    </div>"
            f'    <pre class="socratic-code"><code>{dato_mostrado}</code></pre>'
            f"  </div>"
            f'  <div class="socratic-question-card">'
            f'    <span class="socratic-q-icon" aria-hidden="true">{icon("chat")}</span>'
            f'    <p class="socratic-q-text">{pregunta}</p>'
            f"  </div>"
            f'  <div class="socratic-options-section">'
            f'    <p class="socratic-options-label">Tu hipótesis:</p>'
            f'    <div class="socratic-options-list" role="group" aria-label="Opciones del turno {t_idx}">'
            f'      {"".join(opts_html)}'
            f"    </div>"
            f"  </div>"
            f'  <div class="socratic-response-zone" id="response-{t_idx}" hidden>'
            f'    <div class="socratic-bubble" id="bubble-{t_idx}">'
            f'      <div class="socratic-bubble-head">'
            f'        <span class="socratic-avatar" style="width:24px;height:24px;font-size:0.9rem;" aria-hidden="true">{icon("bot")}</span>'
            f'        <strong>Guía</strong>'
            f'        <span class="socratic-fb-badge" id="fb-badge-{t_idx}"></span>'
            f"      </div>"
            f'      <p class="socratic-fb-msg" id="fb-msg-{t_idx}"></p>'
            f'      <div class="socratic-pista-card" id="pista-{t_idx}" hidden></div>'
            f"    </div>"
            f'    <div class="socratic-turn-actions">'
            f'      <button type="button" class="socratic-next-btn" id="next-btn-{t_idx}" data-next="{next_val}">'
            f"        {next_label}"
            f"      </button>"
            f"    </div>"
            f"  </div>"
            f"</article>"
        )

    return f"""{_STYLE}
<upao-header eyebrow="AGENTE SOCRÁTICO" title="{esc(data.get("titulo", ""))}"><p>{esc(data.get("intro", ""))}</p></upao-header>
<upao-progress id="prog" current="0" total="{total_turns}" label="Progreso de la indagación socrática" show-fraction></upao-progress>

<div class="socratic-stack">
  <div class="socratic-chat" role="log" aria-live="polite" aria-label="Diálogo socrático con Guía">
    {"".join(turnos_html)}
  </div>

  <section class="socratic-final-card" id="socratic-final" hidden aria-labelledby="final-title">
    <div class="socratic-final-head">
      <span class="socratic-final-badge">Revelación Final</span>
      <h2 id="final-title">Síntesis del mentor</h2>
    </div>
    <p class="socratic-final-text">{esc(data.get("revelacion_final", ""))}</p>
  </section>

  <upao-summary title="Consolidación de la Indagación">
    <p>Has completado todos los turnos de diálogo y análisis empírico con Guía, deduciendo la lógica interna del concepto.</p>
    <upao-complete slot="actions" label="Finalizar indagación" locked></upao-complete>
  </upao-summary>
</div>

{script(PROGRESS_JS)}
{script('''
const optionButtons = document.querySelectorAll('.socratic-opt-btn');
const nextButtons = document.querySelectorAll('.socratic-next-btn');

optionButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    const t = btn.getAttribute('data-turn');
    const isCorrect = btn.getAttribute('data-correct') === 'true';
    const feedback = btn.getAttribute('data-feedback') || '';
    const pista = btn.getAttribute('data-pista') || '';

    const turnCard = document.getElementById('turn-' + t);
    if (!turnCard) return;

    // Reset sibling buttons in this turn
    const siblings = turnCard.querySelectorAll('.socratic-opt-btn');
    siblings.forEach(function (s) {
      s.classList.remove('is-correct', 'is-wrong');
      s.setAttribute('aria-pressed', 'false');
    });

    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add(isCorrect ? 'is-correct' : 'is-wrong');

    // Guía response bubble
    const respZone = document.getElementById('response-' + t);
    const bubble = document.getElementById('bubble-' + t);
    const badge = document.getElementById('fb-badge-' + t);
    const msg = document.getElementById('fb-msg-' + t);
    const pistaCard = document.getElementById('pista-' + t);

    if (respZone && bubble && badge && msg && pistaCard) {
      respZone.removeAttribute('hidden');
      bubble.className = 'socratic-bubble ' + (isCorrect ? 'is-correct' : 'is-wrong');
      badge.textContent = isCorrect ? '✓ Deducción acertada' : 'Guía de Guía';
      msg.textContent = feedback;

      if (!isCorrect && pista) {
        pistaCard.removeAttribute('hidden');
        pistaCard.textContent = 'Pista: ' + pista;
      } else {
        pistaCard.setAttribute('hidden', '');
      }

      respZone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Call window.ovaMark('turn-' + t)
    if (typeof window.ovaMark === 'function') {
      window.ovaMark('turn-' + t);
    }

    // If final turn completed, reveal final synthesis card
    const totalTurns = document.querySelectorAll('.socratic-turn').length;
    if (Number(t) === totalTurns) {
      const finalCard = document.getElementById('socratic-final');
      if (finalCard) {
        finalCard.removeAttribute('hidden');
      }
    }
  });
});

nextButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    const target = btn.getAttribute('data-next');
    if (target === 'final') {
      const finalCard = document.getElementById('socratic-final');
      if (finalCard) {
        finalCard.removeAttribute('hidden');
        finalCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const nextTurn = document.getElementById('turn-' + target);
      if (nextTurn) {
        nextTurn.removeAttribute('hidden');
        nextTurn.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_turns", 4)
    base_turns = [
        {
            "turno": 1,
            "dato_mostrado": "SELECT table_name, num_rows, blocks FROM user_tables WHERE table_name = 'TRANSACCIONES'; -- 1,500,000 filas | 42,000 bloques",
            "pregunta": f"Sin una estructura de acceso directo para {concept}, ¿cómo debe buscar el motor cada registro en esta tabla?",
            "pista": "Observa el total de bloques que deben leerse si no se cuenta con un índice o puntero.",
            "opciones": [
                {
                    "texto": "Recorriendo secuencialmente todos los bloques del segmento en disco.",
                    "correcta": True,
                    "feedback": "¡Exacto! El motor realiza un Full Table Scan leyendo los 42,000 bloques.",
                },
                {
                    "texto": "Saltando directamente a la fila mediante memoria caché sin I/O.",
                    "correcta": False,
                    "feedback": "Sin punteros ni índices, la caché no puede adivinar en qué bloque reside la fila.",
                },
            ],
        },
        {
            "turno": 2,
            "dato_mostrado": "SELECT sql_id, disk_reads, buffer_gets, cpu_time FROM v$sql WHERE sql_text LIKE '%TRANSACCIONES%'; -- disk_reads: 38,900",
            "pregunta": "El reporte revela un alto consumo de disco. ¿Por qué las filas de una tabla estándar no están ya ordenadas?",
            "pista": "Recuerda cómo opera el espacio en tablas tipo heap al insertar y borrar filas.",
            "opciones": [
                {
                    "texto": "Las tablas heap insertan en el primer espacio libre sin orden determinista.",
                    "correcta": True,
                    "feedback": "¡Brillante! Sin orden físico, el motor requiere estructuras auxiliares para buscar.",
                },
                {
                    "texto": "El motor de base de datos desordena deliberadamente los datos para ahorrar RAM.",
                    "correcta": False,
                    "feedback": "No es intencional: una heap table simplemente no impone orden de inserción.",
                },
            ],
        },
        {
            "turno": 3,
            "dato_mostrado": "CREATE INDEX idx_txn_fecha ON TRANSACCIONES(fecha_pago); -- Jerarquía: Bloque Raíz -> Nodos Rama -> Hojas con ROWIDs",
            "pregunta": f"Al estructurar {concept}, ¿qué información mínima almacena cada nodo hoja?",
            "pista": "Piensa en el valor buscado y la dirección física donde reside la fila completa.",
            "opciones": [
                {
                    "texto": "El valor de la clave indexada junto con el ROWID físico del bloque de datos.",
                    "correcta": True,
                    "feedback": "¡Muy bien! El ROWID actúa como coordenada exacta para recuperar la fila en 1 I/O.",
                },
                {
                    "texto": "Una copia íntegra de todas las columnas y metadatos de la tabla.",
                    "correcta": False,
                    "feedback": "El índice solo guarda la clave y el ROWID, evitando redundancia innecesaria.",
                },
            ],
        },
        {
            "turno": 4,
            "dato_mostrado": "EXPLAIN PLAN FOR SELECT * FROM TRANSACCIONES WHERE fecha_pago = TRUNC(SYSDATE); -- INDEX RANGE SCAN | Coste: 4 | Buffers: 5",
            "pregunta": "¿Por qué el coste se redujo de miles de bloques a tan solo 4 lecturas de buffer?",
            "pista": "Fíjate en la altura del árbol y cuántos pasos requiere descender de la raíz a la hoja.",
            "opciones": [
                {
                    "texto": "Porque la búsqueda balanceada localiza la clave en O(log N) saltos directos.",
                    "correcta": True,
                    "feedback": "¡Deducción impecable! La altura reducida permite descender a la clave en pocos saltos.",
                },
                {
                    "texto": "Porque el optimizador desactivó las comprobaciones de consistencia.",
                    "correcta": False,
                    "feedback": "La consistencia se mantiene siempre; el beneficio proviene del recorrido en árbol.",
                },
            ],
        },
        {
            "turno": 5,
            "dato_mostrado": f"INSERT INTO TRANSACCIONES VALUES (...); -- Mantenimiento: división de bloque hoja (90-10 leaf split) en {concept}",
            "pregunta": f"Las consultas son veloces, pero ¿qué trade-off introduce {concept} durante las inserciones masivas?",
            "pista": "Considera qué ocurre con la estructura del árbol cuando un bloque hoja se llena.",
            "opciones": [
                {
                    "texto": "Cada escritura debe mantener ordenadas las hojas, sumando costo de I/O.",
                    "correcta": True,
                    "feedback": "¡Gran observación! Todo índice acelera lecturas a expensas de costo en escrituras.",
                },
                {
                    "texto": "Las inserciones masivas bloquean permanentemente la lectura de toda la tabla.",
                    "correcta": False,
                    "feedback": "No hay bloqueo permanente; el costo es la sobrecarga de actualizar el índice.",
                },
            ],
        },
        {
            "turno": 6,
            "dato_mostrado": "SELECT blevel, leaf_blocks, clustering_factor FROM user_indexes WHERE index_name = 'IDX_TXN_FECHA'; -- CF cercano a blocks",
            "pregunta": f"Al analizar el clustering factor de {concept}, ¿qué nos indica que su valor esté alineado con los bloques?",
            "pista": "Relaciona el orden de las entradas del índice con la disposición física en disco.",
            "opciones": [
                {
                    "texto": "Las filas contiguas en el índice están contiguas en disco, optimizando lecturas.",
                    "correcta": True,
                    "feedback": "¡Extraordinario! Menor fragmentación física implica un rendimiento óptimo de I/O.",
                },
                {
                    "texto": "Indica que el índice tiene claves duplicadas y requiere reconstrucción.",
                    "correcta": False,
                    "feedback": "Un clustering factor favorable refleja orden físico armónico, no corrupción.",
                },
            ],
        },
    ]

    selected_turns = [dict(t) for t in base_turns[:n]]
    for idx, t in enumerate(selected_turns, 1):
        t["turno"] = idx

    return {
        "titulo": f"Indagación de {concept} con Guía"[:70],
        "intro": f"Hola, soy Guía. Revisaremos trazas del motor para deducir los principios de {concept}."[:160],
        "turnos": selected_turns,
        "revelacion_final": (
            f"¡Excelente trabajo deductivo! Has comprendido que «{concept}» organiza los datos para transformar "
            f"escaneos secuenciales costosos en búsquedas logarítmicas de bajo I/O, equilibrando la velocidad de lectura "
            f"con el coste de escritura en el motor de base de datos."
        )[:300],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=2,
    title="Agente Socrático",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
