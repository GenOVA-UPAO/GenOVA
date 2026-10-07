"""EXPLAIN 2 — Lectura Guiada: lectura académica estructurada con ejemplos razonados en Oracle.

Presenta una lectura guiada universitaria organizada en secciones conceptuales desplegables
con upao-node, preguntas formativas de comprobación con respuesta modelo en upao-reveal,
un panel de aplicación práctica para el DBA en Oracle y control de progreso con upao-progress.
"""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param("num_sections", 3, min=3, max=4, help="Número de secciones de la lectura"),
)


def schema(p: dict) -> dict:
    n = p["num_sections"]
    sch = obj(
        titulo=s(70),
        introduccion=s(300),
        secciones=arr(
            obj(
                subtitulo=s(60),
                idea_central=s(250),
                ejemplo_razonado=s(250),
                pregunta_comprobacion=s(180),
                respuesta_modelo=s(200),
            ),
            min_items=n,
            max_items=n,
        ),
        aplicacion_practica=s(300),
        cierre=s(250),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_sections"]
    return f"""[ROL] {d.pick("Docente universitario y redactor académico de sistemas de bases de datos.", "Docente experto y redactor didáctico para " + d.audiencia + ".")}
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Redacta una lectura académica guiada, accesible y estructurada sobre «{concept}», {d.pick(f"de nivel universitario, orientada a casos reales con {d.si_oracle('el motor Oracle Database', 'un SGBD relacional')}", "adecuada para " + d.audiencia + ", orientada a casos reales y cotidianos del tema")}. La lectura debe evitar fórmulas matemáticas complejas y explicar los mecanismos mediante razonamiento técnico y analogías claras.
- titulo: título académico claro y conciso de la lectura guiada (≤10 palabras).
- introduccion: contextualización accesible del concepto mediante un caso o situación real {d.pick(f"en entornos {d.bd_adj}", "propio del tema")} (≤45 palabras).
- imagen (opcional): elemento visual estructurado según el concepto:
  * usa "foto" ÚNICAMENTE para objetos físicos concretos, hardware, servidores o datacenters tangibles (NUNCA para abstracciones o algoritmos).
  * usa "diagrama" para conceptos abstractos, procesos o estructuras, incluyendo el objeto `diagrama` (tipo: "flujo"|"arbol"|"capas"|"er"|"secuencia"|"comparacion", titulo, nodos, aristas).
  * usa "logo" para marcas o tecnologías reconocidas (ej. {d.pick(d.si_oracle("Oracle", "PostgreSQL"), "una marca o institución del tema")}).
  * usa "escena" para ilustraciones pedagógicas de la situación.
  Incluye {{"tipo": "foto"|"diagrama"|"logo"|"escena", "descripcion": "...", "consulta": "..." (en inglés)}}.
- secciones: exactamente {n} secciones temáticas estructuradas con progresión pedagógica. Cada sección contiene:
  * `subtitulo`: nombre conceptual de la sección o aspecto abordado (≤8 palabras).
  * `idea_central`: explicación teórica clara y rigurosa sin fórmulas complejas ni abstracciones excesivas (≤35 palabras).
  * `ejemplo_razonado`: caso práctico y razonado {d.pick(d.si_oracle("en Oracle", "en un SGBD relacional"), "propio del tema")} que ilustra el funcionamiento real (≤35 palabras).
  * `pregunta_comprobacion`: pregunta formativa de autoevaluación para que el estudiante reflexione y compruebe su comprensión (≤25 palabras).
  * `respuesta_modelo`: respuesta explicativa modelo que argumenta la solución a la pregunta (≤30 palabras).
- aplicacion_practica: {d.pick(f"aplicación concreta y operativa para el Administrador de Base de Datos (DBA), indicando sentencias SQL{d.si_oracle('/PLSQL', '')}, parámetros o vistas del diccionario{d.si_oracle(' Oracle (p. ej. vistas V$ o DBA_*)', '')} y su relevancia operativa", "aplicación concreta del concepto en " + d.practica + ", con pasos o situaciones reales y por qué importa")} (≤45 palabras).
- cierre: síntesis pedagógica final que consolida los aprendizajes clave de la lectura (≤35 palabras).
[RESTRICCIONES] Sin fórmulas matemáticas complejas ni jerga críptica innecesaria. Cada sección debe tener rigor conceptual y conexión práctica {d.pick(d.si_oracle("con Oracle", "con el tema"), "con el tema y el nivel indicados")}. No generes HTML ni menciones la especificación JSON Schema.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-reading-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ova-card {
  background: var(--surface, #FFFFFF);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: var(--radius, 12px);
  padding: clamp(16px, 3vw, 24px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,.04));
}
.intro-card {
  border-left: 4px solid var(--primary, #0A3D91);
}
.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.badge-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EEF2FF);
  padding: 3px 8px;
  border-radius: 4px;
}
.card-title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.card-body-text {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.65;
  color: var(--text, #1E293B);
}

.reading-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-tint, #F0F4FA);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: var(--radius-sm, 8px);
}
.toolbar-hint {
  font-size: 0.88rem;
  color: var(--text-muted, #64748B);
  font-weight: 500;
}
.btn-toggle-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: var(--surface, #FFFFFF);
  color: var(--primary, #0A3D91);
  border: 1.5px solid var(--primary, #0A3D91);
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;
  touch-action: manipulation;
}
.btn-toggle-all:hover {
  background: var(--primary, #0A3D91);
  color: #FFFFFF;
}
.btn-toggle-all:focus-visible {
  outline: 3px solid var(--action, #F47A20);
  outline-offset: 2px;
}

.sec-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 6px;
}
.sec-card {
  border-radius: var(--radius-sm, 8px);
  padding: 14px 16px;
  border: 1px solid var(--border, #E2E8F0);
}
.sec-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sec-card-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 7px;
}
.tag-idea {
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #E0E7FF);
}
.tag-ejemplo {
  color: var(--info, #0369A1);
  background: var(--info-bg, #E0F2FE);
}
.tag-pregunta {
  color: var(--warning, #B45309);
  background: var(--warning-bg, #FEF3C7);
}

.sec-idea-card {
  background: var(--surface-tint, #F0F4FA);
  border-left: 4px solid var(--primary, #0A3D91);
}
.sec-ejemplo-card {
  background: var(--surface-2, #F8FAFC);
  border-left: 4px solid #0284C7;
}
.sec-check-card {
  background: var(--warning-bg, #FFFDF5);
  border-left: 4px solid var(--action, #F47A20);
}
.sec-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text, #1E293B);
}
.sec-question {
  margin: 0 0 12px;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text, #1E293B);
}
.sec-model-ans {
  font-size: 0.92rem;
  line-height: 1.6;
}
.sec-model-ans strong {
  display: block;
  color: var(--primary, #0A3D91);
  margin-bottom: 4px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.sec-model-ans p {
  margin: 0;
}

.dba-panel {
  border: 2px solid var(--primary, #0A3D91);
  background: linear-gradient(180deg, var(--surface, #FFFFFF) 0%, var(--surface-tint, #F8FAFC) 100%);
}
.dba-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.dba-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary, #0A3D91);
  color: #FFFFFF;
  font-size: 1.25rem;
  flex-shrink: 0;
}
.dba-eyebrow {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--action, #F47A20);
  margin-bottom: 2px;
}
.dba-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.dba-body {
  font-size: 0.96rem;
  line-height: 1.65;
  color: var(--text, #1E293B);
}
.dba-body p {
  margin: 0 0 12px;
}
.dba-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface-tint, #EEF2FF);
  border-radius: var(--radius-sm, 8px);
  border: 1px dashed var(--primary, #0A3D91);
  font-size: 0.88rem;
  color: var(--primary, #0A3D91);
}
.dba-tip-icon {
  flex-shrink: 0;
  font-size: 1.1rem;
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    d = domain_for(ctx.concept)
    sections = data["secciones"]
    n = len(sections)

    nodes_html = []
    for idx, sec in enumerate(sections, 1):
        nodes_html.append(
            f'<upao-node id="sec-node-{idx}" data-idx="{idx}" number="{idx}" '
            f'title="{esc(sec["subtitulo"])}" label="Sección {idx}">'
            f'<div class="sec-body">'
            f'<div class="sec-card sec-idea-card">'
            f'<div class="sec-card-header">'
            f'<span class="sec-card-tag tag-idea" aria-hidden="true">{icon("bulb")} Idea Central</span>'
            f'</div>'
            f'<p class="sec-text">{esc(sec["idea_central"])}</p>'
            f'</div>'
            f'<div class="sec-card sec-ejemplo-card">'
            f'<div class="sec-card-header">'
            f'<span class="sec-card-tag tag-ejemplo" aria-hidden="true">{icon("search")} Ejemplo Razonado{d.si_oracle(" (Oracle)", "")}</span>'
            f'</div>'
            f'<p class="sec-text">{esc(sec["ejemplo_razonado"])}</p>'
            f'</div>'
            f'<div class="sec-card sec-check-card">'
            f'<div class="sec-card-header">'
            f'<span class="sec-card-tag tag-pregunta" aria-hidden="true">{icon("question")} Comprobación de Aprendizaje</span>'
            f'</div>'
            f'<p class="sec-question">{esc(sec["pregunta_comprobacion"])}</p>'
            f'<upao-reveal class="sec-reveal" data-sec="{idx}" label="Comprobar respuesta modelo" icon="✓">'
            f'<div class="sec-model-ans">'
            f'<strong>Respuesta modelo fundamentada:</strong>'
            f'<p>{esc(sec["respuesta_modelo"])}</p>'
            f'</div>'
            f'</upao-reveal>'
            f'</div>'
            f'</div>'
            f'</upao-node>'
        )

    sections_str = "".join(nodes_html)

    reading_js = """
(function () {
  const btnToggleAll = document.getElementById('btn-toggle-all');
  const toggleIcon = document.getElementById('toggle-all-icon');
  const toggleText = document.getElementById('toggle-all-text');
  let allOpen = false;

  function updateToggleState() {
    const nodes = document.querySelectorAll('upao-node');
    let openCount = 0;
    nodes.forEach(function (node) {
      if (node.shadowRoot) {
        const wrap = node.shadowRoot.querySelector('.wrap');
        if (wrap && wrap.hasAttribute('open')) {
          openCount++;
        }
      }
    });
    if (nodes.length > 0 && openCount === nodes.length) {
      allOpen = true;
      if (toggleIcon) toggleIcon.innerHTML = ovaIcon('folder');
      if (toggleText) toggleText.textContent = 'Plegar todas las secciones';
      if (btnToggleAll) btnToggleAll.setAttribute('aria-expanded', 'true');
    } else if (openCount === 0) {
      allOpen = false;
      if (toggleIcon) toggleIcon.innerHTML = ovaIcon('folder-open');
      if (toggleText) toggleText.textContent = 'Abrir todas las secciones';
      if (btnToggleAll) btnToggleAll.setAttribute('aria-expanded', 'false');
    }
  }

  document.addEventListener('upao-node-toggle', function (e) {
    const node = e.target.closest('upao-node') || e.target;
    if (!node) return;
    const idx = node.getAttribute('data-idx');
    if (e.detail && e.detail.open && idx && typeof window.ovaMark === 'function') {
      window.ovaMark('sec-' + idx);
    }
    updateToggleState();
  });

  document.addEventListener('click', function (e) {
    const path = e.composedPath ? e.composedPath() : [];
    const rev = path.find(function (el) {
      return el.tagName && el.tagName.toLowerCase() === 'upao-reveal';
    }) || (e.target && e.target.closest ? e.target.closest('upao-reveal') : null);

    if (rev) {
      const idx = rev.getAttribute('data-sec');
      if (idx && typeof window.ovaMark === 'function') {
        window.ovaMark('sec-' + idx);
      }
    }
  });

  if (btnToggleAll) {
    btnToggleAll.addEventListener('click', function () {
      allOpen = !allOpen;
      const nodes = document.querySelectorAll('upao-node');
      nodes.forEach(function (node) {
        const idx = node.getAttribute('data-idx');
        if (node.shadowRoot) {
          const wrap = node.shadowRoot.querySelector('.wrap');
          const head = node.shadowRoot.querySelector('.head');
          if (wrap && head) {
            const isOpen = wrap.hasAttribute('open');
            if (allOpen && !isOpen) {
              head.click();
            } else if (!allOpen && isOpen) {
              head.click();
            }
          }
        }
        if (allOpen && idx && typeof window.ovaMark === 'function') {
          window.ovaMark('sec-' + idx);
        }
      });
      if (toggleIcon) toggleIcon.innerHTML = allOpen ? ovaIcon('folder') : ovaIcon('folder-open');
      if (toggleText) toggleText.textContent = allOpen ? 'Plegar todas las secciones' : 'Abrir todas las secciones';
      btnToggleAll.setAttribute('aria-expanded', String(allOpen));
    });
  }
})();
"""

    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Arquitectura de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""{_STYLE}{IMAGE_FIGURE_CSS}
<div class="ova-reading-container">
  <upao-header eyebrow="LECTURA GUIADA" title="{esc(data["titulo"])}">
    <p>Lectura analítica estructurada: explora cada sección conceptual, analiza el ejemplo razonado{d.si_oracle(" en Oracle", "")} y comprueba tu comprensión.</p>
  </upao-header>

  <upao-progress id="prog" current="0" total="{n}" label="Progreso de la lectura" show-fraction></upao-progress>

  <section class="ova-card intro-card" aria-labelledby="intro-heading">
    <div class="card-badge">
      <span class="badge-tag">Contexto y Motivación</span>
    </div>
    <h2 id="intro-heading" class="card-title">Introducción al Caso Real</h2>
    <p class="card-body-text">{esc(data["introduccion"])}</p>
    {fig_html}
  </section>

  <div class="reading-toolbar" role="region" aria-label="Controles de lectura">
    <span class="toolbar-hint">Despliega cada sección para avanzar en la lectura y comprobar respuestas.</span>
    <button type="button" id="btn-toggle-all" class="btn-toggle-all" aria-expanded="false">
      <span id="toggle-all-icon" class="btn-icon" aria-hidden="true">{icon('folder-open')}</span>
      <span id="toggle-all-text">Abrir todas las secciones</span>
    </button>
  </div>

  <div class="reading-sections" role="region" aria-label="Secciones de la lectura guiada">
    {sections_str}
  </div>

  <section class="ova-card dba-panel" aria-labelledby="dba-panel-heading">
    <div class="dba-header">
      <span class="dba-icon-badge" aria-hidden="true">{icon('tools')}</span>
      <div>
        <span class="dba-eyebrow">{d.pick("EN PRODUCCIÓN · ROL DBA", "EN LA PRÁCTICA")}</span>
        <h2 id="dba-panel-heading" class="dba-title">{d.pick3("Aplicación Concreta para el DBA (Oracle)", "Aplicación concreta para el DBA", "Aplicación concreta en " + d.practica)}</h2>
      </div>
    </div>
    <div class="dba-body">
      <p>{esc(data["aplicacion_practica"])}</p>
      <div class="dba-tip">
        <span class="dba-tip-icon" aria-hidden="true">{icon('bulb')}</span>
        <span>{d.pick("<strong>Buenas prácticas del DBA:</strong> Consulta periódicamente el diccionario de datos y las vistas de rendimiento dinámico (<code>V$</code> y <code>DBA_*</code>) para auditar el impacto en memoria y almacenamiento.", "<strong>Consejo:</strong> repasa esta aplicación con tus propias palabras y busca un ejemplo nuevo en tu entorno.")}</span>
      </div>
    </div>
  </section>

  <upao-summary title="Síntesis y Cierre de la Lectura">
    <p>{esc(data["cierre"])}</p>
    <upao-complete slot="actions" label="Finalizar lectura" locked></upao-complete>
  </upao-summary>
  {credits_sec}
</div>
{script(PROGRESS_JS)}
{script(reading_js)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_sections", 3)
    base_secciones = [
        {
            "subtitulo": f"Fundamento operativo de {concept}"[:60],
            "idea_central": (
                f"{concept} coordina el procesamiento eficiente de datos organizando bloques en memoria y disco, "
                "asegurando consistencia transaccional y alto rendimiento operativo."
            )[:250],
            "ejemplo_razonado": (
                "En una base de datos Oracle con alta concurrencia, las sesiones leen bloques desde el Buffer Cache "
                "para evitar operaciones lentas de E/S en disco."
            )[:250],
            "pregunta_comprobacion": (
                "¿Por qué el motor de base de datos prioriza atender las lecturas desde la memoria RAM en lugar del almacenamiento en disco?"
            )[:180],
            "respuesta_modelo": (
                "Porque la latencia de memoria RAM es órdenes de magnitud menor que la de disco, reduciendo cuellos de botella de entrada y salida."
            )[:200],
        },
        {
            "subtitulo": "Mecanismos de aislamiento y concurrencia"[:60],
            "idea_central": (
                "Para permitir múltiples transacciones simultáneas sin anomalías, se aplican mecanismos de control de concurrencia "
                "y registros de rollback estructurados."
            )[:250],
            "ejemplo_razonado": (
                "Cuando un usuario ejecuta un UPDATE masivo en Oracle, los segmentos de Undo garantizan que otras sesiones "
                "sigan leyendo datos consistentes sin bloqueos."
            )[:250],
            "pregunta_comprobacion": (
                "¿Qué beneficio proporciona el mecanismo de consistencia de lectura multiversión (MVCC) ante consultas concurrentes?"
            )[:180],
            "respuesta_modelo": (
                "Evita que las transacciones de modificación bloqueen las operaciones de solo lectura y viceversa, maximizando la concurrencia global."
            )[:200],
        },
        {
            "subtitulo": "Optimización y acceso eficiente"[:60],
            "idea_central": (
                "El optimizador de consultas determina la ruta más económica calculando costos estimados "
                "según las estadísticas de las tablas e índices involucrados."
            )[:250],
            "ejemplo_razonado": (
                "Al filtrar por ID único en una tabla de un millón de registros, Oracle utiliza una búsqueda indexada por clave única "
                "en lugar de un escaneo completo."
            )[:250],
            "pregunta_comprobacion": (
                "¿Bajo qué condición un escaneo completo de tabla (Full Table Scan) resulta más eficiente que el uso de un índice?"
            )[:180],
            "respuesta_modelo": (
                "Cuando la consulta debe procesar una fracción muy alta de las filas de la tabla, aprovechando la lectura secuencial multirrecinto."
            )[:200],
        },
        {
            "subtitulo": "Persistencia y recuperación ante incidentes"[:60],
            "idea_central": (
                "Toda modificación confirmada debe quedar registrada en bitácoras secuenciales para garantizar durabilidad "
                "y reconstruir el estado ante caídas imprevistas."
            )[:250],
            "ejemplo_razonado": (
                "Tras un corte imprevisto de suministro eléctrico, el proceso de fondo SMON aplica los archivos de Redo Log "
                "para recuperar las transacciones confirmadas."
            )[:250],
            "pregunta_comprobacion": (
                "¿Cuál es el rol esencial de los archivos Redo Log durante el inicio de la base de datos tras una caída anormal?"
            )[:180],
            "respuesta_modelo": (
                "Permiten rehacer (roll-forward) todas las transacciones confirmadas que estaban en memoria pero aún no se habían escrito físicamente en los datafiles."
            )[:200],
        },
    ]

    return {
        "titulo": f"Lectura guiada: {concept} en Oracle"[:70],
        "introduccion": (
            f"En infraestructuras empresariales con Oracle Database, dominar {concept} es fundamental para garantizar alta disponibilidad "
            "y tiempos de respuesta óptimos. Analizaremos su funcionamiento mediante casos prácticos y razonamiento técnico."
        )[:300],
        "imagen": {
            "tipo": "foto",
            "descripcion": f"Infografía técnica y arquitectura de {concept} en base de datos",
            "consulta": f"{concept} database architecture",
        },
        "secciones": base_secciones[:n],
        "aplicacion_practica": (
            f"El DBA supervisa {concept} mediante vistas como V$SQL, V$SESSION y V$SYSTEM_EVENT, analizando eventos de espera "
            "y ajustando parámetros con ALTER SYSTEM o recopilando estadísticas con DBMS_STATS para optimizar el rendimiento del motor."
        )[:300],
        "cierre": (
            f"El dominio de {concept} permite al DBA diagnosticar cuellos de botella, configurar planes de ejecución eficientes "
            "y preservar la integridad transaccional en bases de datos empresariales de misión crítica."
        )[:250],
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=2,
    title="Lectura Guiada",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
