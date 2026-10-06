"""EXPLORE 4 — Video con Pausa Activa: guion por segmentos + pausas de predicción interactiva.

Recurso de exploración audiovisual: presenta una secuencia de segmentos de video
intercalados con pausas activas donde el estudiante formula predicciones antes de continuar,
un prompt de video técnico en inglés para generadores externos de video AI, y un cierre sintético.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, b, i, obj, s

PARAMS = (
    Param(
        "num_pauses",
        3,
        min=1,
        max=5,
        help="Número de pausas activas",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_pauses"]
    return obj(
        titulo=s(70),
        gancho=s(160),
        guion_segmentos=arr(
            obj(
                segundo=s(20),
                visual=s(200),
                narracion=s(160),
            ),
            min_items=n + 1,
            max_items=n + 1,
        ),
        pausas=arr(
            obj(
                numero=i(),
                momento=s(20),
                pregunta_prediccion=s(180),
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
        prompt_video=s(600),
        sintesis=s(250),
    )


def normalize(data: dict, p: dict) -> dict:
    """Ajusta pausas y segmentos al número pedido: recorta si sobran; si faltan, repite la última."""
    n = p["num_pauses"]
    out = dict(data)
    pausas = list(out.get("pausas") or [])[:n]
    while pausas and len(pausas) < n:
        pausas.append(dict(pausas[-1]))
    for k, pa in enumerate(pausas, 1):
        pausas[k - 1] = {**pa, "numero": k}
    segs = list(out.get("guion_segmentos") or [])
    if len(segs) > n + 1:
        segs = segs[:n] + [segs[-1]]
    while segs and len(segs) < n + 1:
        segs.append(dict(segs[-1]))
    out["pausas"], out["guion_segmentos"] = pausas, segs
    return out


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_pauses"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador instruccional y guionista de video educativo interactivo para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un storyboard de video con {n} pausas activas para predicción que despierten curiosidad sin adelantar la solución sobre «{concept}». El video intercala {n + 1} segmentos de guion con {n} pausas interactivas en momentos clave de tensión o dilema.
- titulo: título atractivo del video educativo (≤10 palabras).
- gancho: introducción intrigante que invite a explorar el video y formular hipótesis (≤25 palabras).
- guion_segmentos: exactamente {n + 1} segmentos secuenciales del video. Para cada segmento:
  * `segundo`: intervalo de tiempo del segmento (ej. '0:00 - 0:20', '0:20 - 0:45').
  * `visual`: descripción visual concreta de la escena, animación o analogía (≤30 palabras).
  * `narracion`: locución o voz en off que acompaña la escena y prepara el siguiente momento (≤25 palabras).
- pausas: exactamente {n} pausas activas intercaladas entre los segmentos (la pausa 1 tras el segmento 1, la pausa 2 tras el segmento 2, etc.). Para cada pausa:
  * `numero`: número correlativo de la pausa (1 a {n}).
  * `momento`: marca de tiempo exacta de la pausa (ej. 'En 0:20', 'En 0:45').
  * `pregunta_prediccion`: pregunta desafiante que pide al estudiante predecir qué sucederá o cuál será la consecuencia inmediata antes de ver la continuación (≤25 palabras).
  * `opciones`: lista de 2 a 3 opciones breves y plausibles. Exactamente UNA con `correcta: true`; cada una con `texto` (≤12 palabras) y `feedback` formativo que explique por qué esa predicción se cumple o no en la realidad (≤25 palabras).
- prompt_video: prompt cinematográfico en inglés (≤90 palabras) optimizado para un generador de video AI externo (Runway, Luma, Sora), describiendo la progresión visual y conceptual de «{concept}», estilo animación técnica moderna, sin texto en pantalla ni fórmulas.
- sintesis: reflexión de cierre que consolida lo descubierto en las pausas y conecta las predicciones con el funcionamiento real de «{concept}» (≤35 palabras).
[RESTRICCIONES] Las preguntas de pausa deben ser genuinamente predictivas: suscitar hipótesis sobre causa y efecto sin adelantar la solución de golpe. Sin jerga técnica pesada ni fórmulas en el guion. Tono estimulante y empático.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador instruccional y guionista de video educativo interactivo para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un storyboard de video con {n} pausas activas para predicción que despierten curiosidad sin adelantar la solución sobre «{concept}». El video intercala {n + 1} segmentos de guion con {n} pausas interactivas en momentos clave de tensión o dilema.
- titulo: título atractivo del video educativo (≤10 palabras).
- gancho: introducción intrigante que invite a explorar el video y formular hipótesis (≤25 palabras).
- guion_segmentos: exactamente {n + 1} segmentos secuenciales del video. Para cada segmento:
  * `segundo`: intervalo de tiempo del segmento (ej. '0:00 - 0:20', '0:20 - 0:45').
  * `visual`: descripción visual concreta de la escena, animación o analogía (≤30 palabras).
  * `narracion`: locución o voz en off que acompaña la escena y prepara el siguiente momento (≤25 palabras).
- pausas: exactamente {n} pausas activas intercaladas entre los segmentos (la pausa 1 tras el segmento 1, la pausa 2 tras el segmento 2, etc.). Para cada pausa:
  * `numero`: número correlativo de la pausa (1 a {n}).
  * `momento`: marca de tiempo exacta de la pausa (ej. 'En 0:20', 'En 0:45').
  * `pregunta_prediccion`: pregunta desafiante que pide al estudiante predecir qué sucederá o cuál será la consecuencia inmediata antes de ver la continuación (≤25 palabras).
  * `opciones`: lista de 2 a 3 opciones breves y plausibles. Exactamente UNA con `correcta: true`; cada una con `texto` (≤12 palabras) y `feedback` formativo que explique por qué esa predicción se cumple o no en la realidad (≤25 palabras).
- prompt_video: prompt cinematográfico en inglés (≤90 palabras) optimizado para un generador de video AI externo (Runway, Luma, Sora), describiendo la progresión visual y conceptual de «{concept}», estilo animación técnica moderna, sin texto en pantalla ni fórmulas.
- sintesis: reflexión de cierre que consolida lo descubierto en las pausas y conecta las predicciones con el funcionamiento real de «{concept}» (≤35 palabras).
[RESTRICCIONES] Las preguntas de pausa deben ser genuinamente predictivas: suscitar hipótesis sobre causa y efecto sin adelantar la solución de golpe. Sin jerga técnica pesada ni fórmulas en el guion. Tono estimulante y empático.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  transition: opacity .25s ease, transform .25s ease;
}
.ova-segment-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.ova-segment-card--final {
  border-left: 4px solid var(--accent, #f47a20);
  background: var(--surface-tint, #f8fafc);
}
.ova-segment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}
.ova-badge-step {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
}
.ova-badge-step--final {
  background: var(--accent-tint, #fdeee0);
  color: var(--action, #B84B00);
}
.ova-time-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: var(--surface-tint, #f1f5f9);
  color: var(--text-muted, #475569);
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ova-segment-body {
  display: grid;
  gap: 12px;
}
.ova-segment-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ova-icon-box {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--surface-tint, #eef2ff);
  font-size: 1.1rem;
  flex-shrink: 0;
}
.ova-segment-text strong {
  display: block;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #64748b);
  margin-bottom: 2px;
}
.ova-segment-text p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text, #1e293b);
}
.ova-pause-card {
  background: var(--surface, #ffffff);
  border: 2px solid var(--primary, #0A3D91);
  border-radius: var(--radius, 12px);
  padding: 20px;
  box-shadow: 0 4px 14px rgba(10, 61, 145, 0.08);
  position: relative;
}
.ova-pause-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.ova-pause-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.ova-pause-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #f1f5f9);
  color: var(--text-muted, #64748b);
  transition: all .2s ease;
}
.ova-pause-chip.is-done {
  background: var(--success-bg, #f0fdf4);
  color: var(--success, #146c49);
}
.ova-pause-lead {
  font-size: 0.88rem;
  color: var(--text-muted, #64748b);
  margin-bottom: 14px;
}
.ova-step-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.ova-prompt-box {
  background: var(--surface-tint, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 10px);
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono, monospace);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text, #1e293b);
  margin-top: 12px;
}
.ova-copy-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}
</style>
"""

_EXPLORE_JS = """
(function () {
  const pauseCards = document.querySelectorAll('.ova-pause-card');
  const numPauses = pauseCards.length;

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}
  }

  document.addEventListener('upao-choice-selected', function (e) {
    const group = (e.detail && e.detail.group) || '';
    if (group.startsWith('pause-')) {
      const idx = parseInt(group.replace('pause-', ''), 10);
      if (!isNaN(idx) && idx >= 1 && idx <= numPauses) {
        window.ovaMark('pause-' + idx);

        const chip = document.getElementById('chip-pause-' + idx);
        if (chip) {
          chip.textContent = '✓ Respondida';
          chip.classList.add('is-done');
        }

        const nextStep = document.getElementById('step-' + (idx + 1));
        if (nextStep) {
          nextStep.hidden = false;
        }

        const actionEl = document.getElementById('action-step-' + idx);
        if (actionEl) {
          actionEl.hidden = false;
        }
      }
    }
  });

  document.querySelectorAll('.btn-next-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const nextIdx = btn.getAttribute('data-next');
      const target = document.getElementById('step-' + nextIdx);
      if (target) {
        target.hidden = false;
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        const focusable = target.querySelector('button, [tabindex="0"], upao-choice');
        if (focusable) {
          focusable.focus();
        }
      }
    });
  });

  const btnCopy = document.getElementById('btn-copy-prompt');
  const promptEl = document.getElementById('prompt-video-text');
  const copyLabel = document.getElementById('copy-btn-label');
  const copyStatus = document.getElementById('copy-status');

  if (btnCopy && promptEl) {
    btnCopy.addEventListener('click', function () {
      const textToCopy = promptEl.textContent || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).catch(function () {
          fallbackCopy(textToCopy);
        });
      } else {
        fallbackCopy(textToCopy);
      }
      if (copyLabel) copyLabel.textContent = '¡Prompt copiado!';
      if (copyStatus) copyStatus.textContent = '✓ Copiado al portapapeles';
    });
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    segmentos = data.get("guion_segmentos", [])
    pausas = data.get("pausas", [])
    num_pauses = len(pausas)
    total_segments = len(segmentos)
    total_progress = max(num_pauses, 1)

    steps_html = []

    for idx, pause in enumerate(pausas, 1):
        seg = segmentos[idx - 1] if idx - 1 < len(segmentos) else {}
        seg_time = esc(seg.get("segundo", ""))
        seg_visual = esc(seg.get("visual", ""))
        seg_narracion = esc(seg.get("narracion", ""))

        pause_momento = esc(pause.get("momento", ""))
        pause_num = esc(pause.get("numero", idx))
        pause_q = esc(pause.get("pregunta_prediccion", ""))

        choices_html = "".join(
            f'<upao-choice group="pause-{idx}" value="{chr(65 + k)}" '
            f'correct="{str(bool(opt.get("correcta"))).lower()}" '
            f'feedback="{esc(opt.get("feedback", ""))}">'
            f"{esc(opt.get('texto', ''))}"
            f"</upao-choice>"
            for k, opt in enumerate(pause.get("opciones", []))
        )

        next_label = (
            f"Continuar al Segmento {idx + 1}"
            if idx < num_pauses
            else "Continuar al Desenlace y Síntesis"
        )

        step_hidden = "" if idx == 1 else " hidden"

        steps_html.append(
            f'<section class="ova-step" id="step-{idx}" data-step="{idx}"{step_hidden}>'
            f'<div class="ova-card ova-segment-card">'
            f'<div class="ova-segment-head">'
            f'<span class="ova-badge-step">Segmento {idx} de {total_segments}</span>'
            f'<span class="ova-time-tag">⏱️ {seg_time}</span>'
            f"</div>"
            f'<div class="ova-segment-body">'
            f'<div class="ova-segment-row">'
            f'<div class="ova-icon-box" aria-hidden="true">🎬</div>'
            f'<div class="ova-segment-text"><strong>Visual</strong><p>{seg_visual}</p></div>'
            f"</div>"
            f'<div class="ova-segment-row">'
            f'<div class="ova-icon-box" aria-hidden="true">🎙️</div>'
            f'<div class="ova-segment-text"><strong>Locución</strong><p>«{seg_narracion}»</p></div>'
            f"</div>"
            f"</div>"
            f"</div>"
            f'<div class="ova-pause-card" id="pause-card-{idx}">'
            f'<div class="ova-pause-head">'
            f'<div class="ova-pause-title">'
            f'<span aria-hidden="true">⏸️</span>'
            f"<span>Pausa Activa {pause_num} • {pause_momento}</span>"
            f"</div>"
            f'<span class="ova-pause-chip" id="chip-pause-{idx}">Pendiente</span>'
            f"</div>"
            f'<p class="ova-pause-lead">Formula tu predicción antes de continuar la reproducción del video:</p>'
            f'<upao-question number="{idx}" prompt="{pause_q}">'
            f"{choices_html}"
            f"</upao-question>"
            f"</div>"
            f'<div class="ova-step-action" id="action-step-{idx}" hidden>'
            f'<button type="button" class="ova-btn btn-next-step" data-next="{idx + 1}" '
            f'aria-label="{next_label}">'
            f'<span>{next_label}</span> <span aria-hidden="true">↓</span>'
            f"</button>"
            f"</div>"
            f"</section>"
        )

    # Segmento final (Desenlace) + Prompt de Video + Síntesis
    final_seg_idx = num_pauses + 1
    final_seg = (
        segmentos[num_pauses]
        if num_pauses < len(segmentos)
        else (segmentos[-1] if segmentos else {})
    )
    final_time = esc(final_seg.get("segundo", ""))
    final_visual = esc(final_seg.get("visual", ""))
    final_narracion = esc(final_seg.get("narracion", ""))

    final_step_hidden = " hidden" if num_pauses > 0 else ""

    steps_html.append(
        f'<section class="ova-step" id="step-{final_seg_idx}" data-step="{final_seg_idx}"{final_step_hidden}>'
        f'<div class="ova-card ova-segment-card ova-segment-card--final">'
        f'<div class="ova-segment-head">'
        f'<span class="ova-badge-step ova-badge-step--final">Segmento {final_seg_idx} de {total_segments} • Desenlace</span>'
        f'<span class="ova-time-tag">⏱️ {final_time}</span>'
        f"</div>"
        f'<div class="ova-segment-body">'
        f'<div class="ova-segment-row">'
        f'<div class="ova-icon-box" aria-hidden="true">🎬</div>'
        f'<div class="ova-segment-text"><strong>Visual</strong><p>{final_visual}</p></div>'
        f"</div>"
        f'<div class="ova-segment-row">'
        f'<div class="ova-icon-box" aria-hidden="true">🎙️</div>'
        f'<div class="ova-segment-text"><strong>Locución</strong><p>«{final_narracion}»</p></div>'
        f"</div>"
        f"</div>"
        f"</div>"
        f'<details class="ova-card ova-prompt-card">'
        f'<summary>Para el docente: prompt de video para IA</summary>'
        f'<p class="ova-muted" style="font-size:0.875rem;margin-top:6px">'
        f"Prompt técnico en inglés para generadores externos de video (Runway, Luma, Sora, Pika). Es material del docente: no hace falta copiarlo para terminar."
        f"</p>"
        f'<pre class="ova-prompt-box"><code id="prompt-video-text">{esc(data.get("prompt_video", ""))}</code></pre>'
        f'<div class="ova-copy-bar">'
        f'<button type="button" class="ova-btn" id="btn-copy-prompt" aria-label="Copiar prompt de video al portapapeles">'
        f'<span aria-hidden="true">📋</span> <span id="copy-btn-label">Copiar prompt de video</span>'
        f"</button>"
        f'<span id="copy-status" aria-live="polite" class="ova-muted" style="font-size:0.875rem"></span>'
        f"</div>"
        f"</details>"
        f'<upao-summary title="Síntesis y Cierre">'
        f'<p>{esc(data.get("sintesis", ""))}</p>'
        f'<p class="ova-muted" style="font-size:0.875rem;margin-top:8px">'
        f"Responde todas las pausas activas para habilitar la finalización."
        f"</p>"
        f'<upao-complete slot="actions" label="Finalizar exploración" locked></upao-complete>'
        f"</upao-summary>"
        f"</section>"
    )

    all_steps = "".join(steps_html)

    return f"""{_STYLE}
<upao-header eyebrow="VIDEO CON PAUSA ACTIVA" title="{esc(data.get("titulo", ""))}"><p>{esc(data.get("gancho", ""))}</p></upao-header>
<upao-progress id="prog" current="0" total="{total_progress}" label="Progreso del video interactivo" show-fraction></upao-progress>
<div class="ova-stack" aria-live="polite">
{all_steps}
</div>
{script(PROGRESS_JS)}
{script(_EXPLORE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_pauses", 3)
    segmentos = []
    dur_per_seg = max(10, 90 // (n + 1))
    for k in range(1, n + 2):
        t_start = (k - 1) * dur_per_seg
        t_end = k * dur_per_seg
        m_s, s_s = divmod(t_start, 60)
        m_e, s_e = divmod(t_end, 60)
        segmentos.append(
            {
                "segundo": f"{m_s}:{s_s:02d} - {m_e}:{s_e:02d}"[:20],
                "visual": (
                    f"Animación esquemática del segmento {k} ilustrando el flujo de datos "
                    f"y la arquitectura de {concept}."
                )[:190],
                "narracion": (
                    f"En esta escena observamos cómo opera {concept} paso a paso "
                    f"para asegurar consistencia y velocidad."
                )[:150],
            }
        )

    pausas = []
    for k in range(1, n + 1):
        t_pause = k * dur_per_seg
        m_p, s_p = divmod(t_pause, 60)
        pausas.append(
            {
                "numero": k,
                "momento": f"En {m_p}:{s_p:02d}"[:20],
                "pregunta_prediccion": (
                    f"Pausa {k}: Si se ejecuta una consulta intensiva en {concept}, "
                    f"¿cuál será la reacción inmediata del motor?"
                )[:170],
                "opciones": [
                    {
                        "texto": f"Se optimiza el acceso reduciendo el costo de I/O en {concept}."[:95],
                        "feedback": f"¡Exacto! Esa es la consecuencia directa de la estructura de {concept}."[:150],
                        "correcta": True,
                    },
                    {
                        "texto": "Se bloquean todas las tablas concurrentes del sistema."[:95],
                        "feedback": "Incorrecto: la operación trabaja a nivel de bloque o fila sin paralizar la BD."[:150],
                        "correcta": False,
                    },
                    {
                        "texto": "Los datos se descartan permanentemente sin confirmación."[:95],
                        "feedback": "Incorrecto: el motor preserva la durabilidad mediante el log de transacciones."[:150],
                        "correcta": False,
                    },
                ],
            }
        )

    return {
        "titulo": f"Exploración en Video: {concept}"[:65],
        "gancho": f"¿Cómo opera internamente {concept}? Formula hipótesis en cada pausa activa."[:150],
        "guion_segmentos": segmentos,
        "pausas": pausas,
        "prompt_video": (
            f"Cinematic educational animation explaining {concept} in database systems. "
            "Clean 3D motion graphics showing memory buffers, storage blocks, and data flow pipelines. "
            "Soft studio lighting, deep blue and orange palette, realistic depth of field, 4k render, no text."
        )[:590],
        "sintesis": (
            f"Las predicciones realizadas confirman cómo {concept} optimiza el rendimiento. "
            f"Comprender estos mecanismos permite anticipar el comportamiento del motor ante cargas reales."
        )[:240],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=4,
    title="Video con Pausa Activa",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
    normalize=normalize,
)
