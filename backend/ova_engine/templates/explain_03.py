"""EXPLAIN 3 — Mapa Conceptual: red interactiva de relaciones conceptuales alrededor de un nodo central.

Permite al estudiante explorar las relaciones clave de un concepto nuclear en administración de bases
de datos mediante un grafo interactivo SVG con conexiones etiquetadas, navegación accesible por teclado
y panel de detalle sincronizado.
"""

from __future__ import annotations

import math

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param("num_nodes", 6, min=5, max=8, help="Número de nodos del mapa conceptual"),
)


def schema(p: dict) -> dict:
    n = p["num_nodes"]
    return obj(
        titulo=s(70),
        nodo_central=s(40),
        nodos=arr(
            obj(
                id=s(20),
                etiqueta=s(50),
                relacion=s(80),
                explicacion=s(220),
                ejemplo=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    n = p["num_nodes"]
    return f"""[ROL] Diseñador pedagógico de mapas conceptuales y redes semánticas para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
{d.rules() + chr(10) if not d.is_db else ""}[TAREA] Diseña un mapa conceptual de relaciones clave estructuradas alrededor del concepto central «{concept}» con exactamente {n} nodos satélite directamente vinculados a él:
- titulo: título motivador y representativo del mapa conceptual (≤10 palabras).
- nodo_central: término conciso y formal del concepto nuclear central (≤5 palabras, ej. «{concept}»).
- nodos: exactamente {n} nodos satélite que representan componentes, estructuras o principios directamente relacionados con el nodo central. Para cada nodo:
  * `id`: identificador alfanumérico breve sin espacios (ej. "nodo-1", "nodo-2", ≤10 caracteres).
  * `etiqueta`: concepto o componente técnico directamente vinculado al centro (≤6 palabras).
  * `relacion`: proposición o verbo enlace breve que conecta el nodo central hacia este nodo (ej. "se almacena físicamente en", "garantiza la propiedad de", "es ejecutado por", ≤8 palabras).
  * `explicacion`: justificación conceptual profunda de por qué existe este vínculo y cómo opera {d.pick("en la arquitectura del SGBD", "en el tema")} (≤30 palabras).
  * `ejemplo`: {d.pick("caso práctico, sentencia SQL, parámetro de configuración o situación real en el SGBD", "caso práctico o situación real del tema")} donde se manifiesta esta relación (≤20 palabras).
- sintesis: conclusión pedagógica que integre la red conceptual y consolide la comprensión global de «{concept}» (≤35 palabras).
[RESTRICCIONES] Enfoque riguroso en relaciones causales y estructurales {d.pick("de bases de datos", "propias del tema")}. Los verbos de enlace deben ser claros y directos. Sin repeticiones ni generalidades. No generes etiquetas HTML ni menciones al esquema JSON.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_nodes", 6)
    base_nodes = [
        {
            "id": "nodo-1",
            "etiqueta": "Bloque Raíz (Root Block)",
            "relacion": "inicia la búsqueda jerárquica",
            "explicacion": f"Punto de entrada superior en la jerarquía de {concept}; permite descender evaluando rangos de claves ordenadas.",
            "ejemplo": "Primer bloque accedido por el motor al evaluar un predicado de igualdad en WHERE.",
        },
        {
            "id": "nodo-2",
            "etiqueta": "Bloques Rama (Branch Blocks)",
            "relacion": "enruta hacia subárboles",
            "explicacion": "Contienen punteros y claves delimitadoras para descartar mitades completas del índice en tiempo logarítmico.",
            "ejemplo": "Navegación intermedia entre el bloque raíz y las hojas según el valor buscado.",
        },
        {
            "id": "nodo-3",
            "etiqueta": "Bloques Hoja (Leaf Blocks)",
            "relacion": "almacena los pares clave-ROWID",
            "explicacion": "Guardan las claves indexadas ordenadas y los identificadores físicos de fila (ROWID) en lista doblemente enlazada.",
            "ejemplo": "Escaneo secuencial ordenado para operaciones de rango 'BETWEEN 100 AND 200'.",
        },
        {
            "id": "nodo-4",
            "etiqueta": "Segmento Tabla (Table Heap)",
            "relacion": "provee las filas completas",
            "explicacion": f"Estructura física donde residen los datos completos a los que apunta {concept} mediante el ROWID recuperado.",
            "ejemplo": "Operación TABLE ACCESS BY INDEX ROWID visible en el plan de ejecución.",
        },
        {
            "id": "nodo-5",
            "etiqueta": "Buffer Cache de SGA",
            "relacion": "retiene bloques frecuentes en RAM",
            "explicacion": f"Mantiene en memoria los bloques raíz y rama de {concept}, eliminando lecturas físicas a disco en consultas repetitivas.",
            "ejemplo": "Acierto de caché al consultar índices de tablas transaccionales de alta frecuencia.",
        },
        {
            "id": "nodo-6",
            "etiqueta": "Optimizador CBO",
            "relacion": "evalúa costo y selectividad",
            "explicacion": f"Analiza estadísticas (clustering factor, altura, distinct keys) para decidir si conviene usar {concept} o Full Table Scan.",
            "ejemplo": "Elección de INDEX RANGE SCAN cuando la selectividad del predicado es menor al 5%.",
        },
        {
            "id": "nodo-7",
            "etiqueta": "Mecanismo Block Split",
            "relacion": "mantiene el balance dinámico",
            "explicacion": f"Divide un bloque hoja saturado en dos mitades al recibir nuevos INSERTs, preservando la altura equilibrada de {concept}.",
            "ejemplo": "Ejecución de un '90-10 leaf split' ante inserciones con secuencias ascendentes.",
        },
        {
            "id": "nodo-8",
            "etiqueta": "Archivos Redo Log",
            "relacion": "garantiza la durabilidad de cambios",
            "explicacion": f"Registra vectores de cambio generados por modificaciones sobre {concept} para asegurar recuperación tras caídas del SGBD.",
            "ejemplo": "Persistencia de cambios en disco mediante el proceso de fondo LGWR tras un COMMIT.",
        },
    ]

    return {
        "titulo": f"Mapa Conceptual: Arquitectura y Relaciones de {concept}"[:70],
        "nodo_central": f"{concept}"[:40],
        "nodos": base_nodes[:n],
        "sintesis": (
            f"El mapa conceptual de {concept} evidencia cómo interactúan sus bloques jerárquicos, "
            f"el optimizador y la memoria compartida para ofrecer accesos de alta velocidad e integridad transaccional."
        )[:250],
    }


def _wrap_text(text: str, max_chars: int = 18) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    if len(text) <= max_chars or len(words) == 1:
        return [text]
    mid = len(words) // 2
    return [" ".join(words[:mid]), " ".join(words[mid:])]


_STYLE = """
<style>
.mapa-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.mapa-btns {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mapa-chips-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 16px;
  -webkit-overflow-scrolling: touch;
}
.mapa-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #E2E8F2);
  background: var(--surface, #ffffff);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text, #15233B);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all .2s ease;
}
.mapa-chip:hover {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
}
.mapa-chip.is-active {
  border-color: var(--accent, #F47A20);
  background: var(--accent-tint, #FDEEE0);
  color: var(--action, #B84B00);
}
.mapa-chip.is-visited {
  border-color: var(--primary, #0A3D91);
}
.mapa-chip .chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
  font-size: 0.72rem;
  font-weight: 700;
}
.mapa-chip .chip-check {
  display: none;
  color: var(--primary, #0A3D91);
  font-weight: 700;
}
.mapa-chip.is-visited .chip-check {
  display: inline;
}
.mapa-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4, 20px);
  margin-bottom: 20px;
}
@media (min-width: 920px) {
  .mapa-layout {
    grid-template-columns: 1.25fr 1fr;
    align-items: start;
  }
}
.mapa-graph-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: clamp(14px, 2.5vw, 20px);
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.08));
}
.mapa-svg-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.mapa-svg {
  width: 100%;
  height: auto;
  min-width: 320px;
  display: block;
}
.mapa-edge {
  stroke: var(--border, #E2E8F2);
  stroke-width: 2;
  transition: stroke .2s, stroke-width .2s;
}
.mapa-edge.is-active {
  stroke: var(--accent, #F47A20);
  stroke-width: 3;
}
.mapa-edge-label {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  fill: var(--text-muted, #5A6B85);
  paint-order: stroke fill;
  stroke: var(--surface, #ffffff);
  stroke-width: 5px;
  stroke-linejoin: round;
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: central;
  transition: fill .2s;
}
.mapa-edge-label.is-active {
  fill: var(--accent, #F47A20);
  font-weight: 700;
}
.mapa-node {
  cursor: pointer;
}
.mapa-node .node-rect {
  fill: var(--surface, #ffffff);
  stroke: var(--border, #E2E8F2);
  stroke-width: 2;
  transition: fill .2s, stroke .2s, stroke-width .2s;
}
.mapa-node:hover .node-rect {
  stroke: var(--primary, #0A3D91);
  stroke-width: 2.5;
}
.mapa-node.is-visited .node-rect {
  fill: var(--surface-tint, #EAF0FB);
  stroke: var(--primary, #0A3D91);
}
.mapa-node.is-active .node-rect {
  stroke: var(--accent, #F47A20);
  stroke-width: 3;
  filter: drop-shadow(0 2px 8px rgba(244,122,32,0.25));
}
.mapa-node .node-num-badge {
  fill: var(--border, #E2E8F2);
  transition: fill .2s;
}
.mapa-node.is-visited .node-num-badge {
  fill: var(--primary, #0A3D91);
}
.mapa-node.is-active .node-num-badge {
  fill: var(--accent, #F47A20);
}
.mapa-node .node-num-text {
  font-size: 10px;
  font-weight: 700;
  fill: var(--text, #15233B);
  pointer-events: none;
}
.mapa-node.is-visited .node-num-text,
.mapa-node.is-active .node-num-text {
  fill: #ffffff;
}
.mapa-node .node-check {
  font-size: 12px;
  font-weight: 700;
  fill: var(--primary, #0A3D91);
  opacity: 0;
  transition: opacity .2s;
  pointer-events: none;
}
.mapa-node.is-visited .node-check {
  opacity: 1;
}
.mapa-node .node-title {
  font-size: 11px;
  font-weight: 600;
  fill: var(--text, #15233B);
  text-anchor: middle;
  pointer-events: none;
}
.mapa-node:focus-visible {
  outline: 3px solid var(--accent, #F47A20);
  outline-offset: 3px;
}
.mapa-center-node {
  cursor: pointer;
}
.mapa-center-node .center-rect {
  fill: var(--primary, #0A3D91);
  stroke: var(--primary-hover, #072C6B);
  stroke-width: 2.5;
  transition: stroke .2s;
}
.mapa-center-node:hover .center-rect {
  stroke: var(--accent, #F47A20);
}
.mapa-center-node.is-active .center-rect {
  stroke: var(--accent, #F47A20);
  stroke-width: 3.5;
  filter: drop-shadow(0 2px 10px rgba(10,61,145,0.3));
}
.mapa-center-node:focus-visible {
  outline: 3px solid var(--accent, #F47A20);
  outline-offset: 3px;
}
.mapa-center-node .center-eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  fill: var(--accent, #F47A20);
  text-anchor: middle;
  pointer-events: none;
}
.mapa-center-node .center-title {
  font-size: 13px;
  font-weight: 700;
  fill: #ffffff;
  text-anchor: middle;
  pointer-events: none;
}
.mapa-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  list-style: none;
  padding: 10px 0 0 0;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #5A6B85);
  border-top: 1px solid var(--border, #E2E8F2);
}
.mapa-legend li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}
.legend-dot.dot-central {
  background: var(--primary, #0A3D91);
}
.legend-dot.dot-sat {
  background: var(--surface, #ffffff);
  border: 2px solid var(--border, #E2E8F2);
}
.legend-dot.dot-visited {
  background: var(--surface-tint, #EAF0FB);
  border: 2px solid var(--primary, #0A3D91);
}
.legend-line {
  width: 20px;
  height: 2px;
  background: var(--border, #E2E8F2);
  display: inline-block;
  flex-shrink: 0;
}
.mapa-detail-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: clamp(16px, 3vw, 24px);
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.08));
  min-height: 280px;
  display: flex;
  flex-direction: column;
}
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 16px;
  gap: 12px;
  height: 100%;
}
.detail-empty-icon {
  font-size: 2.4rem;
  line-height: 1;
}
.detail-empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
  margin: 0;
}
.detail-empty-desc {
  font-size: 0.92rem;
  color: var(--text-muted, #5A6B85);
  line-height: 1.5;
  margin: 0;
}
.detail-empty-hint {
  font-size: 0.85rem;
  color: var(--action, #B84B00);
  background: var(--accent-tint, #FDEEE0);
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 600;
  margin: 4px 0 0 0;
}
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ap-fade .25s ease-out;
}
@keyframes ap-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.detail-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.detail-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
  padding: 4px 10px;
  border-radius: 999px;
}
.detail-status {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}
.detail-status.is-done {
  color: var(--success, #146C49);
  background: rgba(20, 108, 73, 0.1);
}
.detail-status.is-pending {
  color: var(--action, #B84B00);
  background: var(--accent-tint, #FDEEE0);
}
.detail-status.is-center {
  color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
}
.detail-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text, #15233B);
  margin: 0;
  line-height: 1.3;
}
.detail-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.92rem;
  line-height: 1.5;
}
.detail-block--example {
  background: var(--surface-tint, #EAF0FB);
  border-left: 3px solid var(--primary, #0A3D91);
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
}
.detail-kicker {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--text-muted, #5A6B85);
}
.detail-rel {
  font-weight: 600;
  color: var(--primary, #0A3D91);
  margin: 0;
}
.detail-exp {
  color: var(--text, #15233B);
  margin: 0;
}
.detail-ej {
  color: var(--text, #15233B);
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
}
.detail-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border, #E2E8F2);
}
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    d = domain_for(ctx.concept)
    nodos = data.get("nodos", [])
    total = len(nodos)
    central_name = data.get("nodo_central", ctx.concept)

    cw = 190.0
    ch = 64.0
    cx = 400.0
    cy = 270.0
    c_x1 = cx - cw / 2.0
    c_y1 = cy - ch / 2.0

    central_lines = _wrap_text(central_name, 22)
    if len(central_lines) == 1:
        central_text_svg = f'<text class="center-title" x="{cx:.1f}" y="{cy + 10:.1f}">{esc(central_lines[0])}</text>'
    else:
        central_text_svg = (
            f'<text class="center-title" x="{cx:.1f}" y="{cy + 4:.1f}">{esc(central_lines[0])}</text>'
            f'<text class="center-title" x="{cx:.1f}" y="{cy + 18:.1f}">{esc(central_lines[1])}</text>'
        )

    rx = 270.0
    ry = 180.0
    sw = 136.0
    sh = 52.0

    svg_edges = []
    svg_edge_labels = []
    svg_nodes = []
    chips = []

    for k, node in enumerate(nodos):
        node_id = str(node.get("id", f"node-{k + 1}"))
        etiqueta = str(node.get("etiqueta", f"Nodo {k + 1}"))
        relacion = str(node.get("relacion", "se vincula con"))

        theta = -math.pi / 2.0 + (2.0 * math.pi * k) / float(total) if total else 0.0
        nx = cx + rx * math.cos(theta)
        ny = cy + ry * math.sin(theta)

        bx = nx - sw / 2.0
        by = ny - sh / 2.0

        dx = nx - cx
        dy = ny - cy
        dist = math.hypot(dx, dy)
        ux = dx / dist if dist else 1.0
        uy = dy / dist if dist else 0.0

        r_start = 62.0
        r_end = 48.0
        x1 = cx + ux * r_start
        y1 = cy + uy * r_start
        x2 = nx - ux * r_end
        y2 = ny - uy * r_end

        mx = (x1 + x2) / 2.0
        my = (y1 + y2) / 2.0

        edge_id = esc(node_id)
        svg_edges.append(
            f'<line class="mapa-edge" id="edge-{edge_id}" '
            f'x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'marker-end="url(#arrow)"/>'
        )

        rel_lines = _wrap_text(relacion, 22)
        if len(rel_lines) == 1:
            label_tspans = f'<tspan x="{mx:.1f}" y="{my:.1f}">{esc(rel_lines[0])}</tspan>'
        else:
            label_tspans = (
                f'<tspan x="{mx:.1f}" y="{my - 6:.1f}">{esc(rel_lines[0])}</tspan>'
                f'<tspan x="{mx:.1f}" y="{my + 8:.1f}">{esc(rel_lines[1])}</tspan>'
            )

        svg_edge_labels.append(
            f'<text class="mapa-edge-label" id="edge-label-{edge_id}">'
            f'{label_tspans}</text>'
        )

        node_lines = _wrap_text(etiqueta, 18)
        if len(node_lines) == 1:
            node_tspans = f'<text class="node-title" x="{nx + 6:.1f}" y="{ny + 4:.1f}">{esc(node_lines[0])}</text>'
        else:
            node_tspans = (
                f'<text class="node-title" x="{nx + 6:.1f}" y="{ny - 3:.1f}">{esc(node_lines[0])}</text>'
                f'<text class="node-title" x="{nx + 6:.1f}" y="{ny + 11:.1f}">{esc(node_lines[1])}</text>'
            )

        svg_nodes.append(
            f'<g class="mapa-node" id="svg-node-{edge_id}" data-id="{edge_id}" tabindex="0" role="button" '
            f'aria-label="Nodo {k + 1}: {esc(etiqueta)}">'
            f'<rect class="node-rect" x="{bx:.1f}" y="{by:.1f}" width="{sw:.1f}" height="{sh:.1f}" rx="10"/>'
            f'<circle class="node-num-badge" cx="{bx + 16:.1f}" cy="{by + 16:.1f}" r="9"/>'
            f'<text class="node-num-text" x="{bx + 16:.1f}" y="{by + 19:.1f}" text-anchor="middle">{k + 1}</text>'
            f'<text class="node-check" x="{bx + sw - 14:.1f}" y="{by + 19:.1f}" text-anchor="middle">✓</text>'
            f'{node_tspans}'
            f'</g>'
        )

        chips.append(
            f'<button type="button" class="mapa-chip" id="chip-{edge_id}" data-id="{edge_id}" role="tab" '
            f'aria-selected="false">'
            f'<span class="chip-num">{k + 1}</span>'
            f'<span class="chip-text">{esc(etiqueta)}</span>'
            f'<span class="chip-check" aria-hidden="true">✓</span>'
            f'</button>'
        )

    svg_content = f"""
<svg class="mapa-svg" id="mapa-svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Grafo interactivo de mapa conceptual">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--text-muted, #5A6B85)"/>
    </marker>
  </defs>
  <g class="mapa-edges-group">
    {"".join(svg_edges)}
  </g>
  <g class="mapa-edge-labels-group">
    {"".join(svg_edge_labels)}
  </g>
  <g class="mapa-center-node" id="svg-node-center" tabindex="0" role="button" aria-label="Nodo central: {esc(central_name)}">
    <rect class="center-rect" x="{c_x1:.1f}" y="{c_y1:.1f}" width="{cw:.1f}" height="{ch:.1f}" rx="14"/>
    <text class="center-eyebrow" x="{cx:.1f}" y="{cy - 12:.1f}">CONCEPTO CENTRAL</text>
    {central_text_svg}
  </g>
  <g class="mapa-satellites-group">
    {"".join(svg_nodes)}
  </g>
</svg>
"""

    return f"""
{_STYLE}
<upao-header eyebrow="MAPA CONCEPTUAL" title="{esc(data["titulo"])}">
  <p>Explora las relaciones esenciales estructuradas alrededor del concepto central <strong>{esc(central_name)}</strong>.</p>
</upao-header>

<upao-objective>Al terminar podrás explicar las relaciones fundamentales de {esc(central_name)} y justificar la función de cada conexión {d.pick("en la arquitectura del SGBD", "en el tema")}.</upao-objective>

<div class="mapa-controls">
  <div class="mapa-btns">
    <button type="button" class="ova-btn" id="btn-explorar-todo">Explorar todo</button>
    <button type="button" class="ova-btn--ghost" id="btn-reiniciar">Reiniciar</button>
  </div>
  <upao-progress id="prog" current="0" total="{total}" label="Nodos explorados" show-fraction></upao-progress>
</div>

<div class="mapa-chips-bar" role="tablist" aria-label="Nodos del mapa conceptual">
  {"".join(chips)}
</div>

<div class="mapa-layout">
  <section class="mapa-graph-card" aria-label="Grafo conceptual">
    <div class="mapa-svg-wrapper">
      {svg_content}
    </div>
    <ul class="mapa-legend">
      <li><span class="legend-dot dot-central"></span><span>Nodo central ({esc(central_name)})</span></li>
      <li><span class="legend-dot dot-sat"></span><span>Nodo satélite</span></li>
      <li><span class="legend-dot dot-visited"></span><span>Explorado (✓)</span></li>
      <li><span class="legend-line"></span><span>Línea con proposición de enlace</span></li>
    </ul>
  </section>

  <section class="mapa-detail-card" id="mapa-detail-panel" aria-live="polite" aria-label="Panel de detalle conceptual">
    <div class="detail-empty" id="detail-empty">
      <div class="detail-empty-icon" aria-hidden="true">🗺️</div>
      <h3 class="detail-empty-title">Explora las conexiones</h3>
      <p class="detail-empty-desc">Haz clic en cualquier nodo del grafo o usa el botón <strong>Explorar todo</strong> para examinar cada relación, su explicación técnica y ejemplos{d.pick(" en el SGBD", "")}.</p>
      <p class="detail-empty-hint">Al explorar los {total} nodos satélite se desbloqueará el cierre de la actividad.</p>
    </div>
    <div class="detail-content" id="detail-content" hidden>
      <div class="detail-header-row">
        <span class="detail-badge" id="detail-badge"></span>
        <span class="detail-status" id="detail-status"></span>
      </div>
      <h3 class="detail-title" id="detail-title"></h3>
      <div class="detail-block">
        <span class="detail-kicker">Relación con el concepto central:</span>
        <p class="detail-rel" id="detail-rel"></p>
      </div>
      <div class="detail-block">
        <span class="detail-kicker">Explicación conceptual:</span>
        <p class="detail-exp" id="detail-exp"></p>
      </div>
      <div class="detail-block detail-block--example">
        <span class="detail-kicker">{d.pick("Ejemplo en el SGBD:", "Ejemplo:")}</span>
        <p class="detail-ej" id="detail-ej"></p>
      </div>
      <div class="detail-nav-row">
        <button type="button" class="ova-btn--ghost btn-nav" id="btn-prev-node" aria-label="Nodo anterior">← Anterior</button>
        <button type="button" class="ova-btn--ghost btn-nav" id="btn-next-node" aria-label="Siguiente nodo">Siguiente →</button>
      </div>
    </div>
  </section>
</div>

<upao-summary>{esc(data["sintesis"])}<upao-complete slot="actions" label="Finalizar actividad" locked></upao-complete></upao-summary>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script('''
const dataEl = document.getElementById('ova-data');
if (!dataEl) return;
const data = JSON.parse(dataEl.textContent);
const nodos = data.nodos || [];
const central = data.nodo_central || '';
const total = nodos.length;

const visited = new Set();
let currentIndex = -1;

const detailEmpty = document.getElementById('detail-empty');
const detailContent = document.getElementById('detail-content');
const detailBadge = document.getElementById('detail-badge');
const detailStatus = document.getElementById('detail-status');
const detailTitle = document.getElementById('detail-title');
const detailRel = document.getElementById('detail-rel');
const detailExp = document.getElementById('detail-exp');
const detailEj = document.getElementById('detail-ej');
const btnPrev = document.getElementById('btn-prev-node');
const btnNext = document.getElementById('btn-next-node');
const btnExplorar = document.getElementById('btn-explorar-todo');
const btnReiniciar = document.getElementById('btn-reiniciar');
const centerNode = document.getElementById('svg-node-center');

function markNodeVisited(nodeId) {
  if (!visited.has(nodeId)) {
    visited.add(nodeId);
    window.ovaMark('node-' + nodeId);
    const sNode = document.getElementById('svg-node-' + nodeId);
    if (sNode) sNode.classList.add('is-visited');
    const chip = document.getElementById('chip-' + nodeId);
    if (chip) chip.classList.add('is-visited');
  }
}

function selectNode(index) {
  if (index < 0 || index >= total) return;
  currentIndex = index;
  const node = nodos[index];
  markNodeVisited(node.id);

  document.querySelectorAll('.mapa-node').forEach(function(el) {
    el.classList.remove('is-active');
  });
  document.querySelectorAll('.mapa-edge').forEach(function(el) {
    el.classList.remove('is-active');
  });
  document.querySelectorAll('.mapa-edge-label').forEach(function(el) {
    el.classList.remove('is-active');
  });
  if (centerNode) centerNode.classList.remove('is-active');

  const sNode = document.getElementById('svg-node-' + node.id);
  if (sNode) sNode.classList.add('is-active');
  const sEdge = document.getElementById('edge-' + node.id);
  if (sEdge) sEdge.classList.add('is-active');
  const sLabel = document.getElementById('edge-label-' + node.id);
  if (sLabel) sLabel.classList.add('is-active');

  document.querySelectorAll('.mapa-chip').forEach(function(el, i) {
    el.classList.toggle('is-active', i === index);
    el.setAttribute('aria-selected', i === index ? 'true' : 'false');
  });

  if (detailEmpty) detailEmpty.hidden = true;
  if (detailContent) detailContent.hidden = false;
  if (detailBadge) detailBadge.textContent = 'Nodo ' + (index + 1) + ' de ' + total;
  if (detailStatus) {
    detailStatus.textContent = 'Explorado ✓';
    detailStatus.className = 'detail-status is-done';
  }
  if (detailTitle) detailTitle.textContent = node.etiqueta || '';
  if (detailRel) detailRel.textContent = node.relacion || '';
  if (detailExp) detailExp.textContent = node.explicacion || '';
  if (detailEj) detailEj.textContent = node.ejemplo || '';

  if (btnPrev) btnPrev.disabled = (index === 0);
  if (btnNext) btnNext.disabled = (index === total - 1);
}

function selectCenter() {
  currentIndex = -1;
  document.querySelectorAll('.mapa-node').forEach(function(el) {
    el.classList.remove('is-active');
  });
  document.querySelectorAll('.mapa-edge').forEach(function(el) {
    el.classList.remove('is-active');
  });
  document.querySelectorAll('.mapa-edge-label').forEach(function(el) {
    el.classList.remove('is-active');
  });
  document.querySelectorAll('.mapa-chip').forEach(function(el) {
    el.classList.remove('is-active');
    el.setAttribute('aria-selected', 'false');
  });
  if (centerNode) centerNode.classList.add('is-active');

  if (detailEmpty) detailEmpty.hidden = true;
  if (detailContent) detailContent.hidden = false;
  if (detailBadge) detailBadge.textContent = 'Concepto Central';
  if (detailStatus) {
    detailStatus.textContent = 'Núcleo';
    detailStatus.className = 'detail-status is-center';
  }
  if (detailTitle) detailTitle.textContent = central;
  if (detailRel) detailRel.textContent = 'Eje de articulación de las ' + total + ' relaciones conceptuales.';
  if (detailExp) detailExp.textContent = data.sintesis || '';
  if (detailEj) detailEj.textContent = 'Haz clic en cualquiera de los nodos satélite para examinar cada relación técnica y su aplicación práctica.';

  if (btnPrev) btnPrev.disabled = true;
  if (btnNext) btnNext.disabled = (total === 0);
}

nodos.forEach(function(node, idx) {
  const sNode = document.getElementById('svg-node-' + node.id);
  if (sNode) {
    sNode.addEventListener('click', function() { selectNode(idx); });
    sNode.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(idx); }
    });
  }
  const chip = document.getElementById('chip-' + node.id);
  if (chip) {
    chip.addEventListener('click', function() { selectNode(idx); });
  }
});

if (centerNode) {
  centerNode.addEventListener('click', selectCenter);
  centerNode.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCenter(); }
  });
}

if (btnPrev) {
  btnPrev.addEventListener('click', function() {
    if (currentIndex > 0) selectNode(currentIndex - 1);
  });
}
if (btnNext) {
  btnNext.addEventListener('click', function() {
    if (currentIndex < total - 1) selectNode(currentIndex + 1);
  });
}

if (btnExplorar) {
  btnExplorar.addEventListener('click', function() {
    nodos.forEach(function(node) {
      markNodeVisited(node.id);
    });
    selectNode(0);
  });
}

if (btnReiniciar) {
  btnReiniciar.addEventListener('click', function() {
    currentIndex = -1;
    document.querySelectorAll('.mapa-node').forEach(function(el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.mapa-edge').forEach(function(el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.mapa-edge-label').forEach(function(el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.mapa-chip').forEach(function(el) {
      el.classList.remove('is-active');
      el.setAttribute('aria-selected', 'false');
    });
    if (centerNode) centerNode.classList.remove('is-active');
    if (detailEmpty) detailEmpty.hidden = false;
    if (detailContent) detailContent.hidden = true;
  });
}
''')}
"""


SPEC = TemplateSpec(
    phase="explain",
    rt=3,
    title="Mapa Conceptual",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
