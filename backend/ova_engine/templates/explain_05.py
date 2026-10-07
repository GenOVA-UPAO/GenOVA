"""EXPLAIN 5 — Demo Animada: demostración secuencial interactiva de un proceso interno.

Permite al estudiante visualizar el flujo paso a paso de un proceso interno del motor
de base de datos (por ejemplo, el ciclo de una transacción, parsing en Shared Pool,
Buffer Cache, Redo Log, confirmación Commit y persistencia diferida por DBWn/LGWR),
con animación reactiva del flujo de datos entre componentes, controles de reproducción
y seguimiento del estado de los datos.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.icons import icon
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param("num_steps", 5, min=3, max=6, help="Número de pasos del proceso animado"),
)


def schema(p: dict) -> dict:
    n = p.get("num_steps", 5)
    return obj(
        titulo=s(70),
        objetivo=s(160),
        pasos=arr(
            obj(
                paso=i(),
                titulo=s(50),
                descripcion=s(200),
                componente_activo=s(40),
                estado_datos=s(100),
            ),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p.get("num_steps", 5)
    return f"""[ROL] Diseñador de demostraciones didácticas {d.pick("de arquitectura de sistemas de bases de datos", "sobre «" + concept + "»")} para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Diseña una demostración animada y secuencial del flujo de un proceso {d.pick("interno del motor de base de datos", "propio del tema")} relacionado con «{concept}»{d.pick(" (por ejemplo: el ciclo de vida de una transacción pasando por parsing en Shared Pool -> búsqueda y modificación en Buffer Cache -> registro secuencial en Redo Log Buffer -> confirmación Commit y persistencia diferida por LGWR/DBWn)", "")}. La secuencia debe tener exactamente {n} pasos cronológicos:
- titulo: título representativo del proceso demostrado (≤10 palabras).
- objetivo: meta formativa observable de lo que el estudiante comprenderá al presenciar la animación (≤25 palabras).
- pasos: exactamente {n} etapas ordenadas cronológicamente. Por cada paso:
  * paso: número correlativo entero (1 a {n}).
  * titulo: nombre descriptivo y conciso de la etapa o acción técnica (≤7 palabras).
  * descripcion: explicación detallada de qué ocurre internamente, por qué se ejecuta esta acción y qué mecanismo interviene (≤30 palabras).
  * componente_activo: estructura de memoria, proceso de fondo o almacenamiento protagonista de esta etapa {d.pick("(ej. 'Shared Pool', 'Buffer Cache', 'Redo Log Buffer', 'LGWR', 'DBWn', 'Datafiles', ≤5 palabras)", "(un órgano, actor, objeto o parte del sistema del tema, ≤5 palabras)")}.
  * estado_datos: estado transitorio y preciso de los datos o de la transacción en este instante {d.pick("(ej. 'Sentencia parseada en memoria', 'Bloque modificado (dirty buffer)', 'Transacción confirmada en disco', ≤15 palabras)", "(ej. el estado de la sustancia, la cantidad o el objeto en ese instante, ≤15 palabras)")}.
- sintesis: conclusión pedagógica que resuma la lógica y beneficio del flujo completo del proceso (≤35 palabras).
[RESTRICCIONES] TODOS los pasos deben pertenecer al proceso de «{concept}»; no cambies a otro proceso aunque sea del mismo curso. Proceso estrictamente cronológico y técnicamente verosímil para «{concept}». No generes código web ni etiquetas de formato. No menciones el esquema JSON.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_steps", 5)
    base_steps = [
        {
            "titulo": "Parsing y validación sintáctica",
            "descripcion": (
                f"El motor recibe la instrucción sobre {concept} en el Shared Pool, "
                "valida la sintaxis, comprueba permisos y genera o reutiliza el plan "
                "de ejecución compilado en la Library Cache."
            ),
            "componente_activo": "Shared Pool (Parser)",
            "estado_datos": "Sentencia analizada; plan compilado en memoria",
        },
        {
            "titulo": "Lectura y carga en Buffer Cache",
            "descripcion": (
                f"El motor busca los bloques de datos de {concept} en memoria. "
                "Si no están en el Buffer Cache, ejecuta una lectura física desde "
                "el disco hacia búferes limpios compartidos."
            ),
            "componente_activo": "Database Buffer Cache",
            "estado_datos": "Bloques cargados en memoria compartida (Clean Buffers)",
        },
        {
            "titulo": "Registro preventivo en Redo Log",
            "descripcion": (
                f"Antes de alterar los datos de {concept}, se escribe el vector de cambio "
                "en el Redo Log Buffer para garantizar la recuperación ante caídas "
                "siguiendo la regla de Write-Ahead Logging."
            ),
            "componente_activo": "Redo Log Buffer",
            "estado_datos": "Vector de cambio registrado en memoria de redo",
        },
        {
            "titulo": "Modificación del bloque en memoria",
            "descripcion": (
                f"Se actualizan las filas de {concept} en el búfer de memoria. "
                "El bloque pasa a considerarse sucio (dirty buffer) hasta que sea "
                "sincronizado con el almacenamiento físico."
            ),
            "componente_activo": "Buffer Cache (Dirty)",
            "estado_datos": "Bloque marcado como sucio; cambio visible en memoria",
        },
        {
            "titulo": "Confirmación y vaciado síncrono (Commit)",
            "descripcion": (
                "Al confirmarse la transacción, el proceso LGWR descarga de inmediato "
                "los registros de redo a los archivos en disco, garantizando la "
                "durabilidad ACID antes de responder al cliente."
            ),
            "componente_activo": "Proceso LGWR y Redo Logs",
            "estado_datos": "Transacción confirmada y durable en disco físico",
        },
        {
            "titulo": "Sincronización diferida (DBWn)",
            "descripcion": (
                f"De forma asíncrona y desvinculada del Commit, el proceso DBWn "
                f"escribe los bloques sucios de {concept} hacia los Datafiles "
                "en disco durante el checkpoint, optimizando la E/S."
            ),
            "componente_activo": "Proceso DBWn y Datafiles",
            "estado_datos": "Bloques persistidos en almacenamiento permanente",
        },
    ]

    selected = base_steps[:n]
    pasos = [
        {
            "paso": k + 1,
            "titulo": step["titulo"][:50],
            "descripcion": step["descripcion"][:200],
            "componente_activo": step["componente_activo"][:40],
            "estado_datos": step["estado_datos"][:100],
        }
        for k, step in enumerate(selected)
    ]

    return {
        "titulo": f"Flujo de ejecución y persistencia de {concept}"[:70],
        "objetivo": (
            f"Comprender la secuencia interna que sigue una operación en {concept}, "
            "desde memoria hasta su persistencia duradera en disco."
        )[:160],
        "pasos": pasos,
        "sintesis": (
            f"La arquitectura modular de {concept} separa la durabilidad inmediata en Redo Logs "
            "de la escritura asíncrona en Datafiles, garantizando consistencia ACID "
            "y máximo rendimiento concurrente."
        )[:250],
    }


_STYLE = """
<style>
.demo-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 20px);
}
.demo-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 20px;
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
}
.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.demo-ctrls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.demo-ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1.5px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #15233b);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.demo-ctrl-btn:hover:not(:disabled) {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #eaf0fb);
  color: var(--primary, #0A3D91);
}
.demo-ctrl-btn:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.demo-ctrl-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.demo-ctrl-btn.btn-play {
  background: var(--primary, #0A3D91);
  border-color: var(--primary, #0A3D91);
  color: #ffffff;
}
.demo-ctrl-btn.btn-play:hover:not(:disabled) {
  background: #082f70;
  border-color: #082f70;
  color: #ffffff;
}
.demo-ctrl-btn.btn-play.is-playing {
  background: var(--accent, #F47A20);
  border-color: var(--accent, #F47A20);
  color: #ffffff;
}
.demo-status-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.demo-step-pill {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-muted, #5a6b85);
  background: var(--surface-tint, #eaf0fb);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border, #e2e8f0);
}
.demo-figure {
  margin: 0;
  width: 100%;
}
.demo-svg-container {
  width: 100%;
  background: var(--surface-2, #f8fafc);
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 12px;
  box-sizing: border-box;
}
.demo-svg {
  width: 100%;
  height: auto;
  display: block;
}
.node-group {
  cursor: pointer;
  outline: none;
}
.node-rect {
  fill: var(--surface, #ffffff);
  stroke: var(--border, #cbd5e1);
  stroke-width: 2px;
  transition: stroke 0.2s ease, fill 0.2s ease, stroke-width 0.2s ease;
}
.node-group:hover .node-rect,
.node-group:focus-visible .node-rect {
  stroke: var(--primary, #0A3D91);
}
.node-group.is-active .node-rect {
  stroke: var(--primary, #0A3D91);
  stroke-width: 3px;
  fill: var(--surface-tint, #eaf0fb);
}
.node-group.is-completed .node-rect {
  stroke: var(--success, #146c49);
}
.node-badge {
  fill: var(--surface-tint, #eaf0fb);
  stroke: var(--border, #cbd5e1);
  stroke-width: 1.5px;
  transition: fill 0.2s ease, stroke 0.2s ease;
}
.node-group.is-active .node-badge {
  fill: var(--primary, #0A3D91);
  stroke: var(--primary, #0A3D91);
}
.node-group.is-completed .node-badge {
  fill: var(--success, #146c49);
  stroke: var(--success, #146c49);
}
.node-badge-text {
  font-size: 11px;
  font-weight: 700;
  fill: var(--text, #15233b);
  dominant-baseline: central;
}
.node-group.is-active .node-badge-text,
.node-group.is-completed .node-badge-text {
  fill: #ffffff;
}
.node-text {
  font-size: 11.5px;
  font-weight: 600;
  fill: var(--text, #15233b);
}
.node-group.is-active .node-text {
  fill: var(--primary, #0A3D91);
  font-weight: 700;
}
.node-sublabel {
  font-size: 11px;
  fill: var(--text-muted, #5a6b85);
}
.flow-track {
  stroke: var(--border, #cbd5e1);
  stroke-width: 3px;
  stroke-linecap: round;
}
.flow-active {
  stroke: var(--primary, #0A3D91);
  stroke-width: 3.5px;
  stroke-linecap: round;
  stroke-dasharray: 8 6;
  animation: flow-dash 1.2s linear infinite;
  transition: opacity 0.3s ease;
}
@keyframes flow-dash {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: 0; }
}
.data-packet {
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.packet-halo {
  fill: var(--accent, #F47A20);
  opacity: 0.3;
}
.packet-core {
  fill: var(--accent, #F47A20);
}
.packet-symbol {
  font-size: 10px;
  fill: #ffffff;
  font-weight: 700;
  dominant-baseline: central;
}
@media (prefers-reduced-motion: reduce) {
  .flow-active {
    animation: none !important;
  }
  .data-packet {
    transition: none !important;
  }
}
.demo-stepper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stepper-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1.5px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #15233b);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.stepper-btn:hover {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #eaf0fb);
}
.stepper-btn:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.stepper-btn.is-active {
  border-color: var(--primary, #0A3D91);
  background: var(--primary, #0A3D91);
  color: #ffffff;
}
.stepper-btn.is-completed:not(.is-active) {
  border-color: var(--success, #146c49);
  color: var(--success, #146c49);
  background: #eaf7f1;
}
.stepper-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(0,0,0,0.08);
}
.stepper-btn.is-active .stepper-num {
  background: rgba(255,255,255,0.25);
  color: #ffffff;
}
.active-step-card {
  background: var(--surface, #ffffff);
  border: 2px solid var(--primary, #0A3D91);
  border-radius: var(--radius, 12px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s ease;
}
.active-step-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  padding-bottom: 12px;
}
.active-step-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.active-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary, #0A3D91);
}
.active-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text, #15233b);
}
.active-comp-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}
.active-comp-label {
  font-size: 0.8rem;
  color: var(--text-muted, #5a6b85);
  font-weight: 600;
}
.active-comp-badge {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #eaf0fb);
  border: 1px solid var(--border, #cbd5e1);
  padding: 3px 10px;
  border-radius: 6px;
}
.active-state-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--surface-tint, #eaf0fb);
  border-left: 4px solid var(--accent, #F47A20);
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
}
.state-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
  margin-top: 2px;
}
.state-heading {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--action, #B84B00);
  margin-bottom: 2px;
}
.state-value {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text, #15233b);
}
.active-desc-box {
  margin-top: 2px;
}
.active-desc {
  margin: 0;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--text, #15233b);
}
</style>
"""


def _svg_text_lines(text: str, cx: float, max_chars: int = 14) -> str:
    """Divide texto del componente en hasta 2 líneas centradas dentro del nodo SVG."""
    words = text.split()
    if len(text) <= max_chars or len(words) <= 1:
        t = text if len(text) <= max_chars else text[: max_chars - 1] + "…"
        return f'<tspan x="{cx:.1f}" dy="0">{esc(t)}</tspan>'

    line1, line2 = [], []
    curr_len = 0
    overflowed = False
    for w in words:
        if not overflowed and (curr_len + len(w) <= max_chars):
            line1.append(w)
            curr_len += len(w) + 1
        else:
            overflowed = True
            line2.append(w)

    if not line1:
        line1 = [words[0]]
        line2 = words[1:]

    s1 = " ".join(line1)
    s2 = " ".join(line2)
    if len(s2) > max_chars:
        s2 = s2[: max_chars - 1] + "…"

    return (
        f'<tspan x="{cx:.1f}" dy="-6">{esc(s1)}</tspan>'
        f'<tspan x="{cx:.1f}" dy="14">{esc(s2)}</tspan>'
    )


def _sublabel_lines(text: str, cx: float, max_chars: int = 22) -> str:
    """Título del paso en hasta 2 líneas bajo el nodo (sin truncar a 18 caracteres)."""
    words = text.split()
    line1: list[str] = []
    for w in words:
        if len(" ".join([*line1, w])) <= max_chars or not line1:
            line1.append(w)
        else:
            break
    rest = " ".join(words[len(line1):])
    if len(rest) > max_chars:
        rest = rest[: max_chars - 1] + "…"
    out = f'<tspan x="{cx:.1f}" dy="0">{esc(" ".join(line1))}</tspan>'
    if rest:
        out += f'<tspan x="{cx:.1f}" dy="13">{esc(rest)}</tspan>'
    return out


def normalize(data: dict, params: dict) -> dict:
    """Deja exactamente `num_steps` pasos: recorta los sobrantes y renumera. Si el modelo
    escribió menos, se conservan los reales (la UI usa el número real en barra y contador)."""
    n = params.get("num_steps", 5)
    pasos = list(data.get("pasos") or [])[:n]
    for k, step in enumerate(pasos, 1):
        step["paso"] = k
    return {**data, "pasos": pasos}


def render(data: dict, ctx: RenderContext) -> str:
    d = domain_for(ctx.concept)
    pasos = data.get("pasos", [])
    n = len(pasos)

    view_w = 840
    view_h = 236
    margin_x = 75.0
    spacing = (view_w - 2 * margin_x) / max(1, n - 1) if n > 1 else 0
    bw = min(120.0, max(94.0, spacing * 0.72)) if n > 1 else 130.0
    bh = 76.0
    cy = 92.0
    by = cy - bh / 2
    packet_y = by - 4  # el indicador viaja por encima de los nodos: no tapa su texto

    tracks_svg = []
    nodes_svg = []
    stepper_html = []
    first_cx = margin_x
    first_cy = cy

    for k, step in enumerate(pasos):
        step_num = k + 1
        cx = margin_x + k * spacing if n > 1 else (view_w / 2)
        bx = cx - bw / 2
        comp_text = step.get("componente_activo", "")
        title_text = step.get("titulo", "")

        if k == 0:
            first_cx = cx
            first_cy = packet_y

        # Conector con el siguiente nodo
        if k < n - 1:
            next_cx = margin_x + (k + 1) * spacing
            x1 = cx + bw / 2
            x2 = next_cx - bw / 2
            tracks_svg.append(
                f'<path class="flow-track" id="track-{step_num}" '
                f'd="M {x1:.1f} {cy:.1f} L {x2:.1f} {cy:.1f}" marker-end="url(#arrow)"/>'
            )
            tracks_svg.append(
                f'<path class="flow-active" id="flow-{step_num}" '
                f'd="M {x1:.1f} {cy:.1f} L {x2:.1f} {cy:.1f}" marker-end="url(#arrow-active)" opacity="0"/>'
            )

        # Nodo interactivo SVG
        tspans = _svg_text_lines(comp_text, cx)
        nodes_svg.append(
            f'<g class="node-group{" is-active" if k == 0 else ""}" id="node-{step_num}" '
            f'data-step="{step_num}" data-cx="{cx:.1f}" data-cy="{packet_y:.1f}" tabindex="0" role="button" '
            f'aria-label="Paso {step_num}: {esc(comp_text)}"><title>{esc(title_text)}</title>'
            f'<rect class="node-rect" x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="12"/>'
            f'<circle class="node-badge" cx="{cx:.1f}" cy="{by + 18:.1f}" r="11"/>'
            f'<text class="node-badge-text" x="{cx:.1f}" y="{by + 19:.1f}" text-anchor="middle">{step_num}</text>'
            f'<text class="node-text" x="{cx:.1f}" y="{by + 48:.1f}" text-anchor="middle">{tspans}</text>'
            f'<text class="node-sublabel" x="{cx:.1f}" y="{by + bh + 18:.1f}" text-anchor="middle">{_sublabel_lines(title_text, cx)}</text>'
            f'</g>'
        )

        # Botón selector en la botonera de pasos
        stepper_html.append(
            f'<button type="button" class="stepper-btn{" is-active" if k == 0 else ""}" '
            f'id="step-btn-{step_num}" data-step="{step_num}" aria-label="Ir al paso {step_num}: {esc(title_text)}">'
            f'<span class="stepper-num">{step_num}</span>'
            f'<span class="stepper-text">{esc(comp_text)}</span>'
            f'</button>'
        )

    tracks_str = "".join(tracks_svg)
    nodes_str = "".join(nodes_svg)
    stepper_str = "".join(stepper_html)

    first_step = pasos[0] if pasos else {}
    first_title = esc(first_step.get("titulo", ""))
    first_comp = esc(first_step.get("componente_activo", ""))
    first_state = esc(first_step.get("estado_datos", ""))
    first_desc = esc(first_step.get("descripcion", ""))

    demo_data_json = json_data(
        {"pasos": pasos, "total": n},
        element_id="demo-data",
    )

    return f"""{_STYLE}
<upao-header eyebrow="DEMO ANIMADA" title="{esc(data["titulo"])}">
  <p>Demostración interactiva y visual del flujo secuencial entre componentes internos.</p>
</upao-header>

<upao-objective>{esc(data["objetivo"])}</upao-objective>

<upao-progress id="prog" current="0" total="{n}" label="Progreso del proceso animado" show-fraction></upao-progress>

<div class="demo-container">
  <section class="demo-card" aria-label="Reproductor y controles de la demostración">
    <div class="demo-toolbar">
      <div class="demo-ctrls" role="toolbar" aria-label="Controles de reproducción">
        <button type="button" class="demo-ctrl-btn btn-play" id="btn-play" aria-label="Reproducir demostración automática">
          <span id="play-icon" aria-hidden="true">{icon('play')}</span>
          <span id="play-text">Reproducir</span>
        </button>
        <button type="button" class="demo-ctrl-btn" id="btn-prev" aria-label="Paso anterior" disabled>
          <span aria-hidden="true">{icon('prev')}</span> Anterior
        </button>
        <button type="button" class="demo-ctrl-btn" id="btn-next" aria-label="Paso siguiente">
          Siguiente <span aria-hidden="true">{icon('next')}</span>
        </button>
        <button type="button" class="demo-ctrl-btn" id="btn-reset" aria-label="Reiniciar demostración">
          <span aria-hidden="true">↺</span> Reiniciar
        </button>
      </div>

      <div class="demo-status-wrap">
        <upao-status id="demo-status" state="info">Paso 1: {first_comp}</upao-status>
        <span class="demo-step-pill" id="step-pill">Paso 1 de {n}</span>
      </div>
    </div>

    <upao-figure class="demo-figure" caption="Diagrama reactivo de flujo entre componentes {d.pick("del motor de base de datos", "del proceso")}">
      <div class="demo-svg-container">
        <svg class="demo-svg" viewBox="0 0 {view_w} {view_h}" role="group" aria-label="Diagrama del flujo de datos entre componentes">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--border, #cbd5e1)"/>
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--primary, #0A3D91)"/>
            </marker>
          </defs>

          {tracks_str}
          {nodes_str}

          <g class="data-packet" id="data-packet" transform="translate({first_cx:.1f}, {first_cy:.1f})" style="transform: translate({first_cx:.1f}px, {first_cy:.1f}px);">
            <circle class="packet-halo" r="12"/>
            <circle class="packet-core" r="8"/>
            <text class="packet-symbol" x="0" y="4" text-anchor="middle">{icon('bolt')}</text>
          </g>
        </svg>
      </div>
    </upao-figure>

    <nav class="demo-stepper" aria-label="Navegación directa por pasos">
      {stepper_str}
    </nav>
  </section>

  <article class="active-step-card" id="active-step-panel" aria-live="polite" role="region" aria-label="Detalle del paso activo">
    <div class="active-step-header">
      <div class="active-step-title-wrap">
        <span class="active-badge" id="panel-badge">Paso 1 de {n}</span>
        <h2 class="active-title" id="panel-title">{first_title}</h2>
      </div>
      <div class="active-comp-wrap">
        <span class="active-comp-label">Componente:</span>
        <span class="active-comp-badge" id="panel-comp">{first_comp}</span>
      </div>
    </div>
    <div class="active-state-box">
      <span class="state-icon" aria-hidden="true">{icon('chart')}</span>
      <div>
        <span class="state-heading">Estado de los datos:</span>
        <p class="state-value" id="panel-state">{first_state}</p>
      </div>
    </div>
    <div class="active-desc-box">
      <p class="active-desc" id="panel-desc">{first_desc}</p>
    </div>
  </article>
</div>

<upao-summary title="Síntesis del Proceso">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Finalizar demostración" locked></upao-complete>
</upao-summary>

{demo_data_json}
{script(PROGRESS_JS)}
{script('''
(function () {
  const dataEl = document.getElementById('demo-data');
  if (!dataEl) return;
  let demoData = {};
  try {
    demoData = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  const steps = demoData.pasos || [];
  const total = steps.length;
  if (!total) return;

  let currentStep = 1;
  let isPlaying = false;
  let playTimer = null;
  const visited = new Set();

  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const playText = document.getElementById('play-text');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnReset = document.getElementById('btn-reset');
  const statusEl = document.getElementById('demo-status');
  const stepPill = document.getElementById('step-pill');
  const panelBadge = document.getElementById('panel-badge');
  const panelTitle = document.getElementById('panel-title');
  const panelComp = document.getElementById('panel-comp');
  const panelState = document.getElementById('panel-state');
  const panelDesc = document.getElementById('panel-desc');
  const packet = document.getElementById('data-packet');

  function goToStep(stepNum) {
    if (stepNum < 1) stepNum = 1;
    if (stepNum > total) stepNum = total;
    currentStep = stepNum;
    visited.add(currentStep);

    const step = steps[currentStep - 1] || {};

    if (panelBadge) panelBadge.textContent = 'Paso ' + currentStep + ' de ' + total;
    if (panelTitle) panelTitle.textContent = step.titulo || '';
    if (panelComp) panelComp.textContent = step.componente_activo || '';
    if (panelState) panelState.textContent = step.estado_datos || '';
    if (panelDesc) panelDesc.textContent = step.descripcion || '';
    if (stepPill) stepPill.textContent = 'Paso ' + currentStep + ' de ' + total;

    if (statusEl) {
      if (currentStep === total) {
        statusEl.setAttribute('state', 'success');
        statusEl.textContent = 'Paso ' + currentStep + ' (Final): ' + (step.componente_activo || '') + ' — Demostración completada';
      } else {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = 'Paso ' + currentStep + ': ' + (step.componente_activo || '') + ' activo';
      }
    }

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('step-' + currentStep);
    }

    const activeNode = document.getElementById('node-' + currentStep);
    if (activeNode && packet) {
      const cx = activeNode.getAttribute('data-cx');
      const cy = activeNode.getAttribute('data-cy');
      if (cx && cy) {
        packet.style.transform = 'translate(' + cx + 'px, ' + cy + 'px)';
        packet.setAttribute('transform', 'translate(' + cx + ',' + cy + ')');
      }
    }

    for (let k = 1; k <= total; k++) {
      const nodeEl = document.getElementById('node-' + k);
      const btnEl = document.getElementById('step-btn-' + k);
      const isActive = (k === currentStep);
      const isCompleted = (k < currentStep) || (visited.has(k) && !isActive);

      if (nodeEl) {
        nodeEl.classList.toggle('is-active', isActive);
        nodeEl.classList.toggle('is-completed', isCompleted);
        nodeEl.setAttribute('aria-current', isActive ? 'step' : 'false');
      }
      if (btnEl) {
        btnEl.classList.toggle('is-active', isActive);
        btnEl.classList.toggle('is-completed', isCompleted);
        btnEl.setAttribute('aria-current', isActive ? 'step' : 'false');
      }

      const flowEl = document.getElementById('flow-' + k);
      if (flowEl) {
        flowEl.style.opacity = (k < currentStep) ? '1' : '0';
      }
    }

    if (btnPrev) btnPrev.disabled = (currentStep === 1);
    if (btnNext) btnNext.disabled = (currentStep === total);

    if (currentStep >= total && isPlaying) {
      pause();
    }
  }

  function play() {
    if (currentStep >= total) {
      goToStep(1);
    }
    isPlaying = true;
    if (playIcon) playIcon.innerHTML = ovaIcon('pause');
    if (playText) playText.textContent = 'Pausar';
    if (btnPlay) {
      btnPlay.setAttribute('aria-label', 'Pausar demostración');
      btnPlay.classList.add('is-playing');
    }
    clearInterval(playTimer);
    playTimer = setInterval(function () {
      if (currentStep < total) {
        goToStep(currentStep + 1);
      } else {
        pause();
      }
    }, 2600);
  }

  function pause() {
    isPlaying = false;
    clearInterval(playTimer);
    playTimer = null;
    if (playIcon) playIcon.innerHTML = ovaIcon('play');
    if (playText) playText.textContent = 'Reproducir';
    if (btnPlay) {
      btnPlay.setAttribute('aria-label', 'Reproducir demostración automática');
      btnPlay.classList.remove('is-playing');
    }
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', function () {
      if (isPlaying) pause(); else play();
    });
  }
  if (btnPrev) {
    btnPrev.addEventListener('click', function () {
      pause();
      if (currentStep > 1) goToStep(currentStep - 1);
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', function () {
      pause();
      if (currentStep < total) goToStep(currentStep + 1);
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      pause();
      goToStep(1);
    });
  }

  document.querySelectorAll('.stepper-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = parseInt(btn.getAttribute('data-step'), 10);
      if (s) {
        pause();
        goToStep(s);
      }
    });
  });

  document.querySelectorAll('.node-group').forEach(function (node) {
    node.addEventListener('click', function () {
      const s = parseInt(node.getAttribute('data-step'), 10);
      if (s) {
        pause();
        goToStep(s);
      }
    });
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const s = parseInt(node.getAttribute('data-step'), 10);
        if (s) {
          pause();
          goToStep(s);
        }
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (currentStep < total) {
        e.preventDefault();
        pause();
        goToStep(currentStep + 1);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (currentStep > 1) {
        e.preventDefault();
        pause();
        goToStep(currentStep - 1);
      }
    }
  });

  goToStep(1);
})();
''')}
"""


SPEC = TemplateSpec(
    phase="explain",
    rt=5,
    title="Demo Animada",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
    normalize=normalize,
)
