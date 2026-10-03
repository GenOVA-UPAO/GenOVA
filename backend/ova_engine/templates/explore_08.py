"""EXPLORE 8 — Juego de Roles: dilemas técnicos de pequeñas empresas para DBA junior.

Simulación interactiva basada en roles en la que el estudiante asume la posición
de un DBA junior encargado de resolver incidentes reales en diversos escenarios de negocios.
Navegación por casos con pestañas y upao-nav, toma de decisiones mediante preguntas con
upao-choice, retroalimentación formativa y acumulación de puntuación con upao-score.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, b, obj, s

PARAMS = (
    Param(
        "num_scenarios",
        4,
        min=3,
        max=5,
        help="Número de escenarios de negocios",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_scenarios"]
    return obj(
        titulo=s(70),
        intro=s(160),
        escenarios=arr(
            obj(
                id=s(10),
                empresa=s(60),
                problema=s(250),
                opciones=arr(
                    obj(
                        texto=s(100),
                        correcta=b(),
                        feedback=s(160),
                    ),
                    2,
                    3,
                ),
            ),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_scenarios"]
    return f"""[ROL] Diseñador de aprendizaje basado en roles para DBA junior.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña {n} escenarios variados de pequeñas o medianas empresas de distintos sectores (salud, educación, retail, turismo, finanzas, logística, etc.) donde un DBA junior debe tomar la mejor decisión técnica para resolver un problema operativo real aplicando «{concept}».
- titulo: título atractivo del caso de simulación o juego de roles (≤10 palabras).
- intro: introducción que contextualiza el rol del DBA junior y la misión de diagnosticar y actuar en cada empresa (≤25 palabras).
- escenarios: lista de exactamente {n} escenarios empresariales. Cada escenario contiene:
  * `id`: identificador corto único (ej. 'esc-1', 'esc-2', ≤6 caracteres).
  * `empresa`: nombre comercial y sector de la empresa (ej. 'Clínica San Pablo (Salud)', ≤8 palabras).
  * `problema`: situación problemática concreta y cotidiana explicada con lenguaje claro donde la solución dependa de «{concept}» (≤35 palabras).
  * `opciones`: lista de entre 2 y 3 alternativas de acción para el DBA junior. Exactamente UNA opción debe tener `correcta: true` (la mejor decisión técnica) y las demás `correcta: false`. Cada opción incluye `texto` (acción propuesta, ≤15 palabras) y `feedback` (justificación técnica concisa de por qué la acción es adecuada o contraproducente, ≤25 palabras).
- sintesis: conclusión pedagógica que sintetice el criterio común de decisión para «{concept}» en entornos de producción (≤35 palabras).
[RESTRICCIONES] Problemas concretos y cotidianos sin lenguaje críptico inicial. Cada decisión correcta debe ser técnicamente sólida y defendible según las buenas prácticas de bases de datos. No generes HTML ni menciones el esquema JSON.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.role-hud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-tint, #EAF0FB);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  margin-bottom: 16px;
}
.role-tabs-wrapper {
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
.role-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--surface, #FFFFFF);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  min-width: min-content;
}
@media (max-width: 640px) {
  .role-tabs {
    flex-wrap: wrap;
    min-width: 0;
  }
  .role-tab {
    min-width: 100%;
  }
}
.role-tab {
  flex: 1 1 0;
  min-width: 130px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  color: var(--text, #15233B);
  font-family: inherit;
}
.role-tab:hover {
  background: var(--surface-tint, #EAF0FB);
}
.role-tab.active {
  background: var(--surface-tint, #EAF0FB);
  border-color: var(--primary, #0A3D91);
}
.role-tab:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.role-tab .tab-number {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #5A6B85);
}
.role-tab.active .tab-number {
  color: var(--primary, #0A3D91);
}
.role-tab .tab-label {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.role-tab .tab-status {
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 2px;
  color: var(--text-muted, #5A6B85);
}
.role-tab.is-answered.is-correct .tab-status {
  color: var(--success, #146C49);
}
.role-tab.is-answered.is-wrong .tab-status {
  color: var(--danger, #B42332);
}
.scenario-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.scenario-card {
  background: var(--surface, #FFFFFF);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 20px;
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
}
.scenario-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
  border: 1px solid var(--border, #E2E8F2);
  padding: 4px 10px;
  border-radius: 999px;
}
.company-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent, #F47A20);
  background: var(--accent-tint, #FDEEE0);
  padding: 4px 10px;
  border-radius: 6px;
}
.scenario-heading {
  font-size: 1.22rem;
  font-weight: 700;
  color: var(--text, #15233B);
  margin: 0 0 14px 0;
  line-height: 1.3;
}
.problem-box {
  background: var(--surface-tint, #EAF0FB);
  border-left: 4px solid var(--primary, #0A3D91);
  padding: 14px 16px;
  border-radius: 0 8px 8px 0;
  margin-bottom: 18px;
}
.problem-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary, #0A3D91);
  margin-bottom: 6px;
}
.problem-desc {
  font-size: 0.96rem;
  line-height: 1.6;
  color: var(--text, #15233B);
  margin: 0;
}
.decision-box {
  margin-top: 10px;
}
.decision-intro {
  font-size: 0.92rem;
  color: var(--text-muted, #5A6B85);
  margin-bottom: 12px;
}
.role-nav-wrapper {
  margin-top: 16px;
  margin-bottom: 8px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
"""

_ROLE_JS = """
(function() {
  const nav = document.getElementById('nav');
  const panels = document.querySelectorAll('.scenario-panel');
  const tabs = document.querySelectorAll('.role-tab');
  const scoreEl = document.getElementById('score');
  const answeredGroups = new Set();

  function showScenario(index) {
    panels.forEach(function(p, i) {
      p.hidden = (i !== index - 1);
    });
    tabs.forEach(function(t, i) {
      const isCur = (i === index - 1);
      t.setAttribute('aria-selected', isCur ? 'true' : 'false');
      if (isCur) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
  }

  if (nav) {
    nav.addEventListener('upao-nav-change', function(e) {
      showScenario(e.detail.index);
    });
  }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-index'), 10);
      if (nav && typeof nav.go === 'function') {
        nav.go(idx);
      } else {
        showScenario(idx);
      }
    });

    tab.addEventListener('keydown', function(e) {
      const totalTabs = tabs.length;
      const curIdx = parseInt(this.getAttribute('data-index'), 10);
      let targetIdx = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIdx = curIdx >= totalTabs ? 1 : curIdx + 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIdx = curIdx <= 1 ? totalTabs : curIdx - 1;
      } else if (e.key === 'Home') {
        targetIdx = 1;
      } else if (e.key === 'End') {
        targetIdx = totalTabs;
      }
      if (targetIdx !== null) {
        e.preventDefault();
        const targetTab = document.getElementById('tab-' + targetIdx);
        if (targetTab) {
          targetTab.focus();
          targetTab.click();
        }
      }
    });
  });

  function handleAnswer(group, isCorrect) {
    if (!group || !group.startsWith('scenario-')) return;
    if (answeredGroups.has(group)) return;
    answeredGroups.add(group);

    const idx = group.replace('scenario-', '');

    if (isCorrect && scoreEl && typeof scoreEl.add === 'function') {
      scoreEl.add(10);
    }

    const tab = document.getElementById('tab-' + idx);
    const statusText = document.getElementById('tab-status-' + idx);
    const srText = document.getElementById('tab-sr-' + idx);
    if (tab) {
      tab.classList.add('is-answered');
      if (isCorrect) {
        tab.classList.add('is-correct');
      } else {
        tab.classList.add('is-wrong');
      }
    }
    if (statusText) {
      statusText.textContent = isCorrect ? '✓ Acertado' : '✗ Revisado';
    }
    if (srText) {
      srText.textContent = isCorrect ? '(Estado: decisión acertada)' : '(Estado: decisión revisada)';
    }

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('scenario-' + idx);
    }

    const totalPanels = document.querySelectorAll('.scenario-panel').length;
    if (totalPanels && answeredGroups.size >= totalPanels) {
      document.querySelectorAll('upao-complete').forEach(function(b) {
        b.removeAttribute('locked');
      });
    }
  }

  document.addEventListener('upao-choice-selected', function(e) {
    if (e.detail && e.detail.group) {
      handleAnswer(e.detail.group, Boolean(e.detail.correct));
    }
  });

  document.addEventListener('click', function(e) {
    const choice = e.target && e.target.closest ? e.target.closest('upao-choice') : null;
    if (!choice) return;
    const group = choice.getAttribute('group');
    if (group && group.startsWith('scenario-') && !answeredGroups.has(group)) {
      const isCorrect = choice.getAttribute('correct') === 'true';
      handleAnswer(group, isCorrect);
    }
  });
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    letters = ("A", "B", "C")
    panels_html = []
    tab_buttons = []
    scenarios = data.get("escenarios", [])
    total = len(scenarios)

    for k, sc in enumerate(scenarios, 1):
        is_first = k == 1
        active_cls = " active" if is_first else ""
        selected = "true" if is_first else "false"
        hidden_attr = "" if is_first else " hidden"

        tab_buttons.append(
            f'<button type="button" role="tab" class="role-tab{active_cls}"'
            f' id="tab-{k}" data-index="{k}" aria-selected="{selected}"'
            f' aria-controls="scenario-panel-{k}">'
            f'<span class="tab-number">Caso {k}</span>'
            f'<span class="tab-label">{esc(sc.get("empresa", ""))}</span>'
            f'<span class="tab-status" id="tab-status-{k}" aria-hidden="true">● Pendiente</span>'
            f'<span class="sr-only" id="tab-sr-{k}">(Estado: pendiente)</span>'
            f"</button>"
        )

        choices_html = "".join(
            f'<upao-choice group="scenario-{k}" value="{letters[j]}" '
            f'correct="{str(bool(opt.get("correcta", False))).lower()}" '
            f'feedback="{esc(opt.get("feedback", ""))}">'
            f'{esc(opt.get("texto", ""))}'
            f"</upao-choice>"
            for j, opt in enumerate(sc.get("opciones", []))
        )

        panels_html.append(
            f'<section class="scenario-panel" data-scenario="{k}"'
            f' id="scenario-panel-{k}"{hidden_attr}'
            f' aria-labelledby="scenario-heading-{k}">'
            f'<div class="scenario-card">'
            f'<div class="scenario-meta">'
            f'<span class="role-badge">DBA Junior</span>'
            f'<span class="company-tag">🏢 {esc(sc.get("empresa", ""))}</span>'
            f"</div>"
            f'<h2 id="scenario-heading-{k}" class="scenario-heading">Caso {k}: {esc(sc.get("empresa", ""))}</h2>'
            f'<div class="problem-box">'
            f'<div class="problem-title"><span aria-hidden="true">⚠️</span> Situación crítica reportada</div>'
            f'<p class="problem-desc">{esc(sc.get("problema", ""))}</p>'
            f"</div>"
            f'<div class="decision-box">'
            f'<p class="decision-intro">Evalúa las alternativas técnicas y toma la mejor decisión para el negocio:</p>'
            f'<upao-question number="{k}" prompt="¿Qué decisión técnica debe tomar el DBA junior?">'
            f"{choices_html}"
            f"</upao-question>"
            f"</div>"
            f"</div>"
            f"</section>"
        )

    return f"""{_STYLE}
<upao-header eyebrow="JUEGO DE ROLES" title="{esc(data["titulo"])}">
  <p>{esc(data["intro"])}</p>
</upao-header>

<div class="role-hud" role="region" aria-label="Indicadores del juego de roles">
  <upao-progress id="prog" current="0" total="{total}" label="Escenarios resueltos" show-fraction></upao-progress>
  <upao-score id="score" current="0" max="{total * 10}" label="Puntuación"></upao-score>
</div>

<div class="role-tabs-wrapper" role="region" aria-label="Navegación de escenarios">
  <div class="role-tabs" role="tablist" aria-label="Lista de escenarios empresariales">
    {"".join(tab_buttons)}
  </div>
</div>

<div class="ova-stack" id="scenarios-stack">
  {"".join(panels_html)}
</div>

<div class="role-nav-wrapper">
  <upao-nav id="nav" total="{total}" current="1" prev-label="← Caso anterior" next-label="Siguiente caso →"></upao-nav>
</div>

<upao-summary title="Síntesis de Decisiones del DBA">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Finalizar misión de DBA" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(_ROLE_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_scenarios", 4)
    all_scenarios = [
        {
            "id": "esc-1",
            "empresa": "Clínica San Pablo (Salud)",
            "problema": (
                f"Las consultas de historias clínicas tardan demasiado en horas punta. "
                f"El personal médico reporta demoras al buscar pacientes por su número de documento en {concept}."
            )[:250],
            "opciones": [
                {
                    "texto": "Crear una estructura de búsqueda optimizada para acceso directo",
                    "correcta": True,
                    "feedback": "Excelente decisión: el acceso directo optimizado reduce lecturas de disco y acelera la atención médica.",
                },
                {
                    "texto": "Duplicar toda la tabla de pacientes en otra base de datos",
                    "correcta": False,
                    "feedback": "Incorrecto: duplicar datos sin optimizar el acceso genera redundancia severa e inconsistencias.",
                },
                {
                    "texto": "Reiniciar el servidor de base de datos cada dos horas",
                    "correcta": False,
                    "feedback": "Inadecuado: los reinicios periódicos interrumpen el servicio y no resuelven la causa raíz del cuello de botella.",
                },
            ],
        },
        {
            "id": "esc-2",
            "empresa": "Colegio San Martín (Educación)",
            "problema": (
                f"En el cierre de notas bimestrales, cientos de docentes registran calificaciones al mismo tiempo. "
                f"El sistema se congela por bloqueos concurrentes vinculados a {concept}."
            )[:250],
            "opciones": [
                {
                    "texto": "Ajustar el nivel de aislamiento y acortar la duración de las transacciones",
                    "correcta": True,
                    "feedback": "¡Correcto! Transacciones más breves reducen la contención y permiten concurrencia fluida sin bloqueos.",
                },
                {
                    "texto": "Deshabilitar las restricciones de clave foránea durante el cierre",
                    "correcta": False,
                    "feedback": "Peligroso: suspender la integridad referencial puede corromper el registro académico de los alumnos.",
                },
                {
                    "texto": "Permitir el acceso a un solo profesor a la vez durante el día",
                    "correcta": False,
                    "feedback": "Inviable: forzar acceso secuencial colapsa los plazos de entrega y genera retrasos administrativos.",
                },
            ],
        },
        {
            "id": "esc-3",
            "empresa": "Ferretería El Tornillo (Retail)",
            "problema": (
                f"El inventario diario muestra diferencias de stock porque varias cajas venden los mismos productos en paralelo "
                f"sin un control adecuado de {concept}."
            )[:250],
            "opciones": [
                {
                    "texto": "Aplicar transacciones atómicas con bloqueo por fila al descontar existencias",
                    "correcta": True,
                    "feedback": "¡Exacto! El bloqueo granular por fila garantiza consistencia de stock sin degradar las demás cajas.",
                },
                {
                    "texto": "Exportar las ventas a un archivo de texto plano y procesarlo en la noche",
                    "correcta": False,
                    "feedback": "Inadecuado: el procesamiento nocturno aplaza la detección de quiebres de inventario durante el día.",
                },
            ],
        },
        {
            "id": "esc-4",
            "empresa": "Turismo Los Andes (Viajes)",
            "problema": (
                f"Los reportes de facturación mensual consumen todos los recursos y ralentizan la venta de paquetes turísticos en línea. "
                f"El DBA debe intervenir con {concept}."
            )[:250],
            "opciones": [
                {
                    "texto": "Derivar las consultas analíticas pesadas a una réplica o vista materializada",
                    "correcta": True,
                    "feedback": "¡Muy bien! Aislar la carga analítica protege la latencia de las transacciones de venta en tiempo real.",
                },
                {
                    "texto": "Eliminar registros de ventas de años anteriores sin respaldo",
                    "correcta": False,
                    "feedback": "Grave error: borrar datos históricos sin política de retención infringe auditorías legales y tributarias.",
                },
                {
                    "texto": "Asignar la máxima prioridad del procesador a los reportes de gerencia",
                    "correcta": False,
                    "feedback": "Contraproducente: priorizar el reporte mensual ahoga todavía más la pasarela de pagos en línea.",
                },
            ],
        },
        {
            "id": "esc-5",
            "empresa": "Farmacia Central (Comercio)",
            "problema": (
                f"Un fallo eléctrico repentino interrumpió la confirmación de pagos en el servidor local. "
                f"El DBA junior debe asegurar la recuperación aplicando {concept}."
            )[:250],
            "opciones": [
                {
                    "texto": "Revisar el registro de bitácora y ejecutar la recuperación con rollback/redo",
                    "correcta": True,
                    "feedback": "¡Excelente! La bitácora transaccional garantiza la durabilidad y devuelve la base a un estado consistente.",
                },
                {
                    "texto": "Limpiar la base de datos completa e ingresar de nuevo las ventas a mano",
                    "correcta": False,
                    "feedback": "Inaceptable: borrar datos genera pérdidas financieras y horas de digitación innecesaria.",
                },
            ],
        },
    ]
    return {
        "titulo": f"Decisiones de DBA Junior: {concept}"[:70],
        "intro": (
            f"Asume el rol de DBA junior y resuelve dilemas técnicos en diferentes empresas aplicando principios de {concept}."
        )[:160],
        "escenarios": all_scenarios[:n],
        "sintesis": (
            f"Cada entorno empresarial exige evaluar el impacto operativo de {concept}: "
            f"priorizar la integridad, el aislamiento y el acceso eficiente garantiza la continuidad del negocio."
        )[:250],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=8,
    title="Juego de Roles",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
