"""EXPLORE 7 — Experimento Guiado: análisis interactivo de datos con gráfico de dispersión (scatter plot).

Permite al estudiante explorar un dataset de métricas de rendimiento en una base de datos,
filtrar series por grupo, inspeccionar puntos con coordenadas (x, y) y responder preguntas
guiadas progresivas de observación que culminan en la revelación del mecanismo subyacente.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.icons import icon
from ova_engine.schema import arr, b, i, obj, s

PARAMS = (
    Param("num_steps", 3, min=3, max=4, help="Número de pasos guiados"),
)


def schema(p: dict) -> dict:
    n = p["num_steps"]
    return obj(
        titulo=s(70),
        descripcion_dataset=s(300),
        puntos=arr(
            obj(
                x=i(),
                y=i(),
                grupo=s(30),
            ),
            12,
            20,
        ),
        preguntas=arr(
            obj(
                paso=i(),
                pregunta=s(160),
                pista=s(140),
                opciones=arr(
                    obj(
                        texto=s(90),
                        feedback=s(140),
                        correcta=b(),
                    ),
                    2,
                    3,
                ),
            ),
            min_items=n,
            max_items=n,
        ),
        revelacion=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_steps"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Instructor de laboratorio de monitoreo y rendimiento de bases de datos para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un experimento guiado de observación científica con {n} pasos progresivos para explorar «{concept}». Proporciona un dataset de métricas gráficas comparativas (ej. filas de la tabla vs costo de consulta con/sin índice, sesiones concurrentes vs tiempo de espera por bloqueos, o tasa de transacciones vs latencia de buffer pool):
- titulo: título motivador del experimento guiado (≤10 palabras).
- descripcion_dataset: descripción contextual de las métricas simuladas (de dónde provienen, ej. {d.si_oracle("trazas de V$SQL_PLAN o V$SYSSTAT", "planes de ejecución o estadísticas del motor")}, qué representa el eje X y qué representa el eje Y, ≤45 palabras).
- puntos: entre 12 y 20 mediciones numéricas. Cada punto tiene coordenadas enteras `x` e `y` y un nombre de `grupo` comparativo (ej. "Sin índice" vs "Con índice", o "Cache frío" vs "Cache caliente"). Los puntos deben formar dos o tres series claramente contrastables que revelen el impacto observable de «{concept}».
- preguntas: exactamente {n} preguntas de observación progresivas (paso 1 a {n}) que guíen al estudiante en el análisis visual del gráfico:
  * `paso`: número entero correlativo del paso (1 a {n}).
  * `pregunta`: enunciado que llama la atención sobre una tendencia, diferencia entre grupos o punto de divergencia en el gráfico (≤25 palabras).
  * `pista`: sugerencia concreta sobre en qué cuadrante, rango o grupo fijar la atención (≤20 palabras).
  * `opciones`: entre 2 y 3 opciones de respuesta; exactamente UNA con `correcta: true` y las demás `correcta: false`. Cada opción incluye `texto` (interpretación de lo observado, ≤14 palabras) y `feedback` que razona la observación (≤20 palabras).
- revelacion: explicación pedagógica clara y fundamentada que conecta el patrón visual observado con el principio de funcionamiento de «{concept}» (≤50 palabras).
[RESTRICCIONES] Las preguntas guían el razonamiento inductivo y la observación visual, no juzgan ni evalúan de forma punitiva. Sin código de programación visible ni sintaxis SQL. No generes etiquetas HTML ni menciones al esquema JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Instructor de laboratorio de observación y análisis de datos sobre «{concept}» para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un experimento guiado de observación científica con {n} pasos progresivos para explorar «{concept}». Proporciona un dataset de métricas gráficas comparativas (dos magnitudes propias del tema que el estudiante pueda comparar, con series contrastables):
- titulo: título motivador del experimento guiado (≤10 palabras).
- descripcion_dataset: descripción contextual de las métricas simuladas (de dónde provienen, qué representa el eje X y qué representa el eje Y, ≤45 palabras).
- puntos: entre 12 y 20 mediciones numéricas. Cada punto tiene coordenadas enteras `x` e `y` y un nombre de `grupo` comparativo (ej. "Condición A" vs "Condición B", con nombres propios del tema). Los puntos deben formar dos o tres series claramente contrastables que revelen el impacto observable de «{concept}».
- preguntas: exactamente {n} preguntas de observación progresivas (paso 1 a {n}) que guíen al estudiante en el análisis visual del gráfico:
  * `paso`: número entero correlativo del paso (1 a {n}).
  * `pregunta`: enunciado que llama la atención sobre una tendencia, diferencia entre grupos o punto de divergencia en el gráfico (≤25 palabras).
  * `pista`: sugerencia concreta sobre en qué cuadrante, rango o grupo fijar la atención (≤20 palabras).
  * `opciones`: entre 2 y 3 opciones de respuesta; exactamente UNA con `correcta: true` y las demás `correcta: false`. Cada opción incluye `texto` (interpretación de lo observado, ≤14 palabras) y `feedback` que razona la observación (≤20 palabras).
- revelacion: explicación pedagógica clara y fundamentada que conecta el patrón visual observado con el principio de funcionamiento de «{concept}» (≤50 palabras).
[RESTRICCIONES] Las preguntas guían el razonamiento inductivo y la observación visual, no juzgan ni evalúan de forma punitiva. Sin código de programación visible ni código. No generes etiquetas HTML ni menciones al esquema JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_steps", 3)
    base_preguntas = [
        {
            "paso": 1,
            "pregunta": f"Observa la trayectoria del grupo 'Sin optimización'. ¿Qué tendencia describe el costo a medida que crece el volumen de filas en {concept}?"[:160],
            "pista": "Fíjate en la pendiente ascendente de los puntos desde X=10 hasta X=160."[:140],
            "opciones": [
                {
                    "texto": "El costo de consulta se incrementa en proporción directa al volumen de datos.",
                    "feedback": "¡Exacto! Cada fila adicional requiere lecturas añadidas, elevando el costo.",
                    "correcta": True,
                },
                {
                    "texto": "El costo disminuye rápidamente a medida que la tabla acumula más registros.",
                    "feedback": "Incorrecto. Los puntos ascienden desde Y=15 hasta superar Y=300.",
                    "correcta": False,
                },
                {
                    "texto": "El costo permanece invariable frente a cualquier aumento en el volumen de filas.",
                    "feedback": "Incorrecto. La trayectoria muestra un aumento sustancial y sostenido.",
                    "correcta": False,
                },
            ],
        },
        {
            "paso": 2,
            "pregunta": "Compara la distancia vertical entre ambos grupos. ¿A partir de qué volumen se evidencia la mayor brecha de rendimiento?"[:160],
            "pista": "Observa la separación vertical entre los puntos en X=25 frente a X=100 y X=160."[:140],
            "opciones": [
                {
                    "texto": "A partir de X=50 filas, donde la separación de costo se amplía notablemente.",
                    "feedback": "¡Muy bien! A bajo volumen la brecha es leve, pero con alta carga se vuelve enorme.",
                    "correcta": True,
                },
                {
                    "texto": "En X=10 filas, tras lo cual ambos grupos convergen exactamente al mismo valor.",
                    "feedback": "Incorrecto. En X=10 la diferencia es de 7 puntos, mientras en X=160 supera 270.",
                    "correcta": False,
                },
            ],
        },
        {
            "paso": 3,
            "pregunta": f"¿Qué patrón describe el comportamiento del grupo 'Con optimización' para {concept}?"[:160],
            "pista": "Examina los valores de Y para el grupo optimizado: crecen lentamente de 8 a solo 32."[:140],
            "opciones": [
                {
                    "texto": "Crecimiento sublineal muy estable que mantiene bajo el consumo de recursos.",
                    "feedback": "¡Correcto! El costo apenas se cuadruplica mientras las filas crecen 16 veces.",
                    "correcta": True,
                },
                {
                    "texto": "Crecimiento desmedido que satura los búferes de memoria del servidor.",
                    "feedback": "Incorrecto. La serie optimizada se mantiene siempre en la franja baja del gráfico.",
                    "correcta": False,
                },
            ],
        },
        {
            "paso": 4,
            "pregunta": "¿Qué conclusión técnica se desprende al contrastar la dispersión entre ambos grupos?"[:160],
            "pista": "Relaciona el costo con las lecturas físicas de bloques en el subsistema de E/S."[:140],
            "opciones": [
                {
                    "texto": "La estructura optimizada previene lecturas exhaustivas, aportando predictibilidad.",
                    "feedback": "¡Correcto! Al filtrar por bloques clave, el costo deja de depender del tamaño total.",
                    "correcta": True,
                },
                {
                    "texto": "Ambas estrategias consumen la misma cantidad de lecturas físicas en disco.",
                    "feedback": "Incorrecto. La dispersión elevada refleja lecturas de bloques innecesarias.",
                    "correcta": False,
                },
            ],
        },
    ]

    puntos = [
        {"x": 10, "y": 15, "grupo": "Sin optimización"},
        {"x": 25, "y": 42, "grupo": "Sin optimización"},
        {"x": 50, "y": 88, "grupo": "Sin optimización"},
        {"x": 75, "y": 135, "grupo": "Sin optimización"},
        {"x": 100, "y": 182, "grupo": "Sin optimización"},
        {"x": 130, "y": 240, "grupo": "Sin optimización"},
        {"x": 160, "y": 305, "grupo": "Sin optimización"},
        {"x": 10, "y": 8, "grupo": "Con optimización"},
        {"x": 25, "y": 12, "grupo": "Con optimización"},
        {"x": 50, "y": 17, "grupo": "Con optimización"},
        {"x": 75, "y": 21, "grupo": "Con optimización"},
        {"x": 100, "y": 25, "grupo": "Con optimización"},
        {"x": 130, "y": 29, "grupo": "Con optimización"},
        {"x": 160, "y": 32, "grupo": "Con optimización"},
    ]

    return {
        "titulo": f"Experimento guiado: {concept}"[:70],
        "descripcion_dataset": (
            f"Métricas simuladas de costo del optimizador (CBO) frente al número de filas evaluadas para {concept}, "
            "obtenidas de trazas en V$SQL_PLAN comparando un escaneo completo frente a un acceso optimizado."
        )[:300],
        "puntos": puntos,
        "preguntas": base_preguntas[:n],
        "revelacion": (
            f"Este experimento demuestra el principio rector de {concept}: sin estructuras de optimización, el motor "
            "recorre todos los bloques con costo lineal O(N); con la estructura habilitada, el acceso se vuelve logarítmico "
            "o selectivo, garantizando tiempos de respuesta predecibles y escalables."
        )[:300],
    }


_STYLE = """
<style>
.ova-experiment-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ova-scatter-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ova-chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.group-selector-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.group-selector-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.group-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 9999px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #1e293b);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.group-btn:hover {
  background: var(--surface-2, #f1f5f9);
  border-color: var(--primary, #0A3D91);
}
.group-btn:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.group-btn.is-active {
  background: var(--surface-2, #eef2ff);
  border-color: var(--primary, #0A3D91);
  color: var(--primary, #0A3D91);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(10, 61, 145, 0.12);
}
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.scatter-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 12px;
  box-sizing: border-box;
}
.scatter-svg {
  width: 100%;
  height: auto;
  min-width: 320px;
  display: block;
}
.scatter-point {
  cursor: pointer;
  transition: r 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease;
  outline: none;
}
.scatter-point:hover,
.scatter-point:focus,
.scatter-point.is-hovered {
  r: 9.5;
  stroke: #ffffff;
  stroke-width: 3;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}
.chart-tooltip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface-2, #f8fafc);
  border-left: 4px solid var(--primary, #0A3D91);
  border-radius: 0 var(--radius, 8px) var(--radius, 8px) 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--text, #1e293b);
  min-height: 24px;
}
.tooltip-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}
.step-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.step-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--primary, #0A3D91);
}
.step-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--surface-2, #f8fafc);
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  padding: 10px 12px;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text-muted, #475569);
}
.hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.revelation-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-color: var(--primary, #0A3D91);
  background: linear-gradient(to bottom, var(--surface, #ffffff), var(--surface-2, #f8fafc));
}
.revelacion-intro {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text, #1e293b);
}
.revelacion-content {
  padding-block: 8px;
  line-height: 1.6;
  font-size: 0.95rem;
  color: var(--text, #1e293b);
}
.revelacion-content p {
  margin: 0;
}
</style>
"""


def _calculate_plot_bounds(puntos: list[dict]) -> tuple[float, float, float, float, float, float]:
    all_x: list[int] = []
    all_y: list[int] = []
    for pt in puntos:
        try:
            all_x.append(int(pt.get("x", 0)))
            all_y.append(int(pt.get("y", 0)))
        except (ValueError, TypeError):
            pass

    if not all_x:
        all_x = [0, 100]
    if not all_y:
        all_y = [0, 100]

    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)

    if min_x == max_x:
        max_x = min_x + 10
    if min_y == max_y:
        max_y = min_y + 10

    pad_x = max(1, int((max_x - min_x) * 0.08))
    pad_y = max(1, int((max_y - min_y) * 0.08))

    plot_min_x = float(max(0, min_x - pad_x) if min_x >= 0 else min_x - pad_x)
    plot_max_x = float(max_x + pad_x)
    plot_min_y = float(max(0, min_y - pad_y) if min_y >= 0 else min_y - pad_y)
    plot_max_y = float(max_y + pad_y)

    range_x = float(plot_max_x - plot_min_x or 1.0)
    range_y = float(plot_max_y - plot_min_y or 1.0)

    return plot_min_x, plot_max_x, plot_min_y, plot_max_y, range_x, range_y


def _render_svg_chart(
    puntos: list[dict],
    group_styles: dict[str, dict[str, str]],
    bounds: tuple[float, float, float, float, float, float],
) -> str:
    plot_min_x, _, plot_min_y, _, range_x, range_y = bounds
    grid_lines = []

    for i_tick in range(5):
        val_y = plot_min_y + i_tick * (range_y / 4.0)
        y_pos = 320.0 - ((val_y - plot_min_y) / range_y) * 290.0
        grid_lines.append(
            f'<line x1="65" y1="{y_pos:.1f}" x2="640" y2="{y_pos:.1f}" stroke="var(--border, #e2e8f0)" stroke-dasharray="4 4" stroke-width="1"/>'
            f'<text x="56" y="{y_pos + 4:.1f}" text-anchor="end" font-size="11" fill="var(--text-muted, #64748b)">{int(round(val_y))}</text>'
        )

    for i_tick in range(5):
        val_x = plot_min_x + i_tick * (range_x / 4.0)
        x_pos = 65.0 + ((val_x - plot_min_x) / range_x) * 575.0
        grid_lines.append(
            f'<line x1="{x_pos:.1f}" y1="30" x2="{x_pos:.1f}" y2="320" stroke="var(--border, #e2e8f0)" stroke-dasharray="4 4" stroke-width="1"/>'
            f'<text x="{x_pos:.1f}" y="340" text-anchor="middle" font-size="11" fill="var(--text-muted, #64748b)">{int(round(val_x))}</text>'
        )

    point_elements = []
    for i_pt, pt in enumerate(puntos):
        try:
            px = int(pt.get("x", 0))
            py = int(pt.get("y", 0))
        except (ValueError, TypeError):
            px, py = 0, 0
        g_raw = str(pt.get("grupo", ""))
        g_esc = esc(g_raw)
        col = group_styles.get(g_raw, {"fill": "#0A3D91"})
        cx = 65.0 + ((px - plot_min_x) / range_x) * 575.0
        cy = 320.0 - ((py - plot_min_y) / range_y) * 290.0
        point_elements.append(
            f'<circle class="scatter-point" data-idx="{i_pt + 1}" data-x="{px}" data-y="{py}" '
            f'data-group="{g_esc}" cx="{cx:.1f}" cy="{cy:.1f}" r="6.5" '
            f'fill="{col["fill"]}" stroke="#ffffff" stroke-width="2" tabindex="0" role="button" '
            f'aria-label="Punto {i_pt + 1}: {g_esc} (X={px}, Y={py})"></circle>'
        )

    return f"""<svg class="scatter-svg" viewBox="0 0 670 370" role="group" aria-label="Gráfico de dispersión con métricas de rendimiento">
  <defs>
    <clipPath id="chart-area-clip">
      <rect x="65" y="30" width="575" height="290" />
    </clipPath>
  </defs>
  {"".join(grid_lines)}
  <line x1="65" y1="30" x2="65" y2="320" stroke="var(--text-muted, #64748b)" stroke-width="1.5" />
  <line x1="65" y1="320" x2="640" y2="320" stroke="var(--text-muted, #64748b)" stroke-width="1.5" />
  <text x="352" y="362" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text, #1e293b)">Métrica X (Entrada / Volumen de carga)</text>
  <text x="18" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text, #1e293b)" transform="rotate(-90 18 175)">Métrica Y (Costo / Tiempo de respuesta)</text>
  <g id="scatter-points-group" clip-path="url(#chart-area-clip)">
    {"".join(point_elements)}
  </g>
</svg>"""


def _render_group_buttons(
    grupos: list[str],
    group_styles: dict[str, dict[str, str]],
    puntos: list[dict],
) -> str:
    buttons = [
        f'<button type="button" class="group-btn is-active" data-group="all" aria-pressed="true">'
        f'<span class="color-dot" style="background:#475569"></span>'
        f'<span>Todos ({len(puntos)})</span>'
        f'</button>'
    ]
    for g in grupos:
        col = group_styles.get(g, {"stroke": "#0A3D91"})
        count = sum(1 for pt in puntos if str(pt.get("grupo", "")) == g)
        g_esc = esc(g)
        buttons.append(
            f'<button type="button" class="group-btn" data-group="{g_esc}" aria-pressed="false">'
            f'<span class="color-dot" style="background:{col["stroke"]}"></span>'
            f'<span>{g_esc} ({count})</span>'
            f'</button>'
        )
    return "".join(buttons)


def _render_steps(preguntas: list[dict], num_steps: int) -> str:
    steps_html = []
    for k, q in enumerate(preguntas, 1):
        step_num = int(q.get("paso", k))
        choices = "".join(
            f'<upao-choice group="step-{step_num}" value="{chr(65 + opt_idx)}" '
            f'correct="{str(bool(opt.get("correcta", False))).lower()}" '
            f'feedback="{esc(opt.get("feedback", ""))}">'
            f'<strong>{chr(65 + opt_idx)}.</strong> {esc(opt.get("texto", ""))}'
            f'</upao-choice>'
            for opt_idx, opt in enumerate(q.get("opciones", []))
        )
        hidden_attr = "" if k == 1 else " hidden"
        badge_label = f"Paso {step_num} de {num_steps}"
        steps_html.append(
            f'<section class="ova-card step-card" id="step-card-{step_num}" data-step="{step_num}"{hidden_attr} aria-labelledby="step-title-{step_num}">'
            f'  <div class="step-card-header">'
            f'    <span class="ova-badge" id="step-badge-{step_num}">{esc(badge_label)}</span>'
            f'    <h2 id="step-title-{step_num}" class="step-title">Observación guiada #{step_num}</h2>'
            f'  </div>'
            f'  <upao-question number="{step_num}" prompt="{esc(q.get("pregunta", ""))}">'
            f'    {choices}'
            f'  </upao-question>'
            f'  <div class="step-hint">'
            f'    <span class="hint-icon" aria-hidden="true">{icon("bulb")}</span>'
            f'    <span class="hint-text"><strong>Pista:</strong> {esc(q.get("pista", ""))}</span>'
            f'  </div>'
            f'</section>'
        )
    return "".join(steps_html)


def render(data: dict, ctx: RenderContext) -> str:
    preguntas = data.get("preguntas", [])
    num_steps = len(preguntas)
    puntos = data.get("puntos", [])

    bounds = _calculate_plot_bounds(puntos)
    grupos = list(dict.fromkeys(str(p.get("grupo", "")) for p in puntos))
    palette = [
        {"stroke": "#0A3D91", "fill": "#0A3D91", "bg": "#e0f2fe"},
        {"stroke": "#d97706", "fill": "#d97706", "bg": "#fef3c7"},
        {"stroke": "#059669", "fill": "#059669", "bg": "#d1fae5"},
        {"stroke": "#7c3aed", "fill": "#7c3aed", "bg": "#ede9fe"},
        {"stroke": "#dc2626", "fill": "#dc2626", "bg": "#fee2e2"},
    ]
    group_styles = {g: palette[idx % len(palette)] for idx, g in enumerate(grupos)}

    chart_svg = _render_svg_chart(puntos, group_styles, bounds)
    group_buttons_html = _render_group_buttons(grupos, group_styles, puntos)
    steps_html = _render_steps(preguntas, num_steps)
    concept_name = esc(ctx.concept if ctx and ctx.concept else "el concepto")

    return f"""{_STYLE}
<upao-header eyebrow="EXPERIMENTO GUIADO" title="{esc(data.get("titulo", ""))}"><p>{esc(data.get("descripcion_dataset", ""))}</p></upao-header>

<upao-progress id="prog" current="0" total="{num_steps}" label="Progreso del experimento" show-fraction></upao-progress>

<div class="ova-experiment-layout">
  <section class="ova-card ova-scatter-card" aria-label="Visualización del experimento">
    <div class="ova-chart-controls">
      <div class="group-selector-bar" role="group" aria-label="Filtrar por grupo">
        <span class="group-selector-label">Series:</span>
        {group_buttons_html}
      </div>
    </div>

    <div class="scatter-container" role="region" aria-label="Gráfico de dispersión interactivo" tabindex="0">
      {chart_svg}
    </div>

    <div id="chart-tooltip" class="chart-tooltip-box" aria-live="polite">
      <span class="tooltip-icon" aria-hidden="true">{icon('target')}</span>
      <span id="tooltip-text">Pasa el cursor o selecciona un punto del gráfico para inspeccionar sus métricas.</span>
    </div>
  </section>

  <div class="ova-steps-container">
    {steps_html}
  </div>

  <section class="ova-card revelation-card" id="revelacion-card" hidden aria-labelledby="revelacion-title">
    <div class="step-card-header">
      <span class="ova-badge">Conclusión Científica</span>
      <h2 id="revelacion-title" class="step-title">Revelación: Principio Operativo</h2>
    </div>
    <p class="revelacion-intro">¡Excelente trabajo de deducción visual! Este es el principio que fundamenta las mediciones:</p>
    <upao-reveal id="upao-rev" label="Ver fundamento del experimento" icon="{esc(icon('microscope'))}">
      <div class="revelacion-content">
        <p>{esc(data.get("revelacion", ""))}</p>
      </div>
    </upao-reveal>
  </section>

  <upao-summary title="Síntesis y Transferencia">
    <p>El análisis empírico de métricas gráficas permite predecir el impacto de <strong>{concept_name}</strong> en entornos de alta demanda.</p>
    <upao-complete slot="actions" label="Finalizar experimento" locked></upao-complete>
  </upao-summary>
</div>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script('''
(function () {
  const answeredSteps = new Set();
  const progEl = document.getElementById('prog');
  const total = progEl ? parseInt(progEl.getAttribute('total') || '3', 10) : 3;
  const revCard = document.getElementById('revelacion-card');
  const revComp = document.getElementById('upao-rev');

  function completeStep(stepIdx) {
    if (!stepIdx || isNaN(stepIdx)) return;

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('step-' + stepIdx);
    }

    answeredSteps.add(stepIdx);

    const nextCard = document.getElementById('step-card-' + (stepIdx + 1));
    if (nextCard) {
      nextCard.hidden = false;
    }

    if (answeredSteps.size >= total) {
      if (revCard) {
        revCard.hidden = false;
        revCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (revComp && typeof revComp.reveal === 'function') {
        revComp.reveal();
      }
    }
  }

  document.addEventListener('upao-choice-selected', function (e) {
    const group = (e.detail && e.detail.group) || '';
    if (group.startsWith('step-')) {
      const idx = parseInt(group.replace('step-', ''), 10);
      completeStep(idx);
    }
  });

  document.addEventListener('click', function (e) {
    const choice = e.target && e.target.closest && e.target.closest('upao-choice');
    if (choice) {
      const group = choice.getAttribute('group') || '';
      if (group.startsWith('step-')) {
        const idx = parseInt(group.replace('step-', ''), 10);
        completeStep(idx);
      }
    }
  });

  const groupBtns = document.querySelectorAll('.group-btn');
  const points = document.querySelectorAll('.scatter-point');
  const tooltipText = document.getElementById('tooltip-text');

  groupBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      groupBtns.forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');

      const selected = btn.getAttribute('data-group');
      points.forEach(function (pt) {
        const ptGroup = pt.getAttribute('data-group');
        if (selected === 'all' || ptGroup === selected) {
          pt.style.opacity = '1';
          pt.style.pointerEvents = 'auto';
        } else {
          pt.style.opacity = '0.15';
          pt.style.pointerEvents = 'none';
        }
      });
    });
  });

  function inspectPoint(pt) {
    if (!pt) return;
    const x = pt.getAttribute('data-x');
    const y = pt.getAttribute('data-y');
    const group = pt.getAttribute('data-group');
    const idx = pt.getAttribute('data-idx');

    points.forEach(function (p) {
      p.classList.remove('is-hovered');
    });
    pt.classList.add('is-hovered');

    if (tooltipText) {
      tooltipText.textContent = 'Punto #' + idx + ' [' + group + ']: X = ' + x + ', Y = ' + y;
    }
  }

  points.forEach(function (pt) {
    pt.addEventListener('mouseenter', function () {
      inspectPoint(pt);
    });
    pt.addEventListener('focus', function () {
      inspectPoint(pt);
    });
    pt.addEventListener('click', function () {
      inspectPoint(pt);
    });
    pt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inspectPoint(pt);
      }
    });
  });
})();
''')}
"""


SPEC = TemplateSpec(
    phase="explore",
    rt=7,
    title="Experimento Guiado",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
