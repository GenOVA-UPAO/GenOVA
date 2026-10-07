"""EXPLORE 6 — Simulador de Slider: simulación interactiva de parámetros de motor de BD con zonas de rendimiento."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.icons import icon
from ova_engine.schema import arr, i, obj, s

PARAMS = (
    Param("num_zones", 3, min=3, max=4, help="Número de zonas operativas"),
)


def schema(p: dict) -> dict:
    n = p["num_zones"]
    return obj(
        titulo=s(70),
        parametro=s(40),
        unidad=s(20),
        min_val=i(),
        max_val=i(),
        default_val=i(),
        zonas=arr(
            obj(
                nombre=s(40),
                rango=s(30),
                estado=s(20),
                descripcion=s(140),
                efecto=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        explicacion_optima=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_zones"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador de simuladores interactivos de afinamiento de bases de datos para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un simulador interactivo de slider sobre un parámetro técnico del motor de bases de datos directamente vinculado a «{concept}» (ej. DB_CACHE_SIZE, SHARED_POOL_SIZE, LOG_BUFFER, concurrencia de sesiones, frecuencia de checkpoint o PCTFREE). El simulador debe definir exactamente {n} zonas de rendimiento continuas que ilustren el comportamiento del sistema al variar este parámetro.
- titulo: título conciso del simulador (≤10 palabras).
- parametro: nombre técnico del parámetro del motor a afinar (≤4 palabras, ej. 'DB_CACHE_SIZE', 'Concurrencia de Sesiones', 'Frecuencia de Checkpoint').
- unidad: unidad de medida del parámetro (≤2 palabras, ej. 'MB', 'sesiones', 'segundos', '%').
- min_val: valor entero mínimo representativo del rango (ej. 64).
- max_val: valor entero máximo representativo del rango (ej. 1024; debe ser mayor que min_val).
- default_val: valor entero por defecto inicial dentro del rango (preferiblemente en la primera zona para invitar a explorar).
- zonas: array de exactamente {n} zonas consecutivas de operación que cubren de min_val a max_val. Por cada zona:
  * `nombre`: nombre corto de la zona (≤5 palabras, ej. 'Subdimensionado', 'Zona Óptima', 'Saturación').
  * `rango`: intervalo numérico de la zona (≤4 palabras, ej. '64 - 256 MB').
  * `estado`: estado operativo para el indicador ('warning', 'success', 'error' o 'info').
  * `descripcion`: qué ocurre internamente en el motor de bases de datos en esta zona (≤20 palabras).
  * `efecto`: impacto observable en rendimiento, latencia o contención (≤20 palabras).
- explicacion_optima: explicación técnica clara (≤45 palabras) que justifique por qué la zona óptima equilibra el rendimiento y describe el dilema técnico (trade-off) de los extremos.
[RESTRICCIONES] Valores enteros en min_val, max_val y default_val, con min_val < max_val. Las {n} zonas deben ser continuas y cubrir todo el rango. Sin código web ni etiquetas de formato.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador de simuladores interactivos de parámetros de «{concept}» para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un simulador interactivo de slider sobre un parámetro numérico directamente vinculado a «{concept}» (ej. una cantidad, una temperatura, una velocidad, una concentración o un tiempo, según el tema). El simulador debe definir exactamente {n} zonas de rendimiento continuas que ilustren el comportamiento del sistema al variar este parámetro.
- titulo: título conciso del simulador (≤10 palabras).
- parametro: nombre del parámetro que el estudiante ajusta (≤4 palabras, ej. 'Temperatura', 'Velocidad', 'Concentración').
- unidad: unidad de medida del parámetro (≤2 palabras, ej. 'MB', 'sesiones', 'segundos', '%').
- min_val: valor entero mínimo representativo del rango (ej. 64).
- max_val: valor entero máximo representativo del rango (ej. 1024; debe ser mayor que min_val).
- default_val: valor entero por defecto inicial dentro del rango (preferiblemente en la primera zona para invitar a explorar).
- zonas: array de exactamente {n} zonas consecutivas de operación que cubren de min_val a max_val. Por cada zona:
  * `nombre`: nombre corto de la zona (≤5 palabras, ej. 'Subdimensionado', 'Zona Óptima', 'Saturación').
  * `rango`: intervalo numérico de la zona (≤4 palabras, ej. '64 - 256 MB').
  * `estado`: estado operativo para el indicador ('warning', 'success', 'error' o 'info').
  * `descripcion`: qué ocurre en el sistema estudiado en esta zona (≤20 palabras).
  * `efecto`: impacto observable en rendimiento, latencia o contención (≤20 palabras).
- explicacion_optima: explicación técnica clara (≤45 palabras) que justifique por qué la zona óptima equilibra el rendimiento y describe el dilema técnico (trade-off) de los extremos.
[RESTRICCIONES] Valores enteros en min_val, max_val y default_val, con min_val < max_val. Las {n} zonas deben ser continuas y cubrir todo el rango. Sin código web ni etiquetas de formato.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_zones", 3)
    if n == 4:
        zonas = [
            {
                "nombre": "Crítico Insuficiente",
                "rango": "64 - 128 MB",
                "estado": "error",
                "descripcion": "Espacio minúsculo incapaz de retener bloques frecuentes en RAM.",
                "efecto": "Saturación de E/S con más de 98% de accesos forzados a disco físico.",
            },
            {
                "nombre": "Subdimensionado",
                "rango": "128 - 384 MB",
                "estado": "warning",
                "descripcion": "Capacidad ajustada que sufre desalojo prematuro por política LRU.",
                "efecto": "Hit ratio variable (~70%) con latencia apreciable en consultas.",
            },
            {
                "nombre": "Zona Óptima",
                "rango": "384 - 768 MB",
                "estado": "success",
                "descripcion": "Equilibrio ideal para retener tablas frecuentes y bloques calientes.",
                "efecto": "Hit ratio superior al 95% y estabilidad térmica sin colas de disco.",
            },
            {
                "nombre": "Sobredimensionado",
                "rango": "768 - 1024 MB",
                "estado": "warning",
                "descripcion": "Retorno decreciente con aumento de contención de latches en memoria.",
                "efecto": "Desperdicio de RAM para otros pools y riesgo de swapping del SO.",
            },
        ]
    else:
        zonas = [
            {
                "nombre": "Subdimensionado",
                "rango": "64 - 256 MB",
                "estado": "warning",
                "descripcion": "El buffer cache no retiene los bloques de datos frecuentes en memoria RAM.",
                "efecto": "Alta tasa de lectura física en disco y aumento severo de latencia I/O.",
            },
            {
                "nombre": "Zona Óptima",
                "rango": "256 - 768 MB",
                "estado": "success",
                "descripcion": "Equilibrio ideal entre aciertos en memoria y consumo global de RAM.",
                "efecto": "Tasa de hit ratio superior al 95% con uso eficiente de recursos.",
            },
            {
                "nombre": "Sobredimensionado",
                "rango": "768 - 1024 MB",
                "estado": "error",
                "descripcion": "Asignación excesiva que despoja de memoria a otros componentes del sistema.",
                "efecto": "Riesgo de paginación del SO y mayor sobrecarga en gestión de buffers.",
            },
        ]

    return {
        "titulo": f"Simulador de Parámetro: {concept}"[:70],
        "parametro": "DB_CACHE_SIZE",
        "unidad": "MB",
        "min_val": 64,
        "max_val": 1024,
        "default_val": 192,
        "zonas": zonas[:n],
        "explicacion_optima": (
            "El punto óptimo retiene los bloques calientes en memoria evitando lecturas a disco, "
            "sin sobreasignar RAM ni provocar swapping o contención de latches en el sistema operativo."
        )[:300],
    }


_STYLE = """
<style>
.ova-slider-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ova-panel {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f2);
  border-radius: var(--radius, 12px);
  padding: clamp(16px, 3vw, 24px);
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.06));
}
.ova-slider-control-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ova-slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.ova-param-name {
  font-family: var(--font-display, system-ui);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.ova-val-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  background: var(--surface-tint, #EAF0FB);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border, #e2e8f2);
}
.ova-val-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary, #0A3D91);
  font-variant-numeric: tabular-nums;
}
.ova-val-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted, #5A6B85);
}
.ova-slider-track-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ova-range-input {
  width: 100%;
  height: 44px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--primary, #0A3D91);
}
.ova-range-bounds {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted, #5A6B85);
}
.ova-chips-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ova-zone-chip {
  flex: 1 1 calc(33.33% - 8px);
  min-width: 130px;
  min-height: 44px;
  padding: 8px 12px;
  background: var(--surface-2, #f8fafc);
  border: 1.5px solid var(--border, #e2e8f2);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text, #15233B);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color .2s, background-color .2s, transform .15s;
}
.ova-zone-chip:hover {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
}
.ova-zone-chip.is-active {
  border-color: var(--primary, #0A3D91);
  background: var(--primary, #0A3D91);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(10,61,145,.25);
}
.ova-zone-chip.is-active .ova-chip-badge {
  background: #ffffff;
  color: var(--primary, #0A3D91);
}
.ova-chip-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}
.ova-zone-diagnostics {
  background: var(--surface-2, #f8fafc);
  border-left: 4px solid var(--primary, #0A3D91);
  border-radius: var(--radius-sm, 8px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ova-diag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.ova-zone-title-text {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text, #15233B);
}
.ova-diag-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  font-size: 0.92rem;
  line-height: 1.5;
}
@media (min-width: 640px) {
  .ova-diag-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
}
.ova-diag-item strong {
  display: block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #5A6B85);
  margin-bottom: 2px;
}
.ova-svg-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ova-svg-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.ova-svg-heading {
  font-family: var(--font-display, system-ui);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.ova-svg-legends {
  display: flex;
  gap: 14px;
  font-size: 0.82rem;
  font-weight: 600;
  flex-wrap: wrap;
}
.ova-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ova-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.ova-dot-hit { background: var(--success, #146C49); }
.ova-dot-lat { background: var(--danger, #B42332); }
.ova-chart-container {
  width: 100%;
  overflow: hidden;
  background: #ffffff;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border, #e2e8f2);
}
.ova-chart-svg {
  display: block;
  width: 100%;
  height: auto;
}
.ova-hypothesis-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ova-hypothesis-prompt {
  font-size: 0.95rem;
  color: var(--text, #15233B);
  line-height: 1.5;
}
.ova-textarea {
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--border, #e2e8f2);
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  box-sizing: border-box;
  resize: vertical;
  background: var(--surface, #ffffff);
  color: var(--text, #15233B);
}
.ova-textarea:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 1px;
}
.ova-btn-contrast {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 24px;
  background: var(--action, #B84B00);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(184,75,0,.25);
  transition: all .2s ease;
}
.ova-btn-contrast:hover {
  background: var(--accent-hover, #923B00);
  transform: translateY(-1px);
}
.ova-btn-contrast:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-btn-contrast.is-revealed {
  background: var(--primary, #0A3D91);
  box-shadow: none;
}
.ova-optimal-box {
  background: var(--accent-tint, #FDEEE0);
  border-left: 4px solid var(--accent, #F47A20);
  border-radius: var(--radius-sm, 8px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: upao-in .35s ease both;
}
.ova-optimal-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--action, #B84B00);
}
.ova-optimal-heading {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.ova-optimal-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text, #15233B);
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


def render(data: dict, ctx: RenderContext) -> str:
    zonas = data["zonas"]
    total = len(zonas)
    min_val = data["min_val"]
    max_val = data["max_val"]
    default_val = data["default_val"]
    unidad = esc(data["unidad"])
    parametro = esc(data["parametro"])

    chips_html = "".join(
        f'<button type="button" class="ova-zone-chip{" is-active" if k == 0 else ""}" '
        f'data-zone-index="{k}" id="zone-chip-{k + 1}" role="tab" aria-selected="{"true" if k == 0 else "false"}">'
        f'<span class="ova-chip-badge">{k + 1}</span>'
        f'<span>{esc(z["nombre"])}</span>'
        f"</button>"
        for k, z in enumerate(zonas)
    )

    plot_left = 60
    plot_width = 520
    zone_w = plot_width / total if total else plot_width
    svg_zones_bg = []
    svg_zones_labels = []
    for k, z in enumerate(zonas):
        zx = plot_left + k * zone_w
        bg_color = (
            "rgba(20,108,73,0.08)"
            if "opt" in z.get("estado", "").lower() or "succ" in z.get("estado", "").lower()
            else ("rgba(180,35,50,0.08)" if "err" in z.get("estado", "").lower() else "rgba(10,61,145,0.04)")
        )
        svg_zones_bg.append(
            f'<rect x="{zx:.1f}" y="30" width="{zone_w:.1f}" height="160" fill="{bg_color}" />'
        )
        if k > 0:
            svg_zones_bg.append(
                f'<line x1="{zx:.1f}" y1="30" x2="{zx:.1f}" y2="190" stroke="var(--border, #e2e8f2)" stroke-dasharray="3 3"/>'
            )
        svg_zones_labels.append(
            f'<text x="{zx + zone_w / 2:.1f}" y="208" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-muted, #5A6B85)">{esc(z["nombre"])}</text>'
        )

    svg_content = f"""
<svg id="ova-metrics-svg" viewBox="0 0 640 230" class="ova-chart-svg" role="img" aria-label="Gráfico de rendimiento frente a {parametro}">
  <rect width="640" height="230" fill="transparent"/>
  {"".join(svg_zones_bg)}
  <line x1="{plot_left}" y1="190" x2="{plot_left + plot_width}" y2="190" stroke="var(--text-muted, #5A6B85)" stroke-width="1"/>
  <line x1="{plot_left}" y1="30" x2="{plot_left}" y2="190" stroke="var(--text-muted, #5A6B85)" stroke-width="1"/>
  <path id="svg-hit-path" d="M 60 160 C 180 150, 240 50, 360 45 L 580 45" fill="none" stroke="var(--success, #146C49)" stroke-width="3" stroke-linecap="round"/>
  <path id="svg-lat-path" d="M 60 45 C 160 55, 220 160, 360 165 C 440 165, 520 155, 580 115" fill="none" stroke="var(--danger, #B42332)" stroke-width="3" stroke-linecap="round"/>
  <line id="ova-svg-cursor" x1="60" y1="30" x2="60" y2="190" stroke="var(--primary, #0A3D91)" stroke-width="2.5" stroke-dasharray="4 2"/>
  <circle id="ova-svg-hit-dot" cx="60" cy="160" r="5" fill="var(--success, #146C49)" stroke="#ffffff" stroke-width="2"/>
  <circle id="ova-svg-lat-dot" cx="60" cy="45" r="5" fill="var(--danger, #B42332)" stroke="#ffffff" stroke-width="2"/>
  <g transform="translate(60, 20)">
    <text id="ova-svg-metric-hit" x="0" y="0" font-size="12" font-weight="700" fill="var(--success, #146C49)">Aciertos: --%</text>
    <text id="ova-svg-metric-lat" x="180" y="0" font-size="12" font-weight="700" fill="var(--danger, #B42332)">Latencia: -- ms</text>
  </g>
  {"".join(svg_zones_labels)}
</svg>
"""

    return f"""
{_STYLE}
<upao-header eyebrow="SIMULADOR DE SLIDER" title="{esc(data["titulo"])}">
  <p>Explora cómo responde el motor de base de datos ajustando el parámetro <strong>{parametro}</strong> ({unidad}) a lo largo de sus zonas de rendimiento.</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total}" label="Zonas exploradas" show-fraction></upao-progress>

<div class="ova-slider-container">
  <section class="ova-panel ova-slider-control-card" aria-labelledby="slider-control-title">
    <div class="ova-slider-head">
      <h2 id="slider-control-title" class="ova-param-name">Parámetro: {parametro}</h2>
      <div class="ova-val-badge">
        <span class="sr-only">Valor actual:</span>
        <span id="ova-val-display" class="ova-val-num">{esc(default_val)}</span>
        <span class="ova-val-unit">{unidad}</span>
      </div>
    </div>

    <div class="ova-slider-track-wrap">
      <label for="ova-param-range" class="sr-only">Ajustar {parametro}</label>
      <input type="range" id="ova-param-range" class="ova-range-input"
             min="{min_val}" max="{max_val}" value="{default_val}" step="1"
             aria-valuemin="{min_val}" aria-valuemax="{max_val}" aria-valuenow="{default_val}">
      <div class="ova-range-bounds">
        <span>{min_val} {unidad}</span>
        <span>{max_val} {unidad}</span>
      </div>
    </div>

    <div class="ova-chips-row" role="tablist" aria-label="Zonas de operación">
      {chips_html}
    </div>

    <div class="ova-zone-diagnostics" aria-live="polite">
      <div class="ova-diag-head">
        <upao-status id="ova-zone-status" state="info">Zona Inicial</upao-status>
        <span id="ova-zone-title" class="ova-zone-title-text"></span>
      </div>
      <div class="ova-diag-grid">
        <div class="ova-diag-item">
          <strong>Mecanismo Interno</strong>
          <span id="ova-zone-desc"></span>
        </div>
        <div class="ova-diag-item">
          <strong>Impacto Observable</strong>
          <span id="ova-zone-effect"></span>
        </div>
      </div>
    </div>
  </section>

  <section class="ova-panel ova-svg-card" aria-labelledby="chart-title">
    <div class="ova-svg-top">
      <h2 id="chart-title" class="ova-svg-heading">Dinámica de Rendimiento y Latencia</h2>
      <div class="ova-svg-legends">
        <span class="ova-legend-pill">
          <span class="ova-legend-dot ova-dot-hit" aria-hidden="true"></span> Tasa de Aciertos
        </span>
        <span class="ova-legend-pill">
          <span class="ova-legend-dot ova-dot-lat" aria-hidden="true"></span> Latencia E/S
        </span>
      </div>
    </div>
    <div class="ova-chart-container">
      {svg_content}
    </div>
  </section>

  <section class="ova-panel ova-hypothesis-panel" aria-labelledby="hypo-heading">
    <div class="ova-diag-head">
      <h2 id="hypo-heading" class="ova-param-name">Hipótesis y Revelación Técnica</h2>
    </div>
    <p class="ova-hypothesis-prompt">Antes de revelar la zona óptima teórica, formula tu predicción técnica: ¿en qué rango consideras que este parámetro maximiza el rendimiento y qué dilema surge si nos excedemos?</p>
    <label for="ova-hypothesis-input" class="sr-only">Tu hipótesis sobre la zona óptima</label>
    <textarea id="ova-hypothesis-input" class="ova-textarea" rows="2" placeholder="Escribe tu hipótesis: creo que el valor óptimo está en... porque..."></textarea>
    <div>
      <button type="button" id="ova-btn-contrast" class="ova-btn-contrast" aria-expanded="false">
        <span aria-hidden="true">{icon('bulb')}</span> Contrastar hipótesis y revelar zona óptima
      </button>
    </div>
    <div id="ova-optimal-box" class="ova-optimal-box" hidden aria-live="polite">
      <div class="ova-optimal-badge">✓ Fundamento de la Zona Óptima</div>
      <h3 class="ova-optimal-heading">Comportamiento Ideal del Motor</h3>
      <p class="ova-optimal-desc">{esc(data["explicacion_optima"])}</p>
    </div>
  </section>
</div>

<upao-summary title="Síntesis de Exploración">
  <p>Afinar parámetros como <strong>{parametro}</strong> requiere contrastar las ganancias de rendimiento frente a la contención de memoria y la sobrecarga del sistema.</p>
  <upao-complete slot="actions" label="Finalizar simulación" locked></upao-complete>
</upao-summary>

{json_data(data, "ova-slider-data")}
{script(PROGRESS_JS)}
{script('''
(function() {
  const dataEl = document.getElementById('ova-slider-data');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);

  const minVal = Number(data.min_val);
  const maxVal = Number(data.max_val);
  const zonas = data.zonas || [];
  const totalZones = zonas.length;
  const span = (maxVal - minVal) || 1;

  const slider = document.getElementById('ova-param-range');
  const valDisplay = document.getElementById('ova-val-display');
  const statusEl = document.getElementById('ova-zone-status');
  const zoneTitleEl = document.getElementById('ova-zone-title');
  const zoneDescEl = document.getElementById('ova-zone-desc');
  const zoneEffectEl = document.getElementById('ova-zone-effect');
  const svgCursor = document.getElementById('ova-svg-cursor');
  const svgHitDot = document.getElementById('ova-svg-hit-dot');
  const svgLatDot = document.getElementById('ova-svg-lat-dot');
  const svgMetricHit = document.getElementById('ova-svg-metric-hit');
  const svgMetricLat = document.getElementById('ova-svg-metric-lat');
  const chips = document.querySelectorAll('.ova-zone-chip');
  const btnContrast = document.getElementById('ova-btn-contrast');
  const optimalBox = document.getElementById('ova-optimal-box');

  function mapState(raw) {
    const s = String(raw || '').toLowerCase().trim();
    if (['success', 'optimo', 'óptimo', 'optima', 'óptima', 'ideal'].some(k => s.includes(k))) return 'success';
    if (['error', 'critico', 'crítico', 'peligro', 'fallo', 'saturado', 'saturacion', 'saturación'].some(k => s.includes(k))) return 'error';
    if (['warning', 'alerta', 'advertencia', 'subdimensionado', 'suboptimo', 'subóptimo'].some(k => s.includes(k))) return 'warning';
    return 'info';
  }

  function getZoneIndex(val) {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const ratio = (clamped - minVal) / span;
    let idx = Math.floor(ratio * totalZones);
    if (idx >= totalZones) idx = totalZones - 1;
    return Math.max(0, idx);
  }

  function updateSimulation() {
    if (!slider) return;
    const currentVal = Number(slider.value);
    const ratio = Math.max(0, Math.min(1, (currentVal - minVal) / span));
    const zoneIdx = getZoneIndex(currentVal);
    const currentZone = zonas[zoneIdx] || {};

    if (valDisplay) valDisplay.textContent = currentVal;
    slider.setAttribute('aria-valuenow', currentVal);

    if (statusEl) {
      statusEl.setAttribute('state', mapState(currentZone.estado));
      statusEl.textContent = currentZone.nombre || ('Zona ' + (zoneIdx + 1));
    }
    if (zoneTitleEl) {
      zoneTitleEl.textContent = (currentZone.nombre || '') + (currentZone.rango ? ' (' + currentZone.rango + ')' : '');
    }
    if (zoneDescEl) {
      zoneDescEl.textContent = currentZone.descripcion || '';
    }
    if (zoneEffectEl) {
      zoneEffectEl.textContent = currentZone.efecto || '';
    }

    chips.forEach(function(chip, i) {
      if (i === zoneIdx) {
        chip.classList.add('is-active');
        chip.setAttribute('aria-selected', 'true');
      } else {
        chip.classList.remove('is-active');
        chip.setAttribute('aria-selected', 'false');
      }
    });

    const plotLeft = 60;
    const plotWidth = 520;
    const currentX = plotLeft + ratio * plotWidth;

    if (svgCursor) {
      svgCursor.setAttribute('x1', currentX);
      svgCursor.setAttribute('x2', currentX);
    }

    let hit = 20 + 78 / (1 + Math.exp(-12 * (ratio - 0.25)));
    if (hit > 99) hit = 99;
    let lat = 180 * Math.exp(-8 * ratio) + 3;
    if (ratio > 0.7) {
      lat += 45 * Math.pow((ratio - 0.7) / 0.3, 2);
    }

    const yHit = 190 - (hit / 100) * 150;
    const yLat = 190 - (Math.min(200, lat) / 200) * 150;

    if (svgHitDot) {
      svgHitDot.setAttribute('cx', currentX);
      svgHitDot.setAttribute('cy', yHit);
    }
    if (svgLatDot) {
      svgLatDot.setAttribute('cx', currentX);
      svgLatDot.setAttribute('cy', yLat);
    }
    if (svgMetricHit) {
      svgMetricHit.textContent = 'Aciertos: ' + Math.round(hit) + '%';
    }
    if (svgMetricLat) {
      svgMetricLat.textContent = 'Latencia: ' + Math.round(lat) + ' ms';
    }

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('zone-' + (zoneIdx + 1));
    }
  }

  if (slider) {
    slider.addEventListener('input', updateSimulation);
  }

  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      const idx = Number(chip.getAttribute('data-zone-index'));
      if (!isNaN(idx) && idx >= 0 && idx < totalZones) {
        const targetRatio = (idx + 0.5) / totalZones;
        const targetVal = Math.round(minVal + targetRatio * span);
        if (slider) {
          slider.value = targetVal;
          updateSimulation();
        }
      }
    });
  });

  if (btnContrast) {
    btnContrast.addEventListener('click', function() {
      if (optimalBox) {
        optimalBox.hidden = false;
      }
      btnContrast.setAttribute('aria-expanded', 'true');
      btnContrast.classList.add('is-revealed');
      btnContrast.innerHTML = '<span aria-hidden="true">✓</span> Hipótesis contrastada';

      document.querySelectorAll('upao-complete[locked]').forEach(function(b) {
        if (typeof b.unlock === 'function') {
          b.unlock();
        } else {
          b.removeAttribute('locked');
        }
      });

      if (optimalBox) {
        optimalBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  updateSimulation();
})();
''')}
"""


SPEC = TemplateSpec(
    phase="explore",
    rt=6,
    title="Simulador de Slider",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
