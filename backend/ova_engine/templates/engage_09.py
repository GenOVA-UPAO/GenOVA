"""ENGAGE 9 — Escape Room Virtual: acertijos lógicos encadenados y candados.

El estudiante resuelve una secuencia de acertijos cuya intuición cotidiana
refleja el funcionamiento del concepto sin jerga técnica. Cada solución abre
un candado y desbloquea el siguiente paso hasta abrir la puerta final.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param(
        "num_puzzles",
        3,
        min=3,
        max=4,
        help="Número de acertijos lógicos encadenados",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_puzzles"]
    return obj(
        titulo=s(70),
        mision=s(200),
        acertijos=arr(
            obj(
                numero=i(),
                escenario=s(350),
                opcion_A=s(120),
                opcion_B=s(120),
                respuesta_correcta=s(10),
                explicacion_conexion=s(200),
            ),
            min_items=n,
            max_items=n,
        ),
        epilogo=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_puzzles"]
    return f"""[ROL] Diseñador de escape rooms educativas digitales para universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña un Escape Room Virtual con {n} acertijos lógicos encadenados cuya intuición y mecánica reflejen fielmente el concepto sin jerga técnica.
- titulo: título temático e intrigante del escape room (≤10 palabras).
- mision: premisa narrativa de la misión de escape y desafío inicial (≤30 palabras).
- acertijos: exactamente {n} acertijos lógicos secuenciales donde descifrar cada uno abre un candado hacia la salida. Por cada acertijo:
  * `numero`: índice del acertijo (1 a {n}).
  * `escenario`: situación lógica o dilema cotidiano concreto (≤55 palabras).
  * `opcion_A`: primera opción de respuesta (≤18 palabras).
  * `opcion_B`: segunda opción de respuesta (≤18 palabras).
  * `respuesta_correcta`: 'A' o 'B'.
  * `explicacion_conexion`: breve explicación (≤30 palabras) que revela el paralelismo directo entre la lógica del acertijo y cómo funciona «{concept}».
- epilogo: desenlace narrativo triunfal al abrir la compuerta final, resumiendo el valor del concepto (≤40 palabras).
[RESTRICCIONES] Respuestas deducibles por pura lógica e intuición cotidiana. Tono inmersivo de intriga y urgencia narrativa. Sin jerga técnica pesada ni fórmulas en los escenarios de los acertijos.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-escape-room {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ova-lock-dashboard {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 16px 20px;
}
.ova-dashboard-title {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  color: var(--primary, #0A3D91);
}
.ova-dashboard-desc {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: var(--text-muted, #64748b);
}
.ova-lock-track {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.ova-lock-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface, #ffffff);
  border: 1.5px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  cursor: pointer;
  font: inherit;
  color: var(--text, #1e293b);
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.ova-lock-chip:hover {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #f0f7ff);
}
.ova-lock-chip.is-current {
  border-color: var(--primary, #0A3D91);
  box-shadow: 0 0 0 2px var(--surface-tint, #dbeafe);
  font-weight: 600;
}
.ova-lock-chip.is-unlocked {
  border-color: var(--success, #146C49);
  background: var(--surface-tint, #f0fdf4);
}
.ova-lock-chip .svg-unlocked {
  display: none;
}
.ova-lock-chip .svg-locked {
  display: inline-block;
  color: var(--text-muted, #64748b);
}
.ova-lock-chip.is-unlocked .svg-locked {
  display: none;
}
.ova-lock-chip.is-unlocked .svg-unlocked {
  display: inline-block;
  color: var(--success, #146C49);
}
.ova-lock-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.ova-lock-name {
  font-size: 0.8rem;
  font-weight: 600;
}
.ova-lock-state {
  font-size: 0.7rem;
  color: var(--text-muted, #64748b);
}
.ova-lock-chip.is-unlocked .ova-lock-state {
  color: var(--success, #146C49);
  font-weight: 600;
}
.ova-track-arrow {
  color: var(--text-muted, #94a3b8);
  font-size: 1rem;
  user-select: none;
}
.ova-door-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface, #ffffff);
  border: 1.5px dashed var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  color: var(--text-muted, #64748b);
  transition: all .2s ease;
}
.ova-door-chip.is-unlocked {
  border: 1.5px solid var(--success, #146C49);
  background: var(--surface-tint, #f0fdf4);
  color: var(--success, #146C49);
}
.ova-door-chip .svg-door-unlocked {
  display: none;
}
.ova-door-chip .svg-door-locked {
  display: inline-block;
}
.ova-door-chip.is-unlocked .svg-door-locked {
  display: none;
}
.ova-door-chip.is-unlocked .svg-door-unlocked {
  display: inline-block;
  color: var(--success, #146C49);
}
.ova-door-chip.is-unlocked .ova-lock-state {
  color: var(--success, #146C49);
  font-weight: 600;
}

.ova-puzzle-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 20px;
}
.ova-puzzle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.ova-puzzle-pill {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #e0f2fe);
  color: var(--primary, #0A3D91);
}
.ova-puzzle-title {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text, #1e293b);
}
.ova-puzzle-scenario-box {
  background: var(--surface-tint, #f8fafc);
  border-left: 4px solid var(--primary, #0A3D91);
  padding: 14px 16px;
  border-radius: 0 var(--radius, 8px) var(--radius, 8px) 0;
  margin-bottom: 18px;
}
.ova-puzzle-scenario {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
}
.ova-puzzle-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
.ova-option-btn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: var(--surface, #ffffff);
  border: 2px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 8px);
  cursor: pointer;
  font: inherit;
  color: var(--text, #1e293b);
  transition: border-color .2s ease, background .2s ease;
}
.ova-option-btn:hover:not(:disabled) {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #f0f7ff);
}
.ova-option-btn:focus-visible {
  outline: none;
  border-color: var(--primary, #0A3D91);
  box-shadow: 0 0 0 3px var(--surface-tint, #dbeafe);
}
.ova-option-btn.is-correct {
  border-color: var(--success, #146C49);
  background: var(--surface-tint, #f0fdf4);
}
.ova-option-btn.is-incorrect {
  border-color: var(--error, #dc2626);
  background: #fef2f2;
}
.ova-option-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--surface-tint, #e0f2fe);
  color: var(--primary, #0A3D91);
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.ova-option-btn.is-correct .ova-option-key {
  background: var(--success, #146C49);
  color: #ffffff;
}
.ova-option-btn.is-incorrect .ova-option-key {
  background: var(--error, #dc2626);
  color: #ffffff;
}
.ova-option-text {
  font-size: 0.925rem;
  line-height: 1.5;
  padding-top: 2px;
}
.ova-puzzle-explanation {
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--surface-tint, #f0fdf4);
  border: 1px solid var(--border, #bbf7d0);
  border-left: 4px solid var(--success, #146C49);
  border-radius: var(--radius, 8px);
}
.ova-explanation-title {
  margin: 0 0 6px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--success, #146C49);
}
.ova-explanation-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}
.ova-puzzle-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.ova-door-banner {
  background: var(--surface-tint, #f0fdf4);
  border: 1.5px solid var(--success, #146C49);
  border-radius: var(--radius, 12px);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}
.ova-door-banner-icon {
  font-size: 2.2rem;
  flex-shrink: 0;
}
.ova-door-banner-title {
  margin: 0 0 6px 0;
  color: var(--success, #146C49);
  font-size: 1.15rem;
}
.ova-door-banner-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>
"""

_ESCAPE_JS = """
(function () {
  const nav = document.getElementById('nav');
  const steps = document.querySelectorAll('.ova-puzzle-card.step');
  const lockChips = document.querySelectorAll('.ova-lock-chip');
  const doorChip = document.getElementById('door-chip');
  const doorState = document.getElementById('door-state');
  const doorBanner = document.getElementById('door-banner');
  const globalStatus = document.getElementById('escape-global-status');
  const totalPuzzles = steps.length;
  const solvedPuzzles = new Set();

  function updateStepVisibility(stepIndex) {
    if (stepIndex < 1 || stepIndex > totalPuzzles) return;
    steps.forEach(function (el, i) {
      el.hidden = (i !== stepIndex - 1);
    });
    lockChips.forEach(function (chip, i) {
      chip.classList.toggle('is-current', (i === stepIndex - 1));
    });
    if (nav && nav.getAttribute('current') !== String(stepIndex)) {
      nav.setAttribute('current', String(stepIndex));
    }
  }

  if (nav) {
    nav.addEventListener('upao-nav-change', function (e) {
      const idx = (e.detail && e.detail.index) ? e.detail.index : 1;
      updateStepVisibility(idx);
    });
  }

  lockChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const p = parseInt(chip.getAttribute('data-puzzle'), 10);
      if (p >= 1 && p <= totalPuzzles) {
        updateStepVisibility(p);
      }
    });
  });

  document.querySelectorAll('.btn-next-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      if (target >= 1 && target <= totalPuzzles) {
        updateStepVisibility(target);
      }
    });
  });

  document.querySelectorAll('.btn-prev-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      if (target >= 1 && target <= totalPuzzles) {
        updateStepVisibility(target);
      }
    });
  });

  document.querySelectorAll('.btn-choice').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const pIndex = parseInt(btn.getAttribute('data-puzzle'), 10);
      const isCorrect = btn.getAttribute('data-correct') === 'true';
      const statusEl = document.getElementById('status-' + pIndex);
      const explEl = document.getElementById('explanation-' + pIndex);
      const lockChip = document.getElementById('lock-chip-' + pIndex);
      const lockState = document.getElementById('lock-state-' + pIndex);
      const parentCard = document.getElementById('puzzle-step-' + pIndex);
      const siblingButtons = parentCard ? parentCard.querySelectorAll('.btn-choice') : [];

      if (isCorrect) {
        siblingButtons.forEach(function (b) {
          b.disabled = true;
          b.classList.remove('is-incorrect');
        });
        btn.classList.add('is-correct');
        if (statusEl) {
          statusEl.setAttribute('state', 'success');
          statusEl.textContent = '¡Correcto! Combinación descifrada.';
        }
        if (explEl) {
          explEl.hidden = false;
        }
        if (lockChip) {
          lockChip.classList.add('is-unlocked');
          lockChip.setAttribute('aria-label', 'Ir al candado ' + pIndex + ': Abierto');
        }
        if (lockState) {
          lockState.textContent = 'Abierto ✓';
        }

        if (window.ovaMark) {
          window.ovaMark('puzzle-' + pIndex);
        }
        solvedPuzzles.add(pIndex);

        if (solvedPuzzles.size >= totalPuzzles) {
          if (doorChip) {
            doorChip.classList.add('is-unlocked');
            doorChip.setAttribute('aria-label', 'Puerta de escape: Abierta');
          }
          if (doorState) {
            doorState.textContent = 'Abierta 🔓';
          }
          if (doorBanner) {
            doorBanner.hidden = false;
          }
          if (globalStatus) {
            globalStatus.setAttribute('state', 'success');
            globalStatus.textContent = '¡Enhorabuena! Todos los candados han sido superados y la compuerta final se ha abierto.';
          }
        } else {
          if (globalStatus) {
            globalStatus.setAttribute('state', 'info');
            globalStatus.textContent = 'Candado ' + pIndex + ' abierto. Te quedan ' + (totalPuzzles - solvedPuzzles.size) + ' por resolver.';
          }
        }
      } else {
        btn.classList.add('is-incorrect');
        if (statusEl) {
          statusEl.setAttribute('state', 'error');
          statusEl.textContent = 'Opción incorrecta. El mecanismo se resiste. Analiza la lógica y prueba la otra alternativa.';
        }
      }
    });
  });

  updateStepVisibility(1);
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    acertijos = data.get("acertijos", [])
    total_puzzles = len(acertijos)

    candados_items = []
    for idx in range(1, total_puzzles + 1):
        candados_items.append(
            f'<button type="button" class="ova-lock-chip{" is-current" if idx == 1 else ""}" '
            f'id="lock-chip-{idx}" data-puzzle="{idx}" aria-label="Ir al candado {idx}: Bloqueado">'
            f'<span class="ova-lock-icon">'
            f'<svg class="svg-locked" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
            f'<svg class="svg-unlocked" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>'
            f'</span>'
            f'<span class="ova-lock-info">'
            f'<span class="ova-lock-name">Candado {idx}</span>'
            f'<span class="ova-lock-state" id="lock-state-{idx}">Bloqueado</span>'
            f'</span>'
            f'</button>'
        )
        candados_items.append('<span class="ova-track-arrow" aria-hidden="true">→</span>')

    candados_items.append(
        '<div class="ova-door-chip" id="door-chip" aria-label="Puerta de escape: Bloqueada">'
        '<span class="ova-door-icon">'
        '<svg class="svg-door-locked" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17"></path><path d="M16 12h.01"></path></svg>'
        '<svg class="svg-door-unlocked" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17"></path><path d="M4 4l10 3v14L4 18V4z" fill="currentColor" opacity="0.2"></path><path d="M11 12h.01"></path></svg>'
        '</span>'
        '<span class="ova-lock-info">'
        '<span class="ova-lock-name">Puerta Final</span>'
        '<span class="ova-lock-state" id="door-state">Bloqueada</span>'
        '</span>'
        '</div>'
    )
    track_html = "".join(candados_items)

    steps_items = []
    for idx, p in enumerate(acertijos, 1):
        escenario = esc(p.get("escenario", ""))
        opcion_a = esc(p.get("opcion_A", ""))
        opcion_b = esc(p.get("opcion_B", ""))
        explicacion = esc(p.get("explicacion_conexion", ""))
        resp = str(p.get("respuesta_correcta", "")).strip().upper()
        is_a_correct = resp.startswith("A") or ("A" in resp and "B" not in resp)
        is_b_correct = not is_a_correct

        prev_btn = (
            f'<button type="button" class="ova-btn ova-btn--ghost btn-prev-step" data-target="{idx - 1}">'
            f'← Acertijo anterior'
            f'</button>'
            if idx > 1
            else ''
        )
        next_btn = (
            f'<button type="button" class="ova-btn btn-next-step" data-target="{idx + 1}" id="btn-next-{idx}">'
            f'Siguiente acertijo →'
            f'</button>'
            if idx < total_puzzles
            else ''
        )

        steps_items.append(
            f'<article class="ova-puzzle-card step" id="puzzle-step-{idx}" data-puzzle="{idx}"{"" if idx == 1 else " hidden"}>'
            f'<div class="ova-puzzle-header">'
            f'<span class="ova-puzzle-pill">Acertijo {idx} de {total_puzzles}</span>'
            f'<h3 class="ova-puzzle-title">Candado #{idx}</h3>'
            f'</div>'
            f'<div class="ova-puzzle-scenario-box">'
            f'<p class="ova-puzzle-scenario">{escenario}</p>'
            f'</div>'
            f'<div class="ova-puzzle-options" role="group" aria-label="Opciones para abrir el candado {idx}">'
            f'<button type="button" class="ova-option-btn btn-choice" data-puzzle="{idx}" data-choice="A" data-correct="{str(is_a_correct).lower()}" aria-label="Opción A: {opcion_a}">'
            f'<span class="ova-option-key">A</span>'
            f'<span class="ova-option-text">{opcion_a}</span>'
            f'</button>'
            f'<button type="button" class="ova-option-btn btn-choice" data-puzzle="{idx}" data-choice="B" data-correct="{str(is_b_correct).lower()}" aria-label="Opción B: {opcion_b}">'
            f'<span class="ova-option-key">B</span>'
            f'<span class="ova-option-text">{opcion_b}</span>'
            f'</button>'
            f'</div>'
            f'<div class="ova-puzzle-feedback">'
            f'<upao-status id="status-{idx}" state="info">Selecciona tu respuesta para comprobar la combinación.</upao-status>'
            f'</div>'
            f'<div class="ova-puzzle-explanation" id="explanation-{idx}" hidden>'
            f'<h4 class="ova-explanation-title">🔓 Mecanismo descifrado:</h4>'
            f'<p class="ova-explanation-text">{explicacion}</p>'
            f'</div>'
            f'<div class="ova-puzzle-nav">'
            f'{prev_btn}'
            f'{next_btn}'
            f'</div>'
            f'</article>'
        )

    return f"""{_STYLE}
<upao-header eyebrow="ESCAPE ROOM VIRTUAL" title="{esc(data["titulo"])}">
  <p>{esc(data["mision"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total_puzzles}" label="Candados superados" show-fraction></upao-progress>

<section class="ova-card ova-lock-dashboard">
  <h2 class="ova-dashboard-title">🔐 Mecanismo de Seguridad: Candados de Acceso</h2>
  <p class="ova-dashboard-desc">Descifra la lógica de cada acertijo para abrir los candados y desbloquear la compuerta de escape.</p>
  <div class="ova-lock-track" role="region" aria-label="Estado de los candados">
    {track_html}
  </div>
  <upao-status id="escape-global-status" state="info">Misión iniciada. Resuelve el primer acertijo para desactivar el candado 1.</upao-status>
</section>

<div class="ova-puzzles-container" aria-live="polite">
  {"".join(steps_items)}
</div>

<upao-nav id="nav" total="{total_puzzles}" current="1" prev-label="Acertijo anterior" next-label="Siguiente acertijo"></upao-nav>

<section class="ova-door-banner" id="door-banner" hidden>
  <div class="ova-door-banner-icon" aria-hidden="true">🎉🚪</div>
  <div>
    <h3 class="ova-door-banner-title">¡Compuerta Abierta! Has completado el Escape Room</h3>
    <p class="ova-door-banner-desc">{esc(data["epilogo"])}</p>
  </div>
</section>

<upao-summary title="Misión cumplida">
  <p>{esc(data["epilogo"])}</p>
  <upao-complete slot="actions" label="Finalizar escape" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(_ESCAPE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_puzzles", 3)
    acertijos = []
    for k in range(1, n + 1):
        acertijos.append(
            {
                "numero": k,
                "escenario": (
                    f"Mecanismo #{k}: Te encuentras ante una sala con dos vías de control para {concept}. "
                    f"Para abrir el candado de seguridad, debes elegir qué acción preserva el orden y la continuidad sin provocar un bloqueo total."
                )[:340],
                "opcion_A": "Distribuir el flujo por canales equilibrados"[:110],
                "opcion_B": "Cerrar todos los accesos ante la menor variación"[:110],
                "respuesta_correcta": "A",
                "explicacion_conexion": (
                    f"Tal como ocurre en {concept}, coordinar y distribuir recursos mantiene la estabilidad del sistema."
                )[:190],
            }
        )
    return {
        "titulo": f"Escape Room: El misterio de {concept}"[:65],
        "mision": f"Descifra {n} candados lógicos encadenados para abrir la compuerta principal y dominar {concept}."[:190],
        "acertijos": acertijos,
        "epilogo": f"¡Puerta desbloqueada! Has demostrado cómo la intuición y el equilibrio de {concept} garantizan la integridad de los datos."[:240],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=9,
    title="Escape Room Virtual",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
