"""ENGAGE 6 — Noticia de Impacto: crónica periodística + esquema causal interactivo + reflexión."""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    paragraphs,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.icons import icon
from ova_engine.schema import obj, s

PARAMS = (
    Param("body_words", 90, min=60, max=130, help="Extensión en palabras del cuerpo de la noticia"),
)


def schema(p: dict) -> dict:
    sch = obj(
        titular=s(80),
        subtitulo=s(140),
        organizacion=s(60),
        cuerpo_noticia=s(800),
        esquema_causal=obj(
            causa=s(120),
            mecanismo=s(140),
            efecto=s(120),
        ),
        pregunta_cierre=s(160),
        analisis_cierre=s(300),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    w = p["body_words"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Periodista tecnológico especializado en bases de datos e infraestructura crítica.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Redacta una noticia periodística ficticia de impacto real de «{concept}» en una organización (p. ej. una caída crítica en producción evitada, una recuperación ante fallos imprevistos, una consulta masiva optimizada de horas a segundos, o una brecha de seguridad detectada a tiempo).
- titular: titular periodístico de impacto, conciso e informativo (≤12 palabras).
- subtitulo: bajada informativa que contextualiza la relevancia del suceso (≤22 palabras).
- organizacion: nombre de la empresa u organización ficticia involucrada (≤6 palabras).
- cuerpo_noticia: cuerpo de la noticia en tono de crónica periodística (alrededor de {w} palabras), relatando el contexto, el incidente crítico y cómo la solución técnica salvó la operación.
- esquema_causal: desglose analítico en tres fases conectadas:
  * causa: detonante operativo, error o sobrecarga que inició la crisis (≤20 palabras).
  * mecanismo: cómo actúa o interviene «{concept}» para resolver la falla (≤25 palabras).
  * efecto: resultado cuantificable y beneficio de alto impacto para la organización (≤20 palabras).
- pregunta_cierre: interrogante o dilema periodístico final que invita al estudiante a reflexionar sobre su rol como futuro profesional (≤25 palabras).
- analisis_cierre: análisis reflexivo conciso que responde a la pregunta de cierre, explicando el principio técnico subyacente y su lección esencial (≤50 palabras).
- imagen (opcional): fotografía o gráfico estructurado de contexto periodístico sobre la infraestructura:
  * tipo "foto" ÚNICAMENTE para servidores, datacenter, hardware de telecomunicaciones o infraestructura física real.
  * tipo "diagrama" para esquemas causales o de flujo del incidente (incluye objeto `diagrama`: tipo, titulo, nodos, aristas).
  * tipo "escena" para ilustraciones editoriales o pedagógicas de la noticia.
  * tipo "logo" para la empresa o tecnología protagonista.
  Incluye {{"tipo": "foto"|"diagrama"|"escena"|"logo", "descripcion": "...", "consulta": "..." (en inglés)}}.
[RESTRICCIONES] Sin términos ultra-técnicos incomprensibles. Tono de urgencia informativa y rigor periodístico. Genera admiración y curiosidad por el concepto, no miedo ni sensacionalismo alarmista.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Periodista divulgador especializado en «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Redacta una noticia periodística ficticia de impacto real de «{concept}» en una organización (p. ej. un problema real evitado, un hallazgo que cambió una práctica, un reto resuelto o una mejora medible lograda gracias al concepto).
- titular: titular periodístico de impacto, conciso e informativo (≤12 palabras).
- subtitulo: bajada informativa que contextualiza la relevancia del suceso (≤22 palabras).
- organizacion: nombre de la empresa u organización ficticia involucrada (≤6 palabras).
- cuerpo_noticia: cuerpo de la noticia en tono de crónica periodística (alrededor de {w} palabras), relatando el contexto, el incidente crítico y cómo la solución salvó la situación.
- esquema_causal: desglose analítico en tres fases conectadas:
  * causa: detonante operativo, error o sobrecarga que inició la crisis (≤20 palabras).
  * mecanismo: cómo actúa o interviene «{concept}» para resolver la falla (≤25 palabras).
  * efecto: resultado cuantificable y beneficio de alto impacto para la organización (≤20 palabras).
- pregunta_cierre: interrogante o dilema periodístico final que invita al estudiante a reflexionar sobre su papel como futuro profesional o ciudadano informado (≤25 palabras).
- analisis_cierre: análisis reflexivo conciso que responde a la pregunta de cierre, explicando el principio técnico subyacente y su lección esencial (≤50 palabras).
- imagen (opcional): fotografía o gráfico estructurado de contexto periodístico sobre el tema:
  * tipo "foto" ÚNICAMENTE para lugares, personas, objetos o infraestructura física reales relacionados con la noticia.
  * tipo "diagrama" para esquemas causales o de flujo del incidente (incluye objeto `diagrama`: tipo, titulo, nodos, aristas).
  * tipo "escena" para ilustraciones editoriales o pedagógicas de la noticia.
  * tipo "logo" para la empresa o tecnología protagonista.
  Incluye {{"tipo": "foto"|"diagrama"|"escena"|"logo", "descripcion": "...", "consulta": "..." (en inglés)}}.
[RESTRICCIONES] Sin términos ultra-técnicos incomprensibles. Tono de urgencia informativa y rigor periodístico. Genera admiración y curiosidad por el concepto, no miedo ni sensacionalismo alarmista.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.news-article {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: clamp(16px, 3vw, 24px);
  position: relative;
}
.news-masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 16px;
}
.news-masthead-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .85rem;
  color: var(--text-muted);
  font-weight: 500;
  flex-wrap: wrap;
}
.news-byline {
  font-size: .92rem;
  color: var(--text-muted);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.news-body {
  font-size: 1.02rem;
  line-height: 1.75;
  color: var(--text);
}
.news-body p:first-of-type {
  font-size: 1.08rem;
  font-weight: 500;
  border-left: 3px solid var(--accent);
  padding-left: 14px;
}

.news-causal-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: clamp(16px, 3vw, 24px);
  margin-top: 16px;
}
.news-section-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.news-section-header h3 {
  margin: 0;
  color: var(--primary);
  font-size: 1.25rem;
}
.news-section-header p {
  margin: 0;
  font-size: .92rem;
  color: var(--text-muted);
}

.causal-nav {
  display: flex;
  align-items: center;
  justify-content: stretch;
  gap: 8px;
  flex-wrap: wrap;
  margin-block: 16px;
}
.causal-tab {
  flex: 1 1 140px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 10px;
  border: 2px solid var(--border);
  background: var(--surface-tint);
  color: var(--text);
  font-weight: 600;
  font-size: .9rem;
  cursor: pointer;
  transition: all .2s ease;
  text-align: left;
}
.causal-tab:hover {
  border-color: var(--primary);
  background: var(--surface);
  transform: translateY(-1px);
}
.causal-tab:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}
.causal-tab.is-active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(10,61,145,.18);
}
.causal-tab.is-active .step-num {
  background: #fff;
  color: var(--primary);
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: .78rem;
  font-weight: 700;
  flex-shrink: 0;
}
.causal-arrow {
  color: var(--text-muted);
  font-weight: 700;
  font-size: 1.1rem;
}
@media (max-width: 600px) {
  .causal-arrow {
    display: none;
  }
}

.causal-panel {
  background: var(--surface-tint);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: 10px;
  padding: 18px 20px;
  margin-top: 12px;
}
.panel-tag {
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--action-hover);
  margin-bottom: 6px;
}
.causal-panel h4 {
  margin: 0 0 10px 0;
  color: var(--primary);
  font-size: 1.1rem;
}
.causal-panel p {
  margin: 0 0 16px 0;
  font-size: .98rem;
  line-height: 1.65;
  color: var(--text);
}
.causal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.causal-status-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--success-bg, #EAF7F1);
  color: var(--success);
  font-weight: 600;
  font-size: .88rem;
  border-radius: 8px;
  border: 1px solid var(--success);
}

.news-reflection-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: clamp(16px, 3vw, 24px);
  margin-top: 16px;
}
.news-quote {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--primary);
  padding: 14px 18px;
  background: var(--surface-tint);
  border-left: 4px solid var(--accent);
  border-radius: 0 10px 10px 0;
  margin-bottom: 16px;
}
.news-analisis-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.news-analisis-box h4 {
  margin: 0;
  color: var(--primary);
  font-size: 1rem;
}
.news-analisis-box p {
  margin: 0;
  font-size: .95rem;
  line-height: 1.6;
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    causal = data["esquema_causal"]
    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Infraestructura y caso técnico sobre {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""{_STYLE}{IMAGE_FIGURE_CSS}
<upao-header eyebrow="NOTICIA DE IMPACTO" title="{esc(data["titular"])}"><p>{
        esc(data["subtitulo"])
    }</p></upao-header>
<upao-progress id="prog" current="0" total="2" label="Progreso del análisis" show-fraction></upao-progress>

<article class="news-article">
  <div class="news-masthead">
    <span class="ova-badge">NOTICIA</span>
    <div class="news-masthead-meta">
      <span>Crónica de Infraestructura</span>
      <span aria-hidden="true">•</span>
      <span>Edición Tecnológica</span>
    </div>
  </div>
  <div class="news-byline">
    <span>{icon('building')} Organización: <strong>{esc(data["organizacion"])}</strong></span>
  </div>
  <div class="news-body">
    {paragraphs(data["cuerpo_noticia"])}
  </div>
  {fig_html}
</article>

<section class="news-causal-section" aria-labelledby="causal-heading">
  <div class="news-section-header">
    <span class="ova-badge">INFOGRAFÍA CAUSAL</span>
    <h3 id="causal-heading">Cadena Causal del Caso</h3>
    <p>Explora cada eslabón para comprender cómo el problema fue diagnosticado y resuelto.</p>
  </div>
  <div class="causal-nav" role="tablist" aria-label="Eslabones de la cadena causal">
    <button type="button" class="causal-tab is-active" id="tab-step-1" data-step="1" role="tab" aria-selected="true" aria-controls="panel-step-1" tabindex="0">
      <span class="step-num">1</span>
      <span class="step-label">Causa</span>
    </button>
    <span class="causal-arrow" aria-hidden="true">→</span>
    <button type="button" class="causal-tab" id="tab-step-2" data-step="2" role="tab" aria-selected="false" aria-controls="panel-step-2" tabindex="-1">
      <span class="step-num">2</span>
      <span class="step-label">Mecanismo</span>
    </button>
    <span class="causal-arrow" aria-hidden="true">→</span>
    <button type="button" class="causal-tab" id="tab-step-3" data-step="3" role="tab" aria-selected="false" aria-controls="panel-step-3" tabindex="-1">
      <span class="step-num">3</span>
      <span class="step-label">Efecto</span>
    </button>
  </div>
  <div class="causal-panels">
    <div class="causal-panel is-active" id="panel-step-1" data-panel="1" role="tabpanel" aria-labelledby="tab-step-1">
      <div class="panel-tag">Paso 1 · Detonante operativo</div>
      <h4>Causa del Incidente</h4>
      <p>{esc(causal["causa"])}</p>
      <div class="causal-actions">
        <button type="button" class="ova-btn causal-next-btn" data-target="2">Explorar Mecanismo de Acción →</button>
      </div>
    </div>
    <div class="causal-panel" id="panel-step-2" data-panel="2" role="tabpanel" aria-labelledby="tab-step-2" hidden>
      <div class="panel-tag">Paso 2 · Intervención técnica</div>
      <h4>Mecanismo de Solución</h4>
      <p>{esc(causal["mecanismo"])}</p>
      <div class="causal-actions">
        <button type="button" class="ova-btn ova-btn--ghost causal-prev-btn" data-target="1">← Ver Causa</button>
        <button type="button" class="ova-btn causal-next-btn" data-target="3">Explorar Efecto Obtenido →</button>
      </div>
    </div>
    <div class="causal-panel" id="panel-step-3" data-panel="3" role="tabpanel" aria-labelledby="tab-step-3" hidden>
      <div class="panel-tag">Paso 3 · Impacto organizacional</div>
      <h4>Efecto del Despliegue</h4>
      <p>{esc(causal["efecto"])}</p>
      <div class="causal-actions">
        <button type="button" class="ova-btn ova-btn--ghost causal-prev-btn" data-target="2">← Ver Mecanismo</button>
        <span class="causal-status-done">✓ Cadena causal completada</span>
      </div>
    </div>
  </div>
</section>

<section class="news-reflection-section" aria-labelledby="cierre-heading">
  <div class="news-section-header">
    <span class="ova-badge">REFLEXIÓN EDITORIAL</span>
    <h3 id="cierre-heading">Pregunta de Cierre</h3>
  </div>
  <blockquote class="news-quote">
    <p>{esc(data["pregunta_cierre"])}</p>
  </blockquote>
  <upao-reveal id="reveal-analisis" label="Revelar análisis del caso" icon="{esc(icon('bulb'))}">
    <div class="news-analisis-box">
      <h4>Análisis de la Redacción</h4>
      <p>{esc(data["analisis_cierre"])}</p>
    </div>
  </upao-reveal>
</section>

<upao-summary title="Balance del Caso">
  <p>El caso de <strong>{
        esc(data["organizacion"])
    }</strong> ilustra cómo la comprensión profunda de <strong>{
        esc(ctx.concept)
    }</strong> permite prevenir incidencias de alto impacto y salvaguardar la infraestructura en entornos reales.</p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>
{credits_sec}
{script(PROGRESS_JS)}
{
        script('''
const tabs = document.querySelectorAll('.causal-tab');
const panels = document.querySelectorAll('.causal-panel');
const nextBtns = document.querySelectorAll('.causal-next-btn');
const prevBtns = document.querySelectorAll('.causal-prev-btn');
const rev = document.getElementById('reveal-analisis');

function setStep(idx) {
  idx = parseInt(idx, 10);
  if (!idx || idx < 1 || idx > 3) return;
  window.ovaMark('esquema');
  tabs.forEach(function(tab) {
    const s = parseInt(tab.getAttribute('data-step'), 10);
    const active = s === idx;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
    tab.setAttribute('tabindex', active ? '0' : '-1');
  });
  panels.forEach(function(panel) {
    const s = parseInt(panel.getAttribute('data-panel'), 10);
    const active = s === idx;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

tabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    setStep(tab.getAttribute('data-step'));
  });
  tab.addEventListener('keydown', function(e) {
    const cur = parseInt(tab.getAttribute('data-step'), 10);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = cur === 3 ? 1 : cur + 1;
      const target = document.querySelector('.causal-tab[data-step="' + next + '"]');
      if (target) { target.focus(); setStep(next); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = cur === 1 ? 3 : cur - 1;
      const target = document.querySelector('.causal-tab[data-step="' + prev + '"]');
      if (target) { target.focus(); setStep(prev); }
    }
  });
});

nextBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    setStep(btn.getAttribute('data-target'));
  });
});

prevBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    setStep(btn.getAttribute('data-target'));
  });
});

if (rev) {
  rev.addEventListener('click', function() {
    window.ovaMark('analisis');
  });
  const origReveal = rev.reveal;
  if (typeof origReveal === 'function') {
    rev.reveal = function() {
      window.ovaMark('analisis');
      return origReveal.apply(this, arguments);
    };
  }
}
''')
    }
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titular": f"Caída crítica en producción evitada gracias a {concept}"[:80],
        "subtitulo": f"Una intervención oportuna mediante {concept} salvó millones de transacciones bancarias en tiempo récord."[
            :140
        ],
        "organizacion": "Banco Financiero Global"[:60],
        "cuerpo_noticia": (
            f"La plataforma de pagos colapsaba ante un pico imprevisto de transacciones concurrentes. "
            f"Las consultas críticas tardaban más de 45 segundos y amenazaban con suspender el servicio financiero a nivel nacional. "
            f"El equipo de administración de bases de datos implementó {concept}, permitiendo canalizar la sobrecarga "
            f"y recuperar tiempos de respuesta inferiores a 12 milisegundos. La operación continuó con total estabilidad."
        )[:800],
        "esquema_causal": {
            "causa": f"Sobrecarga de operaciones simultáneas bloqueó los recursos del sistema por falta de {concept}."[
                :120
            ],
            "mecanismo": f"La aplicación técnica de {concept} reestructuró el acceso a datos y eliminó la contención en memoria."[
                :140
            ],
            "efecto": "Tiempos de respuesta reducidos en un 98 % y continuidad operativa garantizada para los usuarios."[
                :120
            ],
        },
        "pregunta_cierre": f"¿Cómo cambiaría la resiliencia operativa de una empresa si omitiera {concept} en su infraestructura?"[
            :160
        ],
        "analisis_cierre": (
            f"El caso evidencia que {concept} no es un detalle secundario de optimización, "
            f"sino una salvaguarda esencial de continuidad de negocio: anticipar la contención previene "
            f"pérdidas millonarias antes de que ocurran."
        )[:300],
        "imagen": {
            "query": f"{concept} server infrastructure datacenter",
            "tipo": "foto",
            "descripcion": f"Infraestructura tecnológica y servidores para {concept}",
        },
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=6,
    title="Noticia de Impacto",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
