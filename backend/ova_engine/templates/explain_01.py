"""EXPLAIN 1 — Video Teórico: Storyboard y guion del marco teórico fundamental.

Recurso de video teórico: presenta la secuencia de marcadores temporales (cada 30s)
con conceptos clave y descripciones visuales, el guion de narración continuo,
el prompt técnico en inglés para generadores de video AI y la síntesis conceptual.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_markers",
        4,
        min=2,
        max=5,
        help="Número de marcadores del storyboard",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_markers"]
    return obj(
        titulo=s(70),
        introduccion=s(160),
        marcadores=arr(
            obj(
                tiempo=s(20),
                concepto_clave=s(60),
                descripcion_visual=s(220),
                narracion=s(180),
            ),
            min_items=n,
            max_items=n,
        ),
        narracion_voz=s(500),
        prompt_video=s(600),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_markers"]
    return f"""[ROL] Guionista de video educativo y diseñador instruccional para EdTech de {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Storyboard explicativo del marco teórico fundamental del concepto «{concept}» con {n} marcadores cada 30 segundos, metáforas conceptuales fieles y rigurosas, y un guion continuo de narración.
- titulo: título del video teórico (≤10 palabras).
- introduccion: planteamiento introductorio que contextualice el marco teórico de «{concept}» (≤25 palabras).
- marcadores: exactamente {n} marcadores temporales secuenciales cada 30 segundos ('0:00 - 0:30', '0:30 - 1:00', etc.). Por cada marcador:
  * `tiempo`: marca temporal progresiva del segmento (ej. '0:00 - 0:30').
  * `concepto_clave`: eje o principio teórico central abordado en este tramo (≤8 palabras).
  * `descripcion_visual`: encuadre, animación esquemática o metáfora visual que ilustre el principio teórico (≤30 palabras).
  * `narracion`: fragmento de la locución en off correspondiente (≤25 palabras).
- narracion_voz: texto continuo de la locución completa (voz en off fluida, ≤120 palabras), integrando los marcadores y concluyendo con una reflexión conceptual.
- prompt_video: prompt técnico y cinematográfico en inglés (≤100 palabras) optimizado para un generador de video AI externo (Runway Gen-3, Luma Dream Machine, Sora), describiendo la progresión visual del marco teórico sin fórmulas ni texto en pantalla.
- sintesis: cierre conceptual que consolide el valor del marco teórico de «{concept}» y su aplicación práctica (≤35 palabras).
[RESTRICCIONES] Sin fórmulas matemáticas complejas ni jerga técnica pesada. Explicación rigurosa con metáforas fieles. Tono claro y empático. No simules un reproductor ni incluyas código HTML.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-markers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.ova-markers-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ova-marker-item {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 16px;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ova-marker-item.is-active {
  border-color: var(--primary, #0A3D91);
  box-shadow: 0 0 0 2px var(--surface-tint, #eef2ff);
}
.ova-marker-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ova-time-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ova-marker-concept {
  color: var(--primary, #0A3D91);
  font-size: 1rem;
}
.ova-marker-chip {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-tint, #eef2ff);
  color: var(--text-muted, #64748b);
  transition: all .2s ease;
}
.ova-marker-chip.is-done {
  background: var(--success-bg, #f0fdf4);
  color: var(--success, #146C49);
}
.ova-marker-p {
  margin-block: 6px 0;
  line-height: 1.5;
}
.ova-marker-foot {
  margin-top: 12px;
}
.ova-prompt-box {
  background: var(--surface-tint, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 10px);
  padding: 14px;
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
  margin-top: 12px;
  flex-wrap: wrap;
}
</style>
"""

_SCRIPT = """
(function () {
  const markerItems = document.querySelectorAll('.ova-marker-item');
  const numMarkers = markerItems.length;
  let playInterval = null;
  let playIdx = 1;
  const playBtn = document.getElementById('btn-play-markers');
  const playLbl = document.getElementById('play-btn-label');
  const statusEl = document.getElementById('markers-status');
  const markAllBtn = document.getElementById('btn-mark-all');
  const btnCopy = document.getElementById('btn-copy-prompt');
  const promptEl = document.getElementById('prompt-video-text');
  const copyStatus = document.getElementById('copy-status');
  const copyLabel = document.getElementById('copy-btn-label');

  function markMarkerReviewed(idx) {
    if (!idx || idx < 1 || idx > numMarkers) return;
    window.ovaMark('marker-' + idx);
    markerItems.forEach(function (el) {
      el.classList.remove('is-active');
    });
    const item = document.getElementById('marker-item-' + idx);
    if (item) {
      item.classList.add('is-active');
    }
    const btn = document.querySelector('.btn-marker-check[data-marker="' + idx + '"]');
    if (btn) {
      btn.disabled = true;
    }
    const lbl = document.getElementById('btn-lbl-marker-' + idx);
    if (lbl) {
      lbl.textContent = 'Marcador revisado ✓';
    }
    const chip = document.getElementById('chip-marker-' + idx);
    if (chip) {
      chip.textContent = '✓ Revisado';
      chip.classList.add('is-done');
    }
  }

  document.querySelectorAll('.btn-marker-check').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const idx = parseInt(btn.getAttribute('data-marker'), 10);
      markMarkerReviewed(idx);
      if (statusEl) statusEl.textContent = 'Marcador ' + idx + ' revisado.';
    });
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      for (let i = 1; i <= numMarkers; i++) {
        markMarkerReviewed(i);
      }
      if (statusEl) statusEl.textContent = 'Todos los marcadores revisados.';
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        if (playLbl) playLbl.textContent = 'Continuar recorrido';
        if (statusEl) statusEl.textContent = 'Recorrido pausado.';
        return;
      }
      if (playIdx >= numMarkers) {
        playIdx = 1;
      }
      if (playLbl) playLbl.textContent = 'Pausar recorrido';
      if (statusEl) statusEl.textContent = 'Revisando marcador ' + playIdx + ' de ' + numMarkers + '...';
      markMarkerReviewed(playIdx);

      playInterval = setInterval(function () {
        playIdx++;
        if (playIdx <= numMarkers) {
          if (statusEl) statusEl.textContent = 'Revisando marcador ' + playIdx + ' de ' + numMarkers + '...';
          markMarkerReviewed(playIdx);
        } else {
          clearInterval(playInterval);
          playInterval = null;
          if (playLbl) playLbl.textContent = 'Reproducir de nuevo';
          if (statusEl) statusEl.textContent = '¡Recorrido de marcadores completado! Copia el prompt de video para finalizar.';
        }
      }, 2000);
    });
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const res = document.execCommand('copy');
      document.body.removeChild(ta);
      return res;
    } catch (e) {
      return false;
    }
  }

  function onCopySuccess() {
    if (copyLabel) copyLabel.textContent = '¡Prompt copiado!';
    if (copyStatus) copyStatus.textContent = '✓ Copiado al portapapeles para generador externo';
    window.ovaMark('copy-prompt');
  }

  if (btnCopy && promptEl) {
    btnCopy.addEventListener('click', function () {
      const textToCopy = promptEl.textContent || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(function () {
          onCopySuccess();
        }).catch(function () {
          fallbackCopy(textToCopy);
          onCopySuccess();
        });
      } else {
        fallbackCopy(textToCopy);
        onCopySuccess();
      }
    });
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    marcadores = data.get("marcadores", [])
    total_markers = len(marcadores)
    total_progress = total_markers + 1

    marker_items = []
    for idx, sc in enumerate(marcadores, 1):
        tiempo = esc(sc.get("tiempo", ""))
        concepto = esc(sc.get("concepto_clave", ""))
        desc_visual = esc(sc.get("descripcion_visual", ""))
        narracion = esc(sc.get("narracion", ""))

        marker_items.append(
            f'<li class="ova-marker-item" id="marker-item-{idx}" data-marker="{idx}">'
            f'<div class="ova-marker-head">'
            f'<span class="ova-time-tag">{icon("clock")} {tiempo}</span>'
            f'<strong class="ova-marker-concept">{concepto}</strong>'
            f'<span class="ova-marker-chip" id="chip-marker-{idx}" aria-hidden="true">Pendiente</span>'
            f"</div>"
            f'<p class="ova-marker-p"><strong>Visual:</strong> {desc_visual}</p>'
            f'<p class="ova-marker-p ova-muted"><strong>Locución:</strong> «{narracion}»</p>'
            f'<div class="ova-marker-foot">'
            f'<button type="button" class="ova-btn ova-btn--ghost btn-marker-check" data-marker="{idx}" '
            f'aria-label="Revisar marcador {idx}: {concepto}">'
            f'<span aria-hidden="true">{icon("eye")}</span> <span id="btn-lbl-marker-{idx}">Marcar como revisado</span>'
            f"</button>"
            f"</div>"
            f"</li>"
        )

    markers_html = "".join(marker_items)

    return f"""{_STYLE}
<upao-header eyebrow="VIDEO TEÓRICO" title="{esc(data["titulo"])}">
  <p>{esc(data["introduccion"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total_progress}" label="Progreso del video teórico" show-fraction></upao-progress>

<section class="ova-card">
  <div class="ova-markers-header">
    <h2>{icon('film')} Secuencia del Storyboard ({total_markers} marcadores temporales)</h2>
    <div class="ova-markers-controls">
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-play-markers" aria-label="Reproducir recorrido de marcadores">
        <span aria-hidden="true">{icon('play')}</span> <span id="play-btn-label">Reproducir recorrido</span>
      </button>
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-mark-all" aria-label="Marcar todos los marcadores como revisados">
        <span aria-hidden="true">✓</span> <span>Marcar todos revisados</span>
      </button>
    </div>
  </div>
  <p id="markers-status" aria-live="polite" class="ova-muted" style="margin-bottom:16px;font-size:0.9rem">
    Haz clic en cada marcador o reproduce el recorrido para revisar la fundamentación teórica paso a paso.
  </p>
  <upao-steps>
    <ol style="display:grid;gap:16px;padding-inline-start:1.5em;margin:0">
      {markers_html}
    </ol>
  </upao-steps>
</section>

<section class="ova-card">
  <h2>{icon('mic')} Guion de narración continuo (Voz en off)</h2>
  <blockquote style="margin-top:12px">
    <p>{esc(data["narracion_voz"])}</p>
  </blockquote>
</section>

<section class="ova-card">
  <h2>{icon('film')} Prompt de video para IA</h2>
  <p class="ova-muted" style="font-size:0.875rem;margin-top:6px">
    Prompt técnico en inglés optimizado para generadores externos (Runway Gen-3, Luma Dream Machine, Sora, Pika):
  </p>
  <pre class="ova-prompt-box"><code id="prompt-video-text">{esc(data["prompt_video"])}</code></pre>
  <div class="ova-copy-bar">
    <button type="button" class="ova-btn" id="btn-copy-prompt" aria-label="Copiar prompt de video al portapapeles">
      <span aria-hidden="true">{icon('clipboard')}</span> <span id="copy-btn-label">Copiar prompt de video</span>
    </button>
    <span id="copy-status" aria-live="polite" class="ova-muted" style="font-size:0.875rem"></span>
  </div>
</section>

<upao-summary title="Síntesis del marco teórico">
  <p>{esc(data["sintesis"])}</p>
  <p class="ova-muted" style="font-size:0.875rem;margin-top:8px">
    Revisa cada marcador del storyboard y copia el prompt de video para habilitar la finalización.
  </p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(_SCRIPT)}
"""


def sample(concept: str, p: dict) -> dict:
    n = int(p.get("num_markers", 4))
    marcadores = []
    for k in range(1, n + 1):
        s_start = (k - 1) * 30
        s_end = k * 30
        m_start, sec_start = divmod(s_start, 60)
        m_end, sec_end = divmod(s_end, 60)
        marcadores.append(
            {
                "tiempo": f"{m_start}:{sec_start:02d} - {m_end}:{sec_end:02d}",
                "concepto_clave": f"Marcador {k}: Fundamento de {concept}"[:60],
                "descripcion_visual": (
                    f"Esquema visual y animaciones técnicas que detallan los principios "
                    f"conceptuales y la estructura interna de {concept}."
                )[:220],
                "narracion": (
                    f"Analizamos los componentes clave de {concept} y su rol fundamental "
                    f"en el comportamiento predecible del sistema."
                )[:180],
            }
        )
    return {
        "titulo": f"Marco Teórico: {concept}"[:70],
        "introduccion": f"Fundamentos y principios que rigen {concept} en bases de datos."[:160],
        "marcadores": marcadores,
        "narracion_voz": (
            f"El marco teórico de {concept} es fundamental para entender la gestión moderna de datos. "
            f"Cada componente garantiza consistencia, aislamiento y durabilidad en entornos transaccionales. "
            f"Al dominar estos principios teóricos, se asegura un diseño arquitectónico eficiente y resiliente."
        )[:500],
        "prompt_video": (
            f"Cinematic educational video explaining the theoretical framework of {concept}. "
            f"Minimalist diagram animation with glowing nodes, flow arrows, clean topology. "
            f"Photorealistic 8k render, elegant studio lighting, no text, no formulas."
        )[:600],
        "sintesis": (
            f"Comprender la base teórica de {concept} permite anticipar problemas de concurrencia y optimizar consultas."
        )[:250],
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=1,
    title="Video Teórico",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
