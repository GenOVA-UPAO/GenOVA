"""ENGAGE 5 — Dilema Ético: caso narrativo, posturas de votación y análisis reflexivo.

Permite al estudiante enfrentarse a una encrucijada profesional realista de administración
de bases de datos, sopesando trade-offs éticos y técnicos antes de registrar su postura.
"""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.schema import arr, obj, s

PARAMS = (Param("num_options", 3, min=2, max=4, help="Número de opciones de postura ética"),)


def schema(p: dict) -> dict:
    n = p["num_options"]
    sch = obj(
        titulo=s(70),
        caso_narrativo=s(600),
        pregunta_posicion=s(180),
        opciones=arr(
            obj(
                id=s(10),
                texto=s(120),
                consecuencia=s(200),
                tension_etica=s(200),
            ),
            min_items=n,
            max_items=n,
        ),
        reflexion_post_voto=s(400),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_options"]
    return f"""[ROL] Redactor de casos de ética y responsabilidad profesional en la administración de bases de datos para universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Escribe un caso narrativo verosímil de dilema ético profesional en una organización ficticia en producción. Una decisión técnica crítica del DBA relacionada con «{concept}» debe generar un conflicto tangible entre valores legítimos (como privacidad de datos personales, auditoría y trazabilidad, disponibilidad del servicio, o lealtad corporativa vs. seguridad ciudadana). Plantea {n} opciones de postura técnica con sus consecuencias reales y tensiones morales.
- titulo: titular sobrio y periodístico del dilema (≤10 palabras).
- caso_narrativo: relato concreto y verosímil (≤90 palabras) donde el DBA se encuentra ante una decisión urgente e incierta sobre «{concept}» que no admite una respuesta perfecta.
- pregunta_posicion: pregunta directa que interpela al estudiante en el rol del DBA para que elija una postura (≤25 palabras).
- opciones: exactamente {n} posturas de acción técnica distintas y plausibles. Por cada opción:
  * `id`: identificador breve (ej. 'opt-1', 'opt-2').
  * `texto`: formulación clara de la postura o acción técnica a tomar (≤20 palabras).
  * `consecuencia`: resultado práctico directo sobre los sistemas, usuarios o el negocio (≤30 palabras).
  * `tension_etica`: principio ético comprometido o el costo de valor que implica esta elección (≤30 palabras).
- reflexion_post_voto: síntesis reflexiva (≤60 palabras) que profundiza en la complejidad del dilema, destacando que en la administración de datos toda arquitectura y decisión técnica conlleva una carga ética inevitable, sin calificar ninguna opción como correcta o errónea.
- imagen (opcional): fotografía conceptual o técnica de dilema, auditoría o seguridad relacionada con «{concept}»:
  - query: término de búsqueda en inglés (ej: "{concept} data privacy cybersecurity compliance")
  - tipo: "foto", "diagrama" o "logo"
  - descripcion: texto accesible en español (alt)
[RESTRICCIONES] Empresa ficticia. Tono periodístico y deontológico profesional. Ninguna postura debe ser una negligencia absurda ni un delito obvio; todas deben tener defensores racionales y costos reales. La consecuencia debe derivarse de forma realista del funcionamiento de «{concept}». No incluyas código HTML ni referencias al JSON Schema.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_options", 3)
    base_options = [
        {
            "id": "opt-1",
            "texto": f"Priorizar disponibilidad: mantener activo {concept} sin reiniciar nodos para evitar caídas del servicio.",
            "consecuencia": "Los usuarios continúan operando con normalidad, pero se posterga la corrección de registros expuestos.",
            "tension_etica": "Disponibilidad ininterrumpida frente al deber de confidencialidad y protección de datos.",
        },
        {
            "id": "opt-2",
            "texto": f"Aislamiento preventivo: desconectar los accesos a {concept} de inmediato para ejecutar una auditoría forense.",
            "consecuencia": "Se evita cualquier manipulación adicional, pero se paralizan trámites esenciales de miles de usuarios.",
            "tension_etica": "Custodia rigurosa de la información frente al perjuicio directo causado por la indisponibilidad.",
        },
        {
            "id": "opt-3",
            "texto": f"Mitigación gradual: activar ofuscación temporal en {concept} mientras se investiga el incidente en segundo plano.",
            "consecuencia": "Se reduce el riesgo de fuga sin corte total, pero se incrementa la latencia de transacciones en un 35%.",
            "tension_etica": "Transparencia con los clientes frente a la conveniencia de una mitigación técnica discreta.",
        },
        {
            "id": "opt-4",
            "texto": f"Escalamiento formal: registrar el incidente de {concept} y delegar la decisión a la gerencia y al equipo legal.",
            "consecuencia": "El DBA deslinda responsabilidad directa, pero la brecha potencial persiste durante la deliberación.",
            "tension_etica": "Cumplimiento de la jerarquía organizacional frente a la proactividad del custodio de datos.",
        },
    ]
    return {
        "titulo": f"El dilema ético de {concept}"[:70],
        "caso_narrativo": (
            f"En una plataforma de servicios de salud que procesa historiales médicos, "
            f"el equipo de DBA identifica una inconsistencia en el componente de {concept}. "
            f"Una rutina optimizada permite consultar diagnósticos sin registrar la traza en la auditoría interna. "
            f"Solucionarlo de inmediato requiere apagar temporalmente el servicio de emergencias; "
            f"esperar a la ventana de mantenimiento nocturna mantiene el servicio activo pero deja los datos expuestos a consultas indebidas."
        )[:600],
        "pregunta_posicion": f"Como DBA a cargo, ¿qué postura decides adoptar ante esta falla en {concept}?"[
            :180
        ],
        "opciones": base_options[:n],
        "reflexion_post_voto": (
            f"En la gestión de bases de datos, las decisiones trascienden el rendimiento técnico. "
            f"Administrar «{concept}» exige sopesar constantemente la disponibilidad de servicios esenciales, "
            f"la privacidad de las personas y la rendición de cuentas. Cada alternativa conlleva un costo ético inevitable."
        )[:400],
        "imagen": {
            "query": f"{concept} data privacy cybersecurity compliance",
            "tipo": "foto",
            "descripcion": f"Dilema ético sobre seguridad y privacidad de datos en {concept}",
        },
    }


_STYLE = """
<style>
.dilema-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 20px);
}
.dilema-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}
.dilema-narrative {
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--text);
  margin: 0;
}
.dilema-section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0 0 var(--space-2, 8px) 0;
}
.dilema-options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 16px);
  margin-top: var(--space-3, 16px);
}
.dilema-option-item {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius, 12px);
  padding: var(--space-3, 16px);
  transition: border-color .2s ease, background-color .2s ease, box-shadow .2s ease;
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}
.dilema-option-item:hover {
  border-color: var(--primary);
}
.dilema-option-item.is-voted {
  border-color: var(--primary);
  background: var(--surface-tint);
  box-shadow: 0 0 0 1px var(--primary);
}
.dilema-option-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3, 12px);
}
.dilema-option-info {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2, 10px);
  flex: 1 1 260px;
}
.dilema-option-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: .9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dilema-option-text {
  font-size: .98rem;
  line-height: 1.5;
  color: var(--text);
  margin: 0;
}
.dilema-vote-btn {
  flex-shrink: 0;
}
.dilema-impact-panel {
  display: grid;
  gap: var(--space-2, 10px);
  padding-top: var(--space-3, 12px);
  border-top: 1px dashed var(--border);
}
.dilema-impact-card {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left-width: 4px;
}
.dilema-consequence-card {
  border-left-color: var(--accent);
}
.dilema-tension-card {
  border-left-color: var(--primary);
}
.dilema-impact-tag {
  display: block;
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 4px;
}
.dilema-consequence-tag {
  color: var(--action-hover);
}
.dilema-tension-tag {
  color: var(--primary);
}
.dilema-impact-text {
  font-size: .92rem;
  line-height: 1.55;
  margin: 0;
  color: var(--text);
}
.dilema-feedback-msg {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface-tint);
  border: 1px solid var(--border);
  font-size: .9rem;
  margin-block: var(--space-2, 8px);
}
.dilema-reflection-body {
  font-size: .98rem;
  line-height: 1.65;
  color: var(--text);
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    options_html_list = []
    for k, opt in enumerate(data.get("opciones", [])):
        letter = chr(65 + k)
        opt_id = esc(opt.get("id", f"opt-{k + 1}"))
        opt_text = esc(opt.get("texto", ""))
        opt_consequence = esc(opt.get("consecuencia", ""))
        opt_tension = esc(opt.get("tension_etica", ""))

        options_html_list.append(
            f'<article class="dilema-option-item" id="opt-card-{k}">'
            f'  <div class="dilema-option-head">'
            f'    <div class="dilema-option-info">'
            f'      <span class="dilema-option-badge" aria-hidden="true">{letter}</span>'
            f'      <p class="dilema-option-text"><strong>Postura {letter}:</strong> {opt_text}</p>'
            f"    </div>"
            f'    <button type="button" class="ova-btn dilema-vote-btn" data-index="{k}" data-letter="{letter}" data-opt-id="{opt_id}" aria-pressed="false" aria-label="Votar postura {letter}: {opt_text}">'
            f'      <span class="dilema-vote-label">Votar postura {letter}</span>'
            f"    </button>"
            f"  </div>"
            f'  <div class="dilema-impact-panel" id="impact-{k}" hidden>'
            f'    <div class="dilema-impact-card dilema-consequence-card">'
            f'      <span class="dilema-impact-tag dilema-consequence-tag">⚡ Consecuencia práctica</span>'
            f'      <p class="dilema-impact-text">{opt_consequence}</p>'
            f"    </div>"
            f'    <div class="dilema-impact-card dilema-tension-card">'
            f'      <span class="dilema-impact-tag dilema-tension-tag">⚖️ Tensión ética</span>'
            f'      <p class="dilema-impact-text">{opt_tension}</p>'
            f"    </div>"
            f"  </div>"
            f"</article>"
        )

    options_html = "".join(options_html_list)

    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Dilema ético en la gestión de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""{_STYLE}{IMAGE_FIGURE_CSS}
<upao-header eyebrow="DILEMA ÉTICO" title="{esc(data["titulo"])}">
  <p>{esc(data["pregunta_posicion"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="2" label="Progreso del dilema" show-fraction></upao-progress>

<section class="ova-card dilema-card">
  <div class="dilema-card-header">
    <span class="ova-badge">Escenario Crítico</span>
  </div>
  <h2 class="dilema-section-title">Caso en Producción</h2>
  <p class="dilema-narrative">{esc(data["caso_narrativo"])}</p>
  {fig_html}
</section>

<section class="ova-card dilema-card" aria-labelledby="decision-title">
  <h2 id="decision-title" class="dilema-section-title">{esc(data["pregunta_posicion"])}</h2>
  <div class="dilema-feedback-msg" id="vote-feedback" role="status" aria-live="polite">
    Elige una postura para registrar tu decisión y analizar sus consecuencias.
  </div>
  <div class="dilema-options-list" role="group" aria-label="Opciones de postura ética">
    {options_html}
  </div>
</section>

<section class="ova-card dilema-card">
  <h2 class="dilema-section-title">Reflexión posterior</h2>
  <p class="ova-muted">La administración de bases de datos exige contrastar tus decisiones con la ética profesional.</p>
  <upao-reveal id="reveal-reflexion" label="Ver reflexión posterior" icon="⚖️">
    <div class="dilema-reflection-body">
      <p>{esc(data["reflexion_post_voto"])}</p>
    </div>
  </upao-reveal>
</section>

<upao-summary title="Cierre del Dilema">
  <p>Toda decisión técnica en la gestión de datos tiene repercusiones humanas y éticas. Reconocer la tensión entre disponibilidad, privacidad y transparencia es el primer paso para una administración responsable.</p>
  <upao-complete slot="actions" label="Finalizar dilema" locked></upao-complete>
</upao-summary>
{credits_sec}

{script(PROGRESS_JS)}
{
        script('''
const voteButtons = document.querySelectorAll('.dilema-vote-btn');
const impactPanels = document.querySelectorAll('.dilema-impact-panel');
const optionCards = document.querySelectorAll('.dilema-option-item');
const feedbackEl = document.getElementById('vote-feedback');
const revealEl = document.getElementById('reveal-reflexion');

voteButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    const idx = btn.getAttribute('data-index');
    const letter = btn.getAttribute('data-letter') || '';
    const card = document.getElementById('opt-card-' + idx);

    impactPanels.forEach(function (p) {
      p.removeAttribute('hidden');
    });

    optionCards.forEach(function (c) {
      c.classList.remove('is-voted');
    });

    voteButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      const lbl = b.querySelector('.dilema-vote-label');
      if (lbl) {
        const l = b.getAttribute('data-letter') || '';
        lbl.textContent = 'Cambiar a postura ' + l;
      }
    });

    if (card) {
      card.classList.add('is-voted');
    }
    btn.setAttribute('aria-pressed', 'true');
    const activeLbl = btn.querySelector('.dilema-vote-label');
    if (activeLbl) {
      activeLbl.textContent = '✓ Postura ' + letter + ' elegida';
    }

    window.ovaMark('voto');

    if (feedbackEl) {
      feedbackEl.textContent = 'Has seleccionado la postura ' + letter + '. Se revelaron las consecuencias y tensiones éticas de cada opción. Ahora abre la reflexión posterior.';
    }
  });
});

if (revealEl) {
  revealEl.addEventListener('click', function () {
    window.ovaMark('reflexion');
  });
}
''')
    }
"""


SPEC = TemplateSpec(
    phase="engage",
    rt=5,
    title="Dilema Ético",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
