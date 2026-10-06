"""ENGAGE 10 — Simulador Intuitivo: controles manipulables + causa y efecto reactivo.

Recurso de simulación interactiva para descubrir la relación de causa y efecto
fundamental en un concepto (ej. buffer cache vs lecturas en disco, sesiones concurrentes
y bloqueos, llenado de almacenamiento, o costo con/sin índices).
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param(
        "num_controls",
        2,
        min=1,
        max=3,
        help="Número de controles manipulables",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_controls"]
    return obj(
        titulo=s(70),
        objetivo=s(160),
        controles=arr(
            obj(
                id=s(20),
                etiqueta=s(50),
                min=i(),
                max=i(),
                default=i(),
                unidad=s(20),
                descripcion=s(120),
            ),
            min_items=n,
            max_items=n,
        ),
        ejemplo_trabajado=obj(
            paso=s(140),
            resultado=s(140),
        ),
        cierre_conceptual=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_controls"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador de simuladores intuitivos y experiencias interactivas para ingeniería de bases de datos.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña los parámetros conceptuales para un simulador interactivo de {n} control(es) que permita al estudiante descubrir relaciones causa-efecto fundamentales sobre «{concept}» (p. ej. tamaño del buffer cache frente a lecturas en disco, sesiones concurrentes que compiten por filas y generan bloqueos, tasa de inserción frente al llenado de un tablespace, o selectividad de un índice frente al costo de escaneo).
- titulo: título evocador del simulador (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras, qué descubrirá al manipular los controles).
- controles: exactamente {n} control(es) manipulable(s) con respuesta intuitiva. Por cada control:
  * `id`: identificador técnico breve en minúsculas sin espacios (≤15 caracteres, ej. "tam_buffer", "sesiones").
  * `etiqueta`: nombre legible del parámetro visible al estudiante (≤6 palabras).
  * `min`: valor entero mínimo razonable para la escala (ej. 10).
  * `max`: valor entero máximo razonable para la escala (ej. 250).
  * `default`: valor entero por defecto dentro del rango [min, max].
  * `unidad`: unidad de medida o magnitud (≤10 caracteres, ej. "MB", "sesiones", "ms", "%").
  * `descripcion`: explicación de qué representa este control y qué efecto causa en el sistema al variarlo (≤18 palabras).
- ejemplo_trabajado: un caso resuelto de referencia guiada antes de interactuar:
  * `paso`: acción concreta de manipulación sugerida (≤20 palabras).
  * `resultado`: observación y deducción causa-efecto del sistema (≤22 palabras).
- cierre_conceptual: síntesis de transferencia que consolida el principio de causa-efecto descubierto y su impacto real en producción (≤45 palabras).
[RESTRICCIONES] Enfatiza la intuición física/lógica de causa y efecto. Sin código SQL extenso ni fórmulas matemáticas densas. Tono didáctico adecuado a {d.audiencia}.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador de simuladores intuitivos y experiencias interactivas para el estudio de «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña los parámetros conceptuales para un simulador interactivo de {n} control(es) que permita al estudiante descubrir relaciones causa-efecto fundamentales sobre «{concept}» (p. ej. dos magnitudes propias del tema cuya relación el estudiante pueda variar y observar).
- titulo: título evocador del simulador (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras, qué descubrirá al manipular los controles).
- controles: exactamente {n} control(es) manipulable(s) con respuesta intuitiva. Por cada control:
  * `id`: identificador técnico breve en minúsculas sin espacios (≤15 caracteres, ej. "temperatura", "tamano").
  * `etiqueta`: nombre legible del parámetro visible al estudiante (≤6 palabras).
  * `min`: valor entero mínimo razonable para la escala (ej. 10).
  * `max`: valor entero máximo razonable para la escala (ej. 250).
  * `default`: valor entero por defecto dentro del rango [min, max].
  * `unidad`: unidad de medida o magnitud (≤10 caracteres, ej. "MB", "sesiones", "ms", "%").
  * `descripcion`: explicación de qué representa este control y qué efecto causa en el sistema al variarlo (≤18 palabras).
- ejemplo_trabajado: un caso resuelto de referencia guiada antes de interactuar:
  * `paso`: acción concreta de manipulación sugerida (≤20 palabras).
  * `resultado`: observación y deducción causa-efecto del sistema (≤22 palabras).
- cierre_conceptual: síntesis de transferencia que consolida el principio de causa-efecto descubierto y su impacto real en producción (≤45 palabras).
[RESTRICCIONES] Enfatiza la intuición física/lógica de causa y efecto. Sin código extenso ni fórmulas matemáticas densas. Tono didáctico adecuado a {d.audiencia}.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-sim-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 16px;
}
@media (min-width: 768px) {
  .ova-sim-grid {
    grid-template-columns: minmax(260px, 320px) 1fr;
    align-items: start;
  }
}
.ova-controls-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ova-control-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.ova-control-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.ova-control-label {
  font-size: 0.95rem;
  color: var(--foreground, #0f172a);
}
.ova-control-badge {
  display: inline-block;
  background: var(--surface-2, #f1f5f9);
  color: var(--primary, #0A3D91);
  font-weight: 700;
  font-size: 0.875rem;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border, #cbd5e1);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ova-control-desc {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
  margin: 0 0 10px 0;
  line-height: 1.4;
}
.ova-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ova-btn-step {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  color: var(--foreground, #0f172a);
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.ova-btn-step:hover {
  background: var(--surface-hover, #e2e8f0);
  border-color: var(--primary, #0A3D91);
}
.ova-btn-step:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-range {
  flex: 1;
  min-width: 0;
  height: 36px;
  accent-color: var(--primary, #0A3D91);
  cursor: pointer;
}
.ova-range-limits {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.ova-diagram-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.ova-sim-svg {
  width: 100%;
  height: auto;
  max-width: 100%;
  display: block;
  border-radius: var(--radius, 10px);
  background: var(--surface, #ffffff);
}
.ova-status-wrap {
  margin-top: 4px;
}
.ova-sim-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.ova-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: var(--radius, 6px);
  padding: 6px 12px;
  font-size: 0.825rem;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  min-height: 44px;
}
.ova-btn-ghost:hover {
  background: var(--surface-2, #f1f5f9);
  color: var(--foreground, #0f172a);
}
.ova-btn-ghost:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
</style>
"""

_SIM_JS = """
(function () {
  const sliders = document.querySelectorAll('.ova-range');
  const simStatus = document.getElementById('sim-status');
  const btnReset = document.getElementById('btn-reset-sim');

  function updateControlDisplay(idx) {
    const slider = document.getElementById('ctrl-slider-' + idx);
    if (!slider) return;
    const val = slider.value;
    const min = parseInt(slider.min, 10) || 0;
    const max = parseInt(slider.max, 10) || 100;
    const unit = slider.getAttribute('data-unit') || '';

    const numEl = document.getElementById('val-num-' + idx);
    if (numEl) numEl.textContent = val;

    slider.setAttribute('aria-valuenow', val);

    const norm = max > min ? (parseInt(val, 10) - min) / (max - min) : 0.5;
    const bar = document.getElementById('svg-bar-' + idx);
    if (bar) {
      bar.setAttribute('width', Math.max(4, Math.round(norm * 188)));
    }
    const txt = document.getElementById('svg-txt-' + idx);
    if (txt) {
      txt.textContent = val + ' ' + unit;
    }
  }

  function recalcSimulation() {
    if (!sliders.length) return;

    const norms = [];
    sliders.forEach(function (sl) {
      const min = parseFloat(sl.min) || 0;
      const max = parseFloat(sl.max) || 100;
      const val = parseFloat(sl.value) || min;
      const norm = max > min ? (val - min) / (max - min) : 0.5;
      norms.push(Math.max(0, Math.min(1, norm)));
    });

    let eff = 0.5;
    if (norms.length === 1) {
      eff = 0.2 + norms[0] * 0.75;
    } else if (norms.length === 2) {
      eff = norms[0] * 1.15 - norms[1] * 0.85 + 0.45;
    } else {
      eff = norms[0] * 0.85 - norms[1] * 0.7 + norms[2] * 0.35 + 0.3;
    }

    const clampedEff = Math.max(0.06, Math.min(0.98, eff));
    const score = Math.round(clampedEff * 100);

    const gaugeArc = document.getElementById('svg-gauge-arc');
    const gaugeVal = document.getElementById('svg-gauge-val');
    const stateBadge = document.getElementById('svg-state-badge');
    const stateBadgeTxt = document.getElementById('svg-state-badge-txt');
    const effectDetail1 = document.getElementById('svg-effect-detail-1');
    const effectDetail2 = document.getElementById('svg-effect-detail-2');
    const coreHalo = document.getElementById('svg-core-halo');

    if (gaugeVal) gaugeVal.textContent = score + '%';

    const circumference = 314.16;
    const offset = circumference * (1 - clampedEff);
    if (gaugeArc) {
      gaugeArc.setAttribute('stroke-dashoffset', offset.toFixed(2));
    }

    let state = 'info';
    let badgeTxt = 'Operación Estable';
    let badgeFill = '#eff6ff';
    let badgeStroke = '#3b82f6';
    let badgeTextFill = '#1e40af';
    let color = '#3b82f6';
    let det1 = 'Tasa de aciertos balanceada';
    let det2 = 'I/O a disco moderado y controlado';
    let statusMsg = 'Operación estable: Los recursos asignados cubren la demanda sin generar cuellos de botella notables.';

    if (score >= 75) {
      state = 'success';
      badgeTxt = 'Rendimiento Óptimo';
      badgeFill = '#ecfdf5';
      badgeStroke = '#10b981';
      badgeTextFill = '#065f46';
      color = '#10b981';
      det1 = 'Aciertos en memoria > 85%';
      det2 = 'I/O físico y contención mínimos';
      statusMsg = 'Rendimiento óptimo: Alta tasa de aciertos en memoria y latencia mínima; el sistema opera en su punto ideal.';
    } else if (score < 30) {
      state = 'error';
      badgeTxt = 'Cuello de Botella';
      badgeFill = '#fef2f2';
      badgeStroke = '#ef4444';
      badgeTextFill = '#991b1b';
      color = '#ef4444';
      det1 = 'I/O a disco saturado';
      det2 = 'Contención crítica y esperas';
      statusMsg = 'Cuello de botella crítico: Capacidad insuficiente para la carga actual; degradación severa por lecturas en disco o contención.';
    } else if (score < 50) {
      state = 'warning';
      badgeTxt = 'Alerta de Contención';
      badgeFill = '#fffbeb';
      badgeStroke = '#f59e0b';
      badgeTextFill = '#92400e';
      color = '#f59e0b';
      det1 = 'Demanda excede holgura';
      det2 = 'Aumento de esperas por bloque';
      statusMsg = 'Alerta de contención: La demanda supera el umbral óptimo; aumentan las lecturas a disco y la contención de recursos.';
    }

    if (gaugeArc) gaugeArc.setAttribute('stroke', color);
    if (coreHalo) coreHalo.setAttribute('stroke', color);
    if (stateBadge) {
      stateBadge.setAttribute('fill', badgeFill);
      stateBadge.setAttribute('stroke', badgeStroke);
    }
    if (stateBadgeTxt) {
      stateBadgeTxt.textContent = badgeTxt;
      stateBadgeTxt.setAttribute('fill', badgeTextFill);
    }
    if (effectDetail1) effectDetail1.textContent = det1;
    if (effectDetail2) effectDetail2.textContent = det2;
    if (simStatus) {
      simStatus.setAttribute('state', state);
      simStatus.textContent = statusMsg;
    }
  }

  // Escuchadores de eventos para los sliders
  sliders.forEach(function (slider) {
    slider.addEventListener('input', function () {
      const idx = parseInt(slider.getAttribute('data-idx'), 10);
      if (typeof window.ovaMark === 'function') {
        window.ovaMark('ctrl-' + idx);
      }
      updateControlDisplay(idx);
      recalcSimulation();
    });
  });

  // Botones de incremento y decremento
  document.querySelectorAll('.ova-btn-step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const slider = document.getElementById('ctrl-slider-' + idx);
      if (!slider) return;

      const isInc = btn.classList.contains('ova-btn-inc');
      const min = parseInt(slider.min, 10);
      const max = parseInt(slider.max, 10);
      const cur = parseInt(slider.value, 10);
      const step = Math.max(1, Math.round((max - min) / 20));
      const next = isInc ? Math.min(max, cur + step) : Math.max(min, cur - step);

      if (typeof window.ovaMark === 'function') {
        window.ovaMark('ctrl-' + idx);
      }

      if (next !== cur) {
        slider.value = next;
        slider.dispatchEvent(new Event('input'));
      }
    });
  });

  // Botón de restablecimiento
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      sliders.forEach(function (sl) {
        sl.value = sl.defaultValue;
        const idx = parseInt(sl.getAttribute('data-idx'), 10);
        updateControlDisplay(idx);
      });
      recalcSimulation();
    });
  }

  // Inicialización de la simulación
  recalcSimulation();
})();
"""


def _parse_control_bounds(ctrl: dict) -> tuple[int, int, int]:
    try:
        c_min = int(ctrl.get("min", 0))
    except (TypeError, ValueError):
        c_min = 0
    try:
        c_max = int(ctrl.get("max", 100))
    except (TypeError, ValueError):
        c_max = 100
    if c_max <= c_min:
        c_max = c_min + 100
    try:
        c_val = int(ctrl.get("default", c_min))
    except (TypeError, ValueError):
        c_val = c_min
    return c_min, c_max, max(c_min, min(c_max, c_val))


def _render_svg(controles: list[dict]) -> str:
    n = len(controles)
    y_pos = [135] if n == 1 else ([95, 185] if n == 2 else [65, 135, 205])
    colors = ["var(--primary, #0A3D91)", "var(--accent-brand, #F25C05)", "#6366f1"]

    input_items = []
    flow_paths = []

    for idx, ctrl in enumerate(controles):
        y = y_pos[idx]
        c = colors[idx % len(colors)]
        c_min, c_max, c_val = _parse_control_bounds(ctrl)

        norm = (c_val - c_min) / (c_max - c_min)
        w = max(4, round(norm * 188))
        lbl = esc(ctrl.get("etiqueta", f"Control {idx + 1}")[:26])
        unit = esc(ctrl.get("unidad", "")[:10])

        input_items.append(
            f'<g class="svg-ctrl-group" data-idx="{idx}">'
            f'<text x="32" y="{y}" font-size="11" font-weight="600" fill="var(--foreground, #0f172a)">{lbl}</text>'
            f'<text id="svg-txt-{idx}" x="220" y="{y}" font-size="11" font-weight="700" text-anchor="end" fill="{c}">{c_val} {unit}</text>'
            f'<rect x="32" y="{y + 8}" width="188" height="14" rx="7" fill="#e2e8f0"/>'
            f'<rect id="svg-bar-{idx}" x="32" y="{y + 8}" width="{w}" height="14" rx="7" fill="{c}"/>'
            f'<text x="32" y="{y + 32}" font-size="9" fill="#94a3b8">{c_min}</text>'
            f'<text x="220" y="{y + 32}" font-size="9" text-anchor="end" fill="#94a3b8">{c_max} {unit}</text>'
            f"</g>"
        )

        flow_paths.append(
            f'<path id="svg-flow-{idx}" d="M 236 {y + 15} C 265 {y + 15}, 265 160, 290 160" '
            f'fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="5,4" opacity="0.8"/>'
        )

    inputs_svg = "".join(input_items)
    flows_svg = "".join(flow_paths)

    return f"""<svg viewBox="0 0 640 320" class="ova-sim-svg" role="img" aria-label="Diagrama interactivo reactivo de causa y efecto" preserveAspectRatio="xMidYMid meet">
<defs>
  <marker id="arrow-conduit" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--primary, #0A3D91)"/>
  </marker>
  <filter id="sim-glow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
  </filter>
</defs>

<!-- Panel A: Entradas / Causas -->
<rect x="16" y="16" width="220" height="288" rx="12" fill="var(--surface-2, #f8fafc)" stroke="var(--border, #e2e8f0)" stroke-width="1.5"/>
<text x="32" y="38" font-size="11" font-weight="700" fill="var(--primary, #0A3D91)" letter-spacing="0.5">VARIABLES DE ENTRADA (CAUSA)</text>
{inputs_svg}

<!-- Flujos de conexión -->
{flows_svg}

<!-- Nodo Central -->
<circle id="svg-core-halo" cx="340" cy="160" r="48" fill="none" stroke="var(--primary, #0A3D91)" stroke-width="2" opacity="0.3"/>
<circle id="svg-core" cx="340" cy="160" r="40" fill="var(--surface, #ffffff)" stroke="var(--primary, #0A3D91)" stroke-width="3" filter="url(#sim-glow)"/>
<path d="M 324 150 C 324 144, 356 144, 356 150 C 356 156, 324 156, 324 150 Z M 324 150 L 324 168 C 324 174, 356 174, 356 168 L 356 150 M 324 159 C 324 165, 356 165, 356 159" fill="none" stroke="var(--primary, #0A3D91)" stroke-width="2" stroke-linecap="round"/>
<text x="340" y="182" font-size="9" font-weight="700" text-anchor="middle" fill="var(--foreground, #0f172a)">SISTEMA</text>
<text id="svg-core-rate" x="340" y="222" font-size="10" font-weight="600" text-anchor="middle" fill="var(--primary, #0A3D91)">Procesando</text>

<!-- Conector hacia Salida -->
<path d="M 388 160 L 416 160" fill="none" stroke="var(--primary, #0A3D91)" stroke-width="2.5" marker-end="url(#arrow-conduit)"/>

<!-- Panel B: Efecto / Respuesta del Sistema -->
<rect x="424" y="16" width="200" height="288" rx="12" fill="var(--surface-2, #f8fafc)" stroke="var(--border, #e2e8f0)" stroke-width="1.5"/>
<text x="440" y="38" font-size="11" font-weight="700" fill="var(--primary, #0A3D91)" letter-spacing="0.5">EFECTO DEL SISTEMA</text>

<!-- Indicador Circular (Gauge) -->
<circle cx="524" cy="120" r="50" fill="none" stroke="#e2e8f0" stroke-width="10"/>
<circle id="svg-gauge-arc" cx="524" cy="120" r="50" fill="none" stroke="#10b981" stroke-width="10" stroke-linecap="round" stroke-dasharray="314.16" stroke-dashoffset="62.83" transform="rotate(-90 524 120)"/>
<text id="svg-gauge-val" x="524" y="122" font-size="22" font-weight="800" text-anchor="middle" fill="var(--foreground, #0f172a)">80%</text>
<text id="svg-gauge-lbl" x="524" y="138" font-size="9" font-weight="600" text-anchor="middle" fill="#64748b">Eficiencia Global</text>

<!-- Insignia de Estado -->
<rect id="svg-state-badge" x="444" y="185" width="160" height="28" rx="14" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/>
<text id="svg-state-badge-txt" x="524" y="203" font-size="11" font-weight="700" text-anchor="middle" fill="#065f46">Rendimiento Óptimo</text>

<!-- Detalles Causa-Efecto -->
<text id="svg-effect-detail-1" x="524" y="238" font-size="10" font-weight="500" text-anchor="middle" fill="#475569">Alta tasa de aciertos en memoria</text>
<text id="svg-effect-detail-2" x="524" y="254" font-size="9" text-anchor="middle" fill="#94a3b8">I/O físico y contención mínimos</text>
</svg>"""


def render(data: dict, ctx: RenderContext) -> str:
    controles = data.get("controles", [])
    total_ctrl = len(controles)

    control_cards = []
    for idx, ctrl in enumerate(controles):
        c_min, c_max, c_val = _parse_control_bounds(ctrl)
        etiqueta = esc(ctrl.get("etiqueta", f"Control {idx + 1}"))
        descripcion = esc(ctrl.get("descripcion", ""))
        unidad = esc(ctrl.get("unidad", ""))

        control_cards.append(
            f'<div class="ova-control-card" data-idx="{idx}">'
            f'<div class="ova-control-head">'
            f'<label for="ctrl-slider-{idx}" class="ova-control-label">'
            f"<strong>{etiqueta}</strong>"
            f"</label>"
            f'<span class="ova-control-badge" id="val-badge-{idx}" aria-live="polite">'
            f'<span id="val-num-{idx}">{c_val}</span> {unidad}'
            f"</span>"
            f"</div>"
            f'<p class="ova-control-desc">{descripcion}</p>'
            f'<div class="ova-slider-row">'
            f'<button type="button" class="ova-btn-step ova-btn-dec" data-idx="{idx}" aria-label="Disminuir {etiqueta}">'
            f"−"
            f"</button>"
            f'<input type="range" id="ctrl-slider-{idx}" class="ova-range" data-idx="{idx}" '
            f'min="{c_min}" max="{c_max}" value="{c_val}" data-unit="{unidad}" '
            f'aria-label="{etiqueta}" aria-valuemin="{c_min}" aria-valuemax="{c_max}" aria-valuenow="{c_val}" '
            f'aria-describedby="val-badge-{idx}">'
            f'<button type="button" class="ova-btn-step ova-btn-inc" data-idx="{idx}" aria-label="Aumentar {etiqueta}">'
            f"+"
            f"</button>"
            f"</div>"
            f'<div class="ova-range-limits" aria-hidden="true">'
            f"<span>Mín: {c_min} {unidad}</span>"
            f"<span>Máx: {c_max} {unidad}</span>"
            f"</div>"
            f"</div>"
        )

    controls_html = "".join(control_cards)
    svg_html = _render_svg(controles)
    ejemplo = data.get("ejemplo_trabajado", {})

    return f"""{_STYLE}
<upao-header eyebrow="SIMULADOR INTUITIVO" title="{esc(data.get("titulo", ""))}">
  <p>Experimenta con las variables del sistema para descubrir el comportamiento de causa y efecto en tiempo real.</p>
</upao-header>

<upao-objective>{esc(data.get("objetivo", ""))}</upao-objective>

<upao-progress id="prog" current="0" total="{total_ctrl}" label="Progreso de exploración" show-fraction></upao-progress>

<upao-example title="Ejemplo trabajado de referencia">
  <upao-steps>
    <ol>
      <li><strong>Paso guiado:</strong> {esc(ejemplo.get("paso", ""))}</li>
      <li><strong>Resultado esperado:</strong> {esc(ejemplo.get("resultado", ""))}</li>
    </ol>
  </upao-steps>
</upao-example>

<section class="ova-card">
  <h2>🛠️ Panel de Experimentación</h2>
  <p class="ova-muted" style="margin-bottom:12px;font-size:0.9rem">
    Ajusta cada control deslizante o pulsa los botones (+/−) para alterar los parámetros y analizar la respuesta reactiva del sistema.
  </p>
  <div class="ova-sim-grid">
    <div class="ova-controls-col">
      {controls_html}
      <div class="ova-sim-toolbar">
        <button type="button" class="ova-btn-ghost" id="btn-reset-sim" aria-label="Restablecer controles a sus valores por defecto">
          <span>↺ Restablecer valores</span>
        </button>
      </div>
    </div>
    <div class="ova-diagram-col">
      <upao-figure caption="Diagrama reactivo: dinámica de causa y efecto del sistema">
        {svg_html}
      </upao-figure>
      <div class="ova-status-wrap">
        <upao-status id="sim-status" state="info">Mueve los controles para observar la dinámica causa-efecto en tiempo real.</upao-status>
      </div>
    </div>
  </div>
</section>

<upao-summary title="Cierre conceptual">
  <p>{esc(data.get("cierre_conceptual", ""))}</p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script(_SIM_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_controls"]
    catalog = [
        {
            "id": "tam_buffer",
            "etiqueta": "Tamaño del Buffer Cache",
            "min": 16,
            "max": 256,
            "default": 64,
            "unidad": "MB",
            "descripcion": f"Memoria para retener bloques de {concept} y evitar lecturas físicas en disco."[
                :120
            ],
        },
        {
            "id": "concurrencia",
            "etiqueta": "Consultas Concurrentes",
            "min": 5,
            "max": 150,
            "default": 40,
            "unidad": "sesiones",
            "descripcion": f"Peticiones simultáneas que compiten por los recursos de {concept}."[
                :120
            ],
        },
        {
            "id": "retencion_lru",
            "etiqueta": "Umbral de Retención LRU",
            "min": 1,
            "max": 30,
            "default": 10,
            "unidad": "segundos",
            "descripcion": f"Tiempo de persistencia de bloques de {concept} antes de desalojo."[
                :120
            ],
        },
    ]
    controles = catalog[:n]
    return {
        "titulo": f"Simulador Causa-Efecto: {concept}"[:70],
        "objetivo": f"Descubrir la relación causa-efecto entre recursos y rendimiento en {concept}."[
            :160
        ],
        "controles": controles,
        "ejemplo_trabajado": {
            "paso": f"Asignar 128 MB al buffer cache con 40 sesiones concurrentes en {concept}."[
                :140
            ],
            "resultado": "La tasa de aciertos sube al 85% y las lecturas en disco caen drásticamente."[
                :140
            ],
        },
        "cierre_conceptual": (
            f"El simulador demuestra el principio causa-efecto fundamental en {concept}: "
            "aumentar la memoria asignada reduce el cuello de botella de I/O en disco, "
            "pero una concurrencia desmedida introduce contención que neutraliza las ganancias."
        )[:300],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=10,
    title="Simulador Intuitivo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
