"""ENGAGE 4 — Juego de Gamificación: minijuego cronometrado de rondas secuenciales.

Desafío interactivo por rondas con cronómetro, puntuación acumulativa y retroalimentación
inmediata para despertar la intuición técnica sobre el concepto central.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s

PARAMS = (Param("num_rounds", 3, min=3, max=5, help="Número de rondas del minijuego"),)


def schema(p: dict) -> dict:
    n = p["num_rounds"]
    return obj(
        titulo=s(70),
        gancho=s(160),
        rondas=arr(
            obj(
                ronda=i(),
                enunciado=s(200),
                items=arr(s(80), 3, 5),
                respuesta_correcta=s(80),
                feedback_correcto=s(140),
                feedback_incorrecto=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(200),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_rounds"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador de minijuegos educativos cronometrados para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un minijuego de {n} rondas secuenciales con cronómetro que despierte curiosidad inmediata y haga sentir la intuición técnica de «{concept}» a través de situaciones concretas cotidianas o de causa y efecto.
- titulo: título dinámico del minijuego (≤10 palabras).
- gancho: reto inicial breve que invite a superar el desafío (≤25 palabras).
- rondas: exactamente {n} rondas secuenciales con dificultad creciente (1 a {n}). Para cada ronda:
  * ronda: número correlativo de la ronda (1 a {n}).
  * enunciado: dilema o situación concreta donde el estudiante debe detectar la causa o elegir la mejor opción (≤30 palabras).
  * items: lista de 3 a 5 opciones breves y verosímiles (≤12 palabras cada una).
  * respuesta_correcta: texto exacto de la opción correcta, idéntico a uno de los elementos de `items`.
  * feedback_correcto: explicación concisa de por qué esa opción es la adecuada (≤20 palabras).
  * feedback_incorrecto: explicación constructiva que aclare el error sin desanimar (≤20 palabras).
- cierre: reflexión final que conecte lo experimentado en el juego con la relevancia práctica de «{concept}» (≤30 palabras).
[RESTRICCIONES] Sin jerga técnica pesada ni fórmulas en los enunciados. Analogías intuitivas y claras. Respuestas deducibles mediante lógica cotidiana y sentido común.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador de minijuegos educativos cronometrados para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un minijuego de {n} rondas secuenciales con cronómetro que despierte curiosidad inmediata y haga sentir la intuición técnica de «{concept}» a través de situaciones concretas cotidianas o de causa y efecto.
- titulo: título dinámico del minijuego (≤10 palabras).
- gancho: reto inicial breve que invite a superar el desafío (≤25 palabras).
- rondas: exactamente {n} rondas secuenciales con dificultad creciente (1 a {n}). Para cada ronda:
  * ronda: número correlativo de la ronda (1 a {n}).
  * enunciado: dilema o situación concreta donde el estudiante debe detectar la causa o elegir la mejor opción (≤30 palabras).
  * items: lista de 3 a 5 opciones breves y verosímiles (≤12 palabras cada una).
  * respuesta_correcta: texto exacto de la opción correcta, idéntico a uno de los elementos de `items`.
  * feedback_correcto: explicación concisa de por qué esa opción es la adecuada (≤20 palabras).
  * feedback_incorrecto: explicación constructiva que aclare el error sin desanimar (≤20 palabras).
- cierre: reflexión final que conecte lo experimentado en el juego con la relevancia práctica de «{concept}» (≤30 palabras).
[RESTRICCIONES] Sin jerga técnica pesada ni fórmulas en los enunciados. Analogías intuitivas y claras. Respuestas deducibles mediante lógica cotidiana y sentido común.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-hud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-tint, #f0f4ff);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 12px);
  margin-bottom: 20px;
}
.ova-round-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 12px);
  padding: 20px;
  transition: transform .2s ease, opacity .2s ease;
}
.ova-round-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.ova-round-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
}
.ova-round-points {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--success, #146c49);
  background: #f0fdf4;
  padding: 3px 8px;
  border-radius: 6px;
}
.ova-round-enunciado {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text, #1e293b);
  margin: 0 0 16px 0;
}
.ova-options-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}
.ova-opt-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1.5px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  background: var(--surface, #ffffff);
  color: var(--text, #1e293b);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease, transform .1s ease;
}
.ova-opt-btn:hover:not(:disabled) {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #f0f4ff);
  transform: translateY(-1px);
}
.ova-opt-btn:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-opt-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.ova-opt-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.ova-opt-btn.is-correct {
  border-color: var(--success, #146c49);
  background: #f0fdf4;
  color: #14532d;
  font-weight: 600;
  opacity: 1;
}
.ova-opt-btn.is-correct .ova-opt-badge {
  background: var(--success, #146c49);
  color: #ffffff;
}
.ova-opt-btn.is-wrong {
  border-color: var(--danger, #b91c1c);
  background: #fef2f2;
  color: #7f1d1d;
}
.ova-opt-btn.is-wrong .ova-opt-badge {
  background: var(--danger, #b91c1c);
  color: #ffffff;
}
.ova-feedback {
  padding: 12px 16px;
  border-radius: var(--radius, 8px);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-top: 10px;
}
.ova-feedback.is-correct {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #14532d;
}
.ova-feedback.is-wrong {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #7f1d1d;
}
.ova-feedback.is-warn {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}
.ova-round-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.ova-btn-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 22px;
  border: none;
  border-radius: var(--radius, 8px);
  background: var(--primary, #0A3D91);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s ease, transform .1s ease;
}
.ova-btn-next:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.ova-btn-next:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-summary-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 12px);
  padding: 24px;
}
.ova-summary-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
}
.ova-btn-restart {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  background: transparent;
  color: var(--text-muted, #64748b);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}
.ova-btn-restart:hover {
  background: var(--surface-tint, #f0f4ff);
  color: var(--primary, #0A3D91);
}
.ova-btn-restart:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
</style>
"""

_GAME_JS = """
(function () {
  const rounds = document.querySelectorAll('.ova-round-card');
  const totalRounds = rounds.length;
  let currentRound = 1;
  const completedRounds = new Set();
  const timer = document.getElementById('timer');
  const score = document.getElementById('score');
  const gameSummary = document.getElementById('game-summary');
  let autoAdvanceTimeout = null;

  function showFeedback(roundNum, isCorrect, text) {
    const fb = document.getElementById('feedback-' + roundNum);
    if (!fb) return;
    fb.hidden = false;
    fb.className = 'ova-feedback ' + (isCorrect ? 'is-correct' : 'is-wrong');
    fb.textContent = (isCorrect ? '✓ ' : '✗ ') + text;
  }

  function advanceTo(nextRound) {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
    const curEl = document.getElementById('round-' + currentRound);
    if (curEl) curEl.hidden = true;

    if (nextRound <= totalRounds) {
      currentRound = nextRound;
      const nextEl = document.getElementById('round-' + nextRound);
      if (nextEl) {
        nextEl.hidden = false;
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (timer) {
        if (timer.reset) timer.reset();
        if (timer.start) timer.start();
      }
    } else {
      if (timer && timer.stop) timer.stop();
      if (gameSummary) {
        gameSummary.hidden = false;
        gameSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      document.querySelectorAll('upao-complete[locked]').forEach(function (b) {
        if (b.unlock) b.unlock();
      });
    }
  }

  document.querySelectorAll('.ova-opt-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const r = parseInt(btn.getAttribute('data-round'), 10);
      if (completedRounds.has(r)) return;

      const isCorrect = btn.getAttribute('data-correct') === 'true';
      if (isCorrect) {
        completedRounds.add(r);
        btn.classList.add('is-correct');

        const roundCard = document.getElementById('round-' + r);
        if (roundCard) {
          roundCard.querySelectorAll('.ova-opt-btn').forEach(function (b) {
            b.disabled = true;
          });
        }

        const fbText = btn.getAttribute('data-fb-ok') || '¡Respuesta correcta!';
        showFeedback(r, true, fbText);

        if (score && score.add) {
          score.add(100);
        }

        if (typeof window.ovaMark === 'function') {
          window.ovaMark('round-' + r);
        }

        if (timer && timer.stop) timer.stop();

        const actions = document.getElementById('actions-' + r);
        if (actions) {
          actions.hidden = false;
          const nextBtn = actions.querySelector('.ova-btn-next');
          if (nextBtn) nextBtn.focus();
        }

        autoAdvanceTimeout = setTimeout(function () {
          advanceTo(r + 1);
        }, 1800);
      } else {
        btn.classList.add('is-wrong');
        btn.disabled = true;
        const fbText = btn.getAttribute('data-fb-err') || 'Opción incorrecta. Intenta otra alternativa.';
        showFeedback(r, false, fbText);
      }
    });
  });

  document.querySelectorAll('.ova-btn-next').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const nextR = parseInt(btn.getAttribute('data-next'), 10);
      advanceTo(nextR);
    });
  });

  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      window.location.reload();
    });
  }

  if (timer) {
    timer.addEventListener('upao-timer-end', function () {
      if (!completedRounds.has(currentRound)) {
        const fb = document.getElementById('feedback-' + currentRound);
        if (fb) {
          fb.hidden = false;
          fb.className = 'ova-feedback is-warn';
          fb.textContent = '⏱ ¡Tiempo cumplido! Selecciona una opción para completar la ronda.';
        }
      }
    });
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    rondas = data.get("rondas", [])
    total_rounds = len(rondas)

    round_sections = []
    for r_idx, r in enumerate(rondas, 1):
        items = r.get("items", [])
        corr_target = str(r.get("respuesta_correcta", "")).strip().lower()

        options_html = []
        for opt_idx, opt in enumerate(items):
            letter = chr(65 + opt_idx)
            is_corr = str(opt).strip().lower() == corr_target
            options_html.append(
                f'<button type="button" class="ova-opt-btn" '
                f'data-round="{r_idx}" '
                f'data-correct="{str(is_corr).lower()}" '
                f'data-fb-ok="{esc(r.get("feedback_correcto", ""))}" '
                f'data-fb-err="{esc(r.get("feedback_incorrecto", ""))}" '
                f'aria-label="Opción {letter}: {esc(opt)}">'
                f'<span class="ova-opt-badge" aria-hidden="true">{letter}</span>'
                f'<span class="ova-opt-text">{esc(opt)}</span>'
                f"</button>"
            )

        next_label = "Siguiente ronda →" if r_idx < total_rounds else "Ver resultado final →"
        hidden_attr = "" if r_idx == 1 else " hidden"

        round_sections.append(
            f'<section class="ova-card ova-stack ova-round-card" id="round-{r_idx}" data-round="{r_idx}"{hidden_attr}>'
            f'<div class="ova-round-header">'
            f'<span class="ova-round-badge">Ronda {r_idx} de {total_rounds}</span>'
            f'<span class="ova-round-points">+100 pts</span>'
            f"</div>"
            f'<h2 class="ova-round-enunciado">{esc(r.get("enunciado", ""))}</h2>'
            f'<div class="ova-options-grid" role="group" aria-label="Opciones de la ronda {r_idx}">'
            f"{''.join(options_html)}"
            f"</div>"
            f'<div class="ova-feedback" id="feedback-{r_idx}" role="status" aria-live="polite" hidden></div>'
            f'<div class="ova-round-actions" id="actions-{r_idx}" hidden>'
            f'<button type="button" class="ova-btn-next" data-next="{r_idx + 1}">{next_label}</button>'
            f"</div>"
            f"</section>"
        )

    return f"""{_STYLE}
<upao-header eyebrow="JUEGO DE GAMIFICACIÓN" title="{esc(data["titulo"])}"><p>{esc(data["gancho"])}</p></upao-header>
<div class="ova-hud" role="region" aria-label="Indicadores del juego">
  <upao-progress id="prog" current="0" total="{total_rounds}" label="Progreso" show-fraction></upao-progress>
  <upao-timer id="timer" seconds="30" label="Tiempo restante" autostart></upao-timer>
  <upao-score id="score" current="0" max="{total_rounds * 100}" label="Puntuación"></upao-score>
</div>
<div class="ova-stack" id="rounds-container">
  {"".join(round_sections)}
</div>
<section class="ova-card ova-stack ova-summary-card" id="game-summary" hidden>
  <h2>¡Desafío completado!</h2>
  <upao-summary>
    {esc(data["cierre"])}
    <upao-complete slot="actions" label="Finalizar reto" locked></upao-complete>
  </upao-summary>
  <div class="ova-summary-footer">
    <button type="button" class="ova-btn-restart" id="btn-restart">Volver a jugar</button>
  </div>
</section>
{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script(_GAME_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_rounds"]
    base_rounds = [
        {
            "ronda": 1,
            "enunciado": f"Un almacén colapsa porque buscan cada paquete sin orden. ¿Qué cambio soluciona esto según la lógica de {concept}?",
            "items": [
                "Crear un catálogo ordenado de ubicaciones",
                "Contratar más mensajeros sin organización",
                "Guardar todos los paquetes en una sola caja grande",
            ],
            "respuesta_correcta": "Crear un catálogo ordenado de ubicaciones",
            "feedback_correcto": "¡Excelente intuición! Un índice o acceso ordenado reduce drásticamente el tiempo de búsqueda.",
            "feedback_incorrecto": "Añadir más personal desorganizado o amontonar todo empeora el cuello de botella.",
        },
        {
            "ronda": 2,
            "enunciado": f"Dos personas intentan modificar la misma ficha al mismo tiempo. ¿Qué principio de {concept} evita que se pisen?",
            "items": [
                "Control de turnos y bloqueo temporal",
                "Permitir que la última grabación borre la anterior",
                "Apagar el sistema para evitar conflictos",
            ],
            "respuesta_correcta": "Control de turnos y bloqueo temporal",
            "feedback_correcto": "¡Correcto! Los bloqueos y turnos de concurrencia protegen la integridad de los datos.",
            "feedback_incorrecto": "Sobreescribir sin control pierde información y apagar el sistema detiene el servicio.",
        },
        {
            "ronda": 3,
            "enunciado": f"Ocurre un corte eléctrico repentino mientras se registra una venta. ¿Cómo actúa {concept} para salvar los datos?",
            "items": [
                "Registra los pasos en bitácora antes de confirmar",
                "Borra todo el registro por precaución",
                "Ignora los datos que quedaron a medias",
            ],
            "respuesta_correcta": "Registra los pasos en bitácora antes de confirmar",
            "feedback_correcto": "¡Exacto! La bitácora previa permite reconstruir el estado exacto o revertir operaciones incompletas.",
            "feedback_incorrecto": "Descartar información o borrar registros arruina la confiabilidad del sistema.",
        },
        {
            "ronda": 4,
            "enunciado": f"El volumen de consultas se multiplica por diez en un minuto. ¿Qué estrategia inspirada en {concept} mantiene la velocidad?",
            "items": [
                "Guardar resultados frecuentes en memoria rápida",
                "Obligar a todos los usuarios a esperar su turno",
                "Devolver errores aleatorios para bajar la carga",
            ],
            "respuesta_correcta": "Guardar resultados frecuentes en memoria rápida",
            "feedback_correcto": "¡Muy bien! Mantener datos calientes en memoria caché evita accesos repetidos y costosos a disco.",
            "feedback_incorrecto": "Hacer esperar a todos o enviar errores degrada severamente la experiencia.",
        },
        {
            "ronda": 5,
            "enunciado": f"Para garantizar que ningún registro quede incompleto o corrupto, ¿cómo interviene {concept} de raíz?",
            "items": [
                "Aplica reglas de validación automáticas en la base",
                "Confía en que los usuarios nunca cometerán errores",
                "Revisa manualmente los registros al final de cada mes",
            ],
            "respuesta_correcta": "Aplica reglas de validación automáticas en la base",
            "feedback_correcto": "¡Impecable! Las restricciones automáticas garantizan consistencia sin depender de revisiones manuales.",
            "feedback_incorrecto": "La fe ciega o las revisiones mensuales tardías no evitan que los datos se corrompan.",
        },
    ]

    rondas = []
    for k in range(1, n + 1):
        idx = (k - 1) % len(base_rounds)
        r = dict(base_rounds[idx])
        r["ronda"] = k
        rondas.append(r)

    return {
        "titulo": f"Desafío Rápido: {concept}"[:70],
        "gancho": f"Supera las {n} rondas contrarreloj para poner a prueba tu intuición sobre {concept}."[
            :160
        ],
        "rondas": rondas,
        "cierre": f"Has completado el reto y comprendido la lógica esencial de {concept}. ¡Listo para profundizar!"[
            :200
        ],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=4,
    title="Juego de Gamificación",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
