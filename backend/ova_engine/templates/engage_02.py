"""ENGAGE 2 — Storyboard de Video: guion de preproducción y escenas temporales.

Recurso de video inicial: muestra la secuencia temporal del storyboard,
la locución completa en off y el prompt técnico en inglés copiable
para generadores externos de video AI.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_scenes",
        4,
        min=3,
        max=5,
        help="Número de escenas temporales del guion de video",
    ),
    Param(
        "style",
        "cinematografico",
        choices=("cinematografico", "animacion", "documental"),
        help="Estilo visual y de dirección de arte para las escenas",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_scenes"]
    return obj(
        titulo=s(70),
        gancho=s(160),
        escenas=arr(
            obj(
                tiempo=s(25),
                titulo=s(60),
                descripcion_visual=s(250),
                narracion=s(180),
            ),
            min_items=n,
            max_items=n,
        ),
        narracion_completa=s(500),
        pregunta_reflexion=s(180),
        prompt_video=s(600),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_scenes"]
    style = p["style"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Guionista audiovisual y diseñador de preproducción para EdTech para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un storyboard de preproducción para un video educativo de {n} escenas, estilo {style}, que despierte curiosidad inmediata sobre «{concept}». Usa una analogía visual cotidiana clara y cinematográfica que refleje fielmente cómo funciona «{concept}».
- titulo: título atractivo del video educativo (≤10 palabras).
- gancho: premisa intrigante que invite a explorar el guion (≤25 palabras).
- escenas: exactamente {n} escenas secuenciales con marcadores de tiempo progresivos. Por cada escena:
  * `tiempo`: marca temporal del segmento (ej. '0:00 - 0:10', '0:10 - 0:20').
  * `titulo`: nombre breve de la escena (≤8 palabras).
  * `descripcion_visual`: encuadre de cámara, analogía cotidiana y elementos visuales clave (≤35 palabras).
  * `narracion`: locución de voz en off para este fragmento (≤25 palabras).
- narracion_completa: texto continuo de la locución (voz en off fluida, ≤80 palabras) integrando todas las escenas y concluyendo con la pregunta reflexiva.
- pregunta_reflexion: pregunta abierta intrigante que invite al estudiante a reflexionar sobre el reto planteado (≤25 palabras).
- prompt_video: prompt cinematográfico en inglés (≤90 palabras) optimizado para un generador de video AI externo, describiendo la progresión visual estilo {style}, sin texto en pantalla ni fórmulas.
[RESTRICCIONES] Sin jerga técnica pesada ni fórmulas en el guion ni narración. Tono cinematográfico y empático. No describas ni propongas un reproductor ni simulación de video.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Guionista audiovisual y diseñador de preproducción para EdTech para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Crea un storyboard de preproducción para un video educativo de {n} escenas, estilo {style}, que despierte curiosidad inmediata sobre «{concept}». Usa una analogía visual cotidiana clara y cinematográfica que refleje fielmente cómo funciona «{concept}».
- titulo: título atractivo del video educativo (≤10 palabras).
- gancho: premisa intrigante que invite a explorar el guion (≤25 palabras).
- escenas: exactamente {n} escenas secuenciales con marcadores de tiempo progresivos. Por cada escena:
  * `tiempo`: marca temporal del segmento (ej. '0:00 - 0:10', '0:10 - 0:20').
  * `titulo`: nombre breve de la escena (≤8 palabras).
  * `descripcion_visual`: encuadre de cámara, analogía cotidiana y elementos visuales clave (≤35 palabras).
  * `narracion`: locución de voz en off para este fragmento (≤25 palabras).
- narracion_completa: texto continuo de la locución (voz en off fluida, ≤80 palabras) integrando todas las escenas y concluyendo con la pregunta reflexiva.
- pregunta_reflexion: pregunta abierta intrigante que invite al estudiante a reflexionar sobre el reto planteado (≤25 palabras).
- prompt_video: prompt cinematográfico en inglés (≤90 palabras) optimizado para un generador de video AI externo, describiendo la progresión visual estilo {style}, sin texto en pantalla ni fórmulas.
[RESTRICCIONES] Sin jerga técnica pesada ni fórmulas en el guion ni narración. Tono cinematográfico y empático. No describas ni propongas un reproductor ni simulación de video.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-scenes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.ova-scenes-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ova-scene-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ova-scene-item.is-active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--surface-tint);
}
.ova-scene-head {
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
  background: var(--surface-tint);
  color: var(--primary);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ova-scene-title {
  color: var(--primary);
  font-size: 1rem;
}
.ova-scene-chip {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-tint);
  color: var(--text-muted);
}
.ova-scene-chip.is-done {
  background: var(--surface-tint);
  color: var(--success, #146C49);
}
.ova-scene-p {
  margin-block: 6px 0;
}
.ova-scene-foot {
  margin-top: 12px;
}
.ova-prompt-box {
  background: var(--surface-tint);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text);
  margin-top: 12px;
}
</style>
"""

_SCENE_JS = """
(function () {
  const sceneItems = document.querySelectorAll('.ova-scene-item');
  const numScenes = sceneItems.length;
  let playInterval = null;
  let playIdx = 1;
  const playBtn = document.getElementById('btn-play-scenes');
  const playLbl = document.getElementById('play-btn-label');
  const statusEl = document.getElementById('scenes-status');
  const markAllBtn = document.getElementById('btn-mark-all');
  const btnCopy = document.getElementById('btn-copy-prompt');
  const promptEl = document.getElementById('prompt-video-text');
  const copyStatus = document.getElementById('copy-status');
  const copyLabel = document.getElementById('copy-btn-label');

  function markSceneViewed(idx) {
    if (!idx || idx < 1 || idx > numScenes) return;
    window.ovaMark('scene-' + idx);
    sceneItems.forEach(function (el) {
      el.classList.remove('is-active');
    });
    const item = document.getElementById('scene-item-' + idx);
    if (item) {
      item.classList.add('is-active');
    }
    const btn = document.querySelector('.btn-scene-view[data-scene="' + idx + '"]');
    if (btn) {
      btn.disabled = true;
    }
    const lbl = document.getElementById('btn-lbl-scene-' + idx);
    if (lbl) {
      lbl.textContent = 'Escena vista ✓';
    }
    const chip = document.getElementById('chip-scene-' + idx);
    if (chip) {
      chip.textContent = '✓ Vista';
      chip.classList.add('is-done');
    }
  }

  // Activa la primera escena al inicio
  markSceneViewed(1);

  document.querySelectorAll('.btn-scene-view').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = parseInt(btn.getAttribute('data-scene'), 10);
      markSceneViewed(s);
      if (statusEl) statusEl.textContent = 'Escena ' + s + ' revisada.';
    });
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      for (let i = 1; i <= numScenes; i++) {
        markSceneViewed(i);
      }
      if (statusEl) statusEl.textContent = 'Todas las escenas marcadas como vistas.';
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
      if (playIdx >= numScenes) {
        playIdx = 1;
      }
      if (playLbl) playLbl.textContent = 'Pausar recorrido';
      if (statusEl) statusEl.textContent = 'Reproduciendo escena ' + playIdx + ' de ' + numScenes + '...';
      markSceneViewed(playIdx);

      playInterval = setInterval(function () {
        playIdx++;
        if (playIdx <= numScenes) {
          if (statusEl) statusEl.textContent = 'Reproduciendo escena ' + playIdx + ' de ' + numScenes + '...';
          markSceneViewed(playIdx);
        } else {
          clearInterval(playInterval);
          playInterval = null;
          if (playLbl) playLbl.textContent = 'Reproducir de nuevo';
          if (statusEl) statusEl.textContent = '¡Recorrido completado! Copia el prompt de video para finalizar.';
        }
      }, 2000);
    });
  }

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
      if (copyStatus) copyStatus.textContent = '✓ Copiado al portapapeles para generador externo';
      window.ovaMark('copy-prompt');
    });
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    escenas = data.get("escenas", [])
    total_scenes = len(escenas)
    total_progress = total_scenes + 1

    scene_items = []
    for idx, sc in enumerate(escenas, 1):
        tiempo = esc(sc.get("tiempo", ""))
        titulo = esc(sc.get("titulo", ""))
        desc_visual = esc(sc.get("descripcion_visual", ""))
        narracion = esc(sc.get("narracion", ""))

        scene_items.append(
            f'<li class="ova-scene-item" id="scene-item-{idx}" data-scene="{idx}">'
            f'<div class="ova-scene-head">'
            f'<span class="ova-time-tag">{icon("clock")} {tiempo}</span>'
            f'<strong class="ova-scene-title">{titulo}</strong>'
            f'<span class="ova-scene-chip" id="chip-scene-{idx}" aria-hidden="true">Pendiente</span>'
            f"</div>"
            f'<p class="ova-scene-p"><strong>Visual:</strong> {desc_visual}</p>'
            f'<p class="ova-scene-p ova-muted"><strong>Locución:</strong> «{narracion}»</p>'
            f'<div class="ova-scene-foot">'
            f'<button type="button" class="ova-btn ova-btn--ghost btn-scene-view" data-scene="{idx}" '
            f'aria-label="Marcar escena {idx} como vista">'
            f'<span aria-hidden="true">{icon("eye")}</span> <span id="btn-lbl-scene-{idx}">Marcar como vista</span>'
            f"</button>"
            f"</div>"
            f"</li>"
        )

    scenes_html = "".join(scene_items)

    return f"""{_STYLE}
<upao-header eyebrow="STORYBOARD DE VIDEO" title="{esc(data["titulo"])}">
  <p>{esc(data["gancho"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total_progress}" label="Progreso del guion" show-fraction></upao-progress>

<section class="ova-card">
  <div class="ova-scenes-header">
    <h2>{icon('film')} Secuencia del Storyboard ({total_scenes} escenas)</h2>
    <div class="ova-scenes-controls">
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-play-scenes" aria-label="Reproducir recorrido de escenas">
        <span aria-hidden="true">{icon('play')}</span> <span id="play-btn-label">Reproducir recorrido</span>
      </button>
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-mark-all" aria-label="Marcar todas las escenas como vistas">
        <span aria-hidden="true">✓</span> <span>Marcar todas vistas</span>
      </button>
    </div>
  </div>
  <p id="scenes-status" aria-live="polite" class="ova-muted" style="margin-bottom:16px;font-size:0.9rem">
    Haz clic en cada escena o reproduce el recorrido para explorar la secuencia audiovisual.
  </p>
  <upao-steps>
    <ol style="display:grid;gap:16px;padding-inline-start:1.5em;margin:0">
      {scenes_html}
    </ol>
  </upao-steps>
</section>

<section class="ova-card">
  <h2>{icon('mic')} Guion de locución continuo (Voz en off)</h2>
  <blockquote style="margin-top:12px">
    <p>{esc(data["narracion_completa"])}</p>
  </blockquote>
</section>

<section class="ova-card">
  <h2>{icon('film')} Prompt de video para IA</h2>
  <p class="ova-muted" style="font-size:0.875rem;margin-top:6px">
    Prompt técnico en inglés optimizado para generadores externos (Runway Gen-3, Luma Dream Machine, Sora, Pika):
  </p>
  <pre class="ova-prompt-box"><code id="prompt-video-text">{esc(data["prompt_video"])}</code></pre>
  <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
    <button type="button" class="ova-btn" id="btn-copy-prompt" aria-label="Copiar prompt de video al portapapeles">
      <span aria-hidden="true">{icon('clipboard')}</span> <span id="copy-btn-label">Copiar prompt de video</span>
    </button>
    <span id="copy-status" aria-live="polite" class="ova-muted" style="font-size:0.875rem"></span>
  </div>
</section>

<upao-summary title="Cierre de preproducción">
  <p><strong>Pregunta de reflexión:</strong> {esc(data["pregunta_reflexion"])}</p>
  <p class="ova-muted" style="font-size:0.875rem;margin-top:8px">
    Revisa todas las escenas del storyboard y copia el prompt de video para habilitar la finalización.
  </p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(_SCENE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_scenes", 4)
    style = p.get("style", "cinematografico")
    escenas = []
    dur_per_scene = max(5, 40 // n if n > 0 else 10)
    for k in range(1, n + 1):
        t_start = (k - 1) * dur_per_scene
        t_end = k * dur_per_scene
        escenas.append(
            {
                "tiempo": f"0:{t_start:02d} - 0:{t_end:02d}",
                "titulo": f"Escena {k}: Dinámica de {concept}"[:60],
                "descripcion_visual": (
                    f"Plano estilo {style}. Una analogía cotidiana en movimiento "
                    f"representa el flujo de trabajo de {concept}."
                )[:220],
                "narracion": (
                    f"En este instante, los elementos de {concept} sincronizan "
                    f"su operación para garantizar fluidez y consistencia."
                )[:160],
            }
        )
    return {
        "titulo": f"El latido de {concept}"[:60],
        "gancho": f"¿Cómo una simple regla invisible mantiene el orden en {concept}?"[:160],
        "escenas": escenas,
        "narracion_completa": (
            f"Imagina un centro logístico donde cada paquete halla su ruta sin esperas. "
            f"Así opera {concept}: coordinando datos en fracciones de segundo. "
            f"Pero ¿qué ocurre si el volumen se multiplica repentinamente?"
        )[:400],
        "pregunta_reflexion": (
            f"Si la carga se triplica en un instante, ¿cómo protege {concept} la integridad de los datos?"
        )[:160],
        "prompt_video": (
            f"Cinematic {style} sequence showing a glowing data grid in motion. "
            f"Light pulses travel along structured channels without bottlenecks. "
            f"Soft studio lighting, realistic depth of field, 8k resolution, no text."
        )[:600],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=2,
    title="Storyboard de Video",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
