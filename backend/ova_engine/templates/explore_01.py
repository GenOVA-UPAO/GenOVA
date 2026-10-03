"""EXPLORE 1 — Simulador Virtual Lab: laboratorio interactivo de mecanismos internos de BD.

Permite al estudiante explorar transiciones de estados (memoria, buffer cache,
políticas LRU, dirty blocks, redo logs y persistencia) mediante acciones interactivas.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_iterations",
        3,
        min=3,
        max=5,
        help="Número de iteraciones mínimas del laboratorio",
    ),
)


def schema(p: dict) -> dict:
    return obj(
        titulo=s(70),
        objetivo=s(160),
        concepto_mecanismo=s(200),
        controles=arr(
            obj(
                id=s(20),
                accion=s(50),
                descripcion=s(140),
            ),
            2,
            4,
        ),
        ejemplo_trabajado=s(250),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p.get("num_iterations", 3)
    return f"""[ROL] Diseñador de laboratorios virtuales y simulaciones de mecanismos internos de bases de datos.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña un laboratorio interactivo para explorar el mecanismo interno de «{concept}» (ej. bloques que entran y salen del buffer cache por LRU, registros redo que LGWR vuelca a disco, transacciones adquiriendo y liberando bloqueos en cascada, o división de nodos en índices B-tree). Se requerirán al menos {n} iteraciones del estudiante.
- titulo: título conciso del laboratorio (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras, qué mecanismo comprenderá el estudiante).
- concepto_mecanismo: explicación concisa del mecanismo interno y cómo responde a las acciones (≤35 palabras).
- controles: entre 2 y 4 acciones interactivas que el estudiante puede ejecutar en la simulación. Por cada control:
  * `id`: identificador breve en minúsculas sin espacios (≤15 caracteres, ej. "leer_bloque", "modificar", "checkpoint", "commit").
  * `accion`: verbo o acción observable en el botón (≤6 palabras, ej. "Leer bloque A (Disk Read)").
  * `descripcion`: efecto concreto de esta acción en el estado visual del mecanismo (≤22 palabras).
- ejemplo_trabajado: caso de referencia guiado que describe una iteración típica paso a paso y su efecto observable (≤40 palabras).
- sintesis: conclusión o idea clave que consolida el principio interno observado tras completar las iteraciones (≤40 palabras).
[RESTRICCIONES] Enfatiza los estados internos y la dinámica causa-efecto del motor de bases de datos. Sin fórmulas abstractas. Tono riguroso pero accesible.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-lab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.ova-lab-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 16px;
}
@media (min-width: 920px) {
  .ova-lab-layout {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }
}
.ova-controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ova-controls-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ova-control-item {
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 10px);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ova-action-btn {
  width: 100%;
  min-height: 44px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  background: var(--primary, #0A3D91);
  color: #ffffff;
  border: none;
  border-radius: var(--radius, 8px);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ova-action-btn:hover {
  filter: brightness(1.1);
}
.ova-control-desc {
  font-size: 0.825rem;
  line-height: 1.4;
  margin: 0;
}
.ova-metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-block: 14px 16px;
}
.ova-metric-box {
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 8px);
  padding: 10px 12px;
  text-align: center;
}
.ova-metric-val {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
  font-variant-numeric: tabular-nums;
}
.ova-metric-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.ova-diagram-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.ova-svg-container {
  width: 100%;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 8px;
  overflow: hidden;
}
.ova-svg-canvas {
  width: 100%;
  height: auto;
  display: block;
}
.ova-inspector-box {
  padding: 12px 14px;
  background: var(--surface-2, #f8fafc);
  border-left: 4px solid var(--primary, #0A3D91);
  border-radius: 0 var(--radius, 8px) var(--radius, 8px) 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
.ova-log-container {
  margin-top: 4px;
}
.ova-log-list {
  list-style: none;
  padding: 8px 12px;
  margin: 0;
  max-height: 110px;
  overflow-y: auto;
  font-size: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 8px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ova-log-list li {
  padding-block: 2px;
  border-bottom: 1px dashed var(--border, #e2e8f0);
  color: var(--text, #1e293b);
}
</style>
"""

_SVG_DIAGRAM = """
<svg class="ova-svg-canvas" viewBox="0 0 740 370" role="img" aria-label="Diagrama del motor de base de datos con Buffer Cache, Redo Log y Almacenamiento">
  <defs>
    <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0A3D91"/>
    </marker>
    <marker id="arrow-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7"/>
    </marker>
    <marker id="arrow-down-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706"/>
    </marker>
  </defs>

  <!-- SGA Frame: Buffer Cache -->
  <rect x="20" y="20" width="460" height="205" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>
  <text x="35" y="44" font-size="13" font-weight="700" fill="#0A3D91">SGA: Database Buffer Cache</text>
  <text x="35" y="60" font-size="10" fill="#64748b">Cola LRU: Head (MRU) ➔ Tail (LRU víctima)</text>

  <!-- 4 Buffer Slots -->
  <g id="svg-slot-group-0">
    <rect id="svg-slot-bg-0" x="35" y="72" width="98" height="135" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="84" y="92" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Slot 0</text>
    <rect id="svg-slot-block-box-0" x="47" y="102" width="74" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text id="svg-slot-block-id-0" x="84" y="125" text-anchor="middle" font-size="12" font-weight="700" fill="#94a3b8">Vacío</text>
    <rect id="svg-slot-badge-0" x="47" y="148" width="74" height="20" rx="4" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text id="svg-slot-status-0" x="84" y="162" text-anchor="middle" font-size="9" font-weight="700" fill="#64748b">LIBRE</text>
    <text id="svg-slot-lru-0" x="84" y="192" text-anchor="middle" font-size="9" fill="#64748b">Sin bloque</text>
  </g>

  <g id="svg-slot-group-1">
    <rect id="svg-slot-bg-1" x="143" y="72" width="98" height="135" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="192" y="92" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Slot 1</text>
    <rect id="svg-slot-block-box-1" x="155" y="102" width="74" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text id="svg-slot-block-id-1" x="192" y="125" text-anchor="middle" font-size="12" font-weight="700" fill="#94a3b8">Vacío</text>
    <rect id="svg-slot-badge-1" x="155" y="148" width="74" height="20" rx="4" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text id="svg-slot-status-1" x="192" y="162" text-anchor="middle" font-size="9" font-weight="700" fill="#64748b">LIBRE</text>
    <text id="svg-slot-lru-1" x="192" y="192" text-anchor="middle" font-size="9" fill="#64748b">Sin bloque</text>
  </g>

  <g id="svg-slot-group-2">
    <rect id="svg-slot-bg-2" x="251" y="72" width="98" height="135" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="300" y="92" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Slot 2</text>
    <rect id="svg-slot-block-box-2" x="263" y="102" width="74" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text id="svg-slot-block-id-2" x="300" y="125" text-anchor="middle" font-size="12" font-weight="700" fill="#94a3b8">Vacío</text>
    <rect id="svg-slot-badge-2" x="263" y="148" width="74" height="20" rx="4" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text id="svg-slot-status-2" x="300" y="162" text-anchor="middle" font-size="9" font-weight="700" fill="#64748b">LIBRE</text>
    <text id="svg-slot-lru-2" x="300" y="192" text-anchor="middle" font-size="9" fill="#64748b">Sin bloque</text>
  </g>

  <g id="svg-slot-group-3">
    <rect id="svg-slot-bg-3" x="359" y="72" width="98" height="135" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="408" y="92" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Slot 3</text>
    <rect id="svg-slot-block-box-3" x="371" y="102" width="74" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text id="svg-slot-block-id-3" x="408" y="125" text-anchor="middle" font-size="12" font-weight="700" fill="#94a3b8">Vacío</text>
    <rect id="svg-slot-badge-3" x="371" y="148" width="74" height="20" rx="4" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text id="svg-slot-status-3" x="408" y="162" text-anchor="middle" font-size="9" font-weight="700" fill="#64748b">LIBRE</text>
    <text id="svg-slot-lru-3" x="408" y="192" text-anchor="middle" font-size="9" fill="#64748b">Sin bloque</text>
  </g>

  <!-- Redo Log Buffer Frame -->
  <rect x="500" y="20" width="220" height="205" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>
  <text x="515" y="44" font-size="13" font-weight="700" fill="#0A3D91">Redo Log Buffer</text>
  <text x="515" y="60" font-size="10" fill="#64748b">Write-Ahead Logging (WAL)</text>

  <!-- 3 Redo Slots -->
  <rect id="svg-redo-bg-0" x="515" y="74" width="190" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text id="svg-redo-text-0" x="610" y="97" text-anchor="middle" font-size="10" fill="#94a3b8">(Sin transacciones)</text>

  <rect id="svg-redo-bg-1" x="515" y="118" width="190" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text id="svg-redo-text-1" x="610" y="141" text-anchor="middle" font-size="10" fill="#94a3b8">(Sin transacciones)</text>

  <rect id="svg-redo-bg-2" x="515" y="162" width="190" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text id="svg-redo-text-2" x="610" y="185" text-anchor="middle" font-size="10" fill="#94a3b8">(Sin transacciones)</text>

  <!-- Arrows & Daemons -->
  <path d="M 120 270 L 120 233" stroke="#0284c7" stroke-width="2" marker-end="url(#arrow-up)" id="arrow-read"/>
  <text x="128" y="252" font-size="10" font-weight="700" fill="#0284c7">Lectura I/O (Disk Read)</text>

  <path d="M 280 230 L 280 267" stroke="#0A3D91" stroke-width="2" marker-end="url(#arrow-down)" id="arrow-dbwr"/>
  <text x="288" y="252" font-size="10" font-weight="700" fill="#0A3D91">DBWR (Escritura / Checkpoint)</text>

  <path d="M 610 230 L 610 267" stroke="#d97706" stroke-width="2" marker-end="url(#arrow-down-amber)" id="arrow-lgwr"/>
  <text x="618" y="252" font-size="10" font-weight="700" fill="#d97706">LGWR (Vuelco de Redo)</text>

  <!-- Persistent Storage Frame (Disco) -->
  <rect x="20" y="275" width="460" height="85" rx="10" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="35" y="295" font-size="11" font-weight="700" fill="#334155">Almacenamiento Persistente (Datafiles)</text>

  <rect x="35" y="306" width="98" height="42" rx="6" fill="#ffffff" stroke="#94a3b8"/>
  <text x="84" y="324" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Bloque 101</text>
  <text x="84" y="338" text-anchor="middle" font-size="9" fill="#15803d">En disco ✓</text>

  <rect x="143" y="306" width="98" height="42" rx="6" fill="#ffffff" stroke="#94a3b8"/>
  <text x="192" y="324" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Bloque 102</text>
  <text x="192" y="338" text-anchor="middle" font-size="9" fill="#15803d">En disco ✓</text>

  <rect x="251" y="306" width="98" height="42" rx="6" fill="#ffffff" stroke="#94a3b8"/>
  <text x="300" y="324" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Bloque 103</text>
  <text x="300" y="338" text-anchor="middle" font-size="9" fill="#15803d">En disco ✓</text>

  <rect x="359" y="306" width="98" height="42" rx="6" fill="#ffffff" stroke="#94a3b8"/>
  <text x="408" y="324" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Bloque 104</text>
  <text x="408" y="338" text-anchor="middle" font-size="9" fill="#15803d">En disco ✓</text>

  <!-- Redo Log Files (Disco) -->
  <rect x="500" y="275" width="220" height="85" rx="10" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="515" y="295" font-size="11" font-weight="700" fill="#334155">Archivos Redo Log (Disco)</text>
  <rect id="svg-disk-redo" x="515" y="306" width="190" height="42" rx="6" fill="#ffffff" stroke="#94a3b8"/>
  <text id="svg-disk-redo-text" x="610" y="332" text-anchor="middle" font-size="10" fill="#475569">Grupo Redo #1 (En línea)</text>
</svg>
"""

_LAB_JS = """
(function () {
  const progEl = document.getElementById('prog');
  const totalIterations = progEl ? parseInt(progEl.getAttribute('total') || '3', 10) : 3;
  let currentIterations = 0;

  const NUM_SLOTS = 4;
  const bufferSlots = [
    { id: null, state: 'empty', lru: 0, modCount: 0 },
    { id: null, state: 'empty', lru: 1, modCount: 0 },
    { id: null, state: 'empty', lru: 2, modCount: 0 },
    { id: null, state: 'empty', lru: 3, modCount: 0 },
  ];

  const diskBlocks = ['B-101', 'B-102', 'B-103', 'B-104', 'B-105', 'B-106'];
  let diskBlockIdx = 0;
  const redoEntries = [];

  const metrics = {
    reads: 0,
    dirty: 0,
    writes: 0,
  };

  let selectedSlotIdx = 0;

  const statusEl = document.getElementById('lab-status');
  const iterBadge = document.getElementById('iter-badge');
  const metricReadsEl = document.getElementById('metric-reads');
  const metricDirtyEl = document.getElementById('metric-dirty');
  const metricWritesEl = document.getElementById('metric-writes');
  const inspectorEl = document.getElementById('slot-inspector');
  const logListEl = document.getElementById('lab-event-log');

  function addLog(text) {
    if (!logListEl) return;
    const li = document.createElement('li');
    const now = new Date();
    const timeStr = String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    li.textContent = '[' + timeStr + '] ' + text;
    logListEl.insertBefore(li, logListEl.firstChild);
    while (logListEl.children.length > 20) {
      logListEl.removeChild(logListEl.lastChild);
    }
  }

  function updateMetrics() {
    let dirtyCount = 0;
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (bufferSlots[i].state === 'dirty') dirtyCount++;
    }
    metrics.dirty = dirtyCount;

    if (metricReadsEl) metricReadsEl.textContent = String(metrics.reads);
    if (metricDirtyEl) metricDirtyEl.textContent = String(metrics.dirty);
    if (metricWritesEl) metricWritesEl.textContent = String(metrics.writes);
  }

  function updateSlotUI(slotIdx) {
    const s = bufferSlots[slotIdx];
    const bgEl = document.getElementById('svg-slot-bg-' + slotIdx);
    const idEl = document.getElementById('svg-slot-block-id-' + slotIdx);
    const statusTextEl = document.getElementById('svg-slot-status-' + slotIdx);
    const lruEl = document.getElementById('svg-slot-lru-' + slotIdx);
    const badgeEl = document.getElementById('svg-slot-badge-' + slotIdx);

    const stateLabels = {
      empty: 'LIBRE',
      clean: 'LIMPIO',
      dirty: 'SUCIO',
      synced: 'PERSISTIDO',
      locked: 'BLOQUEADO',
    };

    const stateColors = {
      empty: { bg: '#f1f5f9', stroke: '#cbd5e1', text: '#64748b' },
      clean: { bg: '#e0f2fe', stroke: '#0284c7', text: '#0369a1' },
      dirty: { bg: '#fef3c7', stroke: '#d97706', text: '#b45309' },
      synced: { bg: '#dcfce7', stroke: '#16a34a', text: '#15803d' },
      locked: { bg: '#f3e8ff', stroke: '#9333ea', text: '#7e22ce' },
    };

    const col = stateColors[s.state] || stateColors.empty;

    if (bgEl) {
      bgEl.setAttribute('fill', col.bg);
      bgEl.setAttribute('stroke', col.stroke);
      bgEl.setAttribute('stroke-width', slotIdx === selectedSlotIdx ? '3' : '1.5');
    }
    if (idEl) {
      idEl.textContent = s.id ? s.id : 'Vacío';
      idEl.setAttribute('fill', s.id ? '#0f172a' : '#94a3b8');
    }
    if (statusTextEl) {
      statusTextEl.textContent = stateLabels[s.state] || 'LIBRE';
      statusTextEl.setAttribute('fill', col.text);
    }
    if (badgeEl) {
      badgeEl.setAttribute('fill', col.bg);
      badgeEl.setAttribute('stroke', col.stroke);
    }
    if (lruEl) {
      lruEl.textContent = s.id ? ('LRU #' + s.lru + (s.lru === 0 ? ' (MRU)' : '')) : 'Sin bloque';
    }
  }

  function updateRedoUI() {
    for (let i = 0; i < 3; i++) {
      const txtEl = document.getElementById('svg-redo-text-' + i);
      const bgEl = document.getElementById('svg-redo-bg-' + i);
      if (!txtEl || !bgEl) continue;
      if (i < redoEntries.length) {
        txtEl.textContent = redoEntries[i];
        txtEl.setAttribute('fill', '#b45309');
        bgEl.setAttribute('fill', '#fef3c7');
        bgEl.setAttribute('stroke', '#d97706');
      } else {
        txtEl.textContent = '(Sin transacciones)';
        txtEl.setAttribute('fill', '#94a3b8');
        bgEl.setAttribute('fill', '#ffffff');
        bgEl.setAttribute('stroke', '#e2e8f0');
      }
    }
  }

  function updateInspector() {
    if (!inspectorEl) return;
    const s = bufferSlots[selectedSlotIdx];
    const desc = {
      empty: 'Ranura vacía lista para alojar un bloque.',
      clean: 'Bloque leído de disco. Idéntico a la copia en almacenamiento.',
      dirty: 'Bloque modificado en memoria (SGA). Requiere escritura a disco (DBWR).',
      synced: 'Bloque persistido a almacenamiento tras checkpoint o commit.',
      locked: 'Bloque con bloqueo exclusivo de transacción activa.',
    };
    const blockInfo = s.id ? ('Bloque: ' + s.id + ' | Estado: ' + s.state.toUpperCase() + ' | Modificaciones: ' + s.modCount + ' | Posición LRU: ' + s.lru) : 'Vacía';
    inspectorEl.textContent = 'Inspección de Ranura [Slot ' + selectedSlotIdx + ']: ' + blockInfo + ' — ' + (desc[s.state] || '');
  }

  function renderAll() {
    for (let i = 0; i < NUM_SLOTS; i++) {
      updateSlotUI(i);
    }
    updateRedoUI();
    updateMetrics();
    updateInspector();
  }

  function updateLRU(mruSlotIdx) {
    const oldLRU = bufferSlots[mruSlotIdx].lru;
    bufferSlots[mruSlotIdx].lru = 0;
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (i !== mruSlotIdx && bufferSlots[i].id) {
        if (bufferSlots[i].lru < oldLRU) {
          bufferSlots[i].lru += 1;
        }
      }
    }
  }

  function findLRUVictimSlot() {
    let emptyIdx = -1;
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (!bufferSlots[i].id) {
        emptyIdx = i;
        break;
      }
    }
    if (emptyIdx !== -1) return emptyIdx;

    let victimIdx = 0;
    let maxLRU = -1;
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (bufferSlots[i].lru > maxLRU) {
        maxLRU = bufferSlots[i].lru;
        victimIdx = i;
      }
    }
    return victimIdx;
  }

  function flashArrow(arrowId) {
    const arrow = document.getElementById(arrowId);
    if (!arrow) return;
    arrow.setAttribute('stroke-width', '4');
    setTimeout(function () {
      arrow.setAttribute('stroke-width', '2');
    }, 450);
  }

  function executeLoad() {
    const slotIdx = findLRUVictimSlot();
    const prevBlock = bufferSlots[slotIdx].id;
    const wasDirty = bufferSlots[slotIdx].state === 'dirty';

    if (wasDirty) {
      metrics.writes++;
      addLog('Escritura forzada: ' + prevBlock + ' expulsado por LRU y escrito a disco.');
    }

    const nextBlock = diskBlocks[diskBlockIdx % diskBlocks.length];
    diskBlockIdx++;

    bufferSlots[slotIdx] = {
      id: nextBlock,
      state: 'clean',
      lru: 0,
      modCount: 0,
    };
    updateLRU(slotIdx);
    metrics.reads++;
    selectedSlotIdx = slotIdx;

    flashArrow('arrow-read');
    addLog('Lectura I/O de disco: ' + nextBlock + ' cargado en Slot ' + slotIdx + ' (Limpio).');
    if (statusEl) {
      statusEl.setAttribute('state', 'info');
      statusEl.textContent = 'Bloque ' + nextBlock + ' cargado desde almacenamiento al Buffer Cache en la cabecera MRU.';
    }
  }

  function executeModify() {
    let targetIdx = selectedSlotIdx;
    if (!bufferSlots[targetIdx].id) {
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (bufferSlots[i].id) {
          targetIdx = i;
          break;
        }
      }
    }
    if (!bufferSlots[targetIdx].id) {
      executeLoad();
      targetIdx = selectedSlotIdx;
    }

    const s = bufferSlots[targetIdx];
    s.state = 'dirty';
    s.modCount += 1;
    updateLRU(targetIdx);
    selectedSlotIdx = targetIdx;

    const redoLog = 'LSN-' + (100 + redoEntries.length * 15) + ': MOD ' + s.id;
    if (redoEntries.length >= 3) redoEntries.shift();
    redoEntries.push(redoLog);

    flashArrow('arrow-lgwr');
    addLog('Modificación en memoria: ' + s.id + ' marcado como SUCIO (Dirty). Redo generado.');
    if (statusEl) {
      statusEl.setAttribute('state', 'warning');
      statusEl.textContent = 'El bloque ' + s.id + ' fue modificado en memoria (SGA). Marcado como sucio y registrado en Redo Log.';
    }
  }

  function executeCheckpoint() {
    let dirtyCount = 0;
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (bufferSlots[i].state === 'dirty') {
        bufferSlots[i].state = 'synced';
        dirtyCount++;
      }
    }

    metrics.writes += dirtyCount;
    redoEntries.length = 0;

    flashArrow('arrow-dbwr');
    if (dirtyCount > 0) {
      addLog('Checkpoint completado: ' + dirtyCount + ' bloques sucios persistidos a disco por DBWR.');
      if (statusEl) {
        statusEl.setAttribute('state', 'success');
        statusEl.textContent = 'Checkpoint ejecutado: ' + dirtyCount + ' bloque(s) sucios persistidos en los datafiles por DBWR.';
      }
    } else {
      addLog('Checkpoint ejecutado: el buffer ya estaba limpio (0 escrituras requeridas).');
      if (statusEl) {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = 'Checkpoint ejecutado: no había bloques sucios pendientes de persistir en memoria.';
      }
    }
  }

  function executeLock() {
    let targetIdx = selectedSlotIdx;
    if (!bufferSlots[targetIdx].id) {
      executeLoad();
      targetIdx = selectedSlotIdx;
    }
    const s = bufferSlots[targetIdx];
    if (s.state === 'locked') {
      s.state = 'clean';
      addLog('Bloqueo liberado (TX commit): ' + s.id + ' vuelve a estar disponible.');
      if (statusEl) {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = 'Transacción completada: bloqueo sobre ' + s.id + ' liberado.';
      }
    } else {
      s.state = 'locked';
      addLog('Bloqueo exclusivo adquirido sobre ' + s.id + ' (Control de concurrencia).');
      if (statusEl) {
        statusEl.setAttribute('state', 'warning');
        statusEl.textContent = 'Control de concurrencia: Bloqueo exclusivo adquirido sobre ' + s.id + '.';
      }
    }
    selectedSlotIdx = targetIdx;
  }

  function stepIteration() {
    currentIterations++;
    if (currentIterations <= totalIterations) {
      window.ovaMark('iter-' + currentIterations);
    }
    if (iterBadge) {
      iterBadge.textContent = 'Iteración: ' + currentIterations + ' de ' + totalIterations;
    }
    if (currentIterations >= totalIterations) {
      if (statusEl) {
        statusEl.setAttribute('state', 'success');
        statusEl.textContent = '¡Meta completada (' + currentIterations + '/' + totalIterations + ' iteraciones)! Has explorado el ciclo de vida del mecanismo. Revisa la síntesis para continuar.';
      }
    }
  }

  const actionButtons = document.querySelectorAll('.ova-action-btn');
  actionButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const actionId = (btn.getAttribute('data-action-id') || '').toLowerCase();
      const actionIdx = parseInt(btn.getAttribute('data-action-idx') || '0', 10);
      const actionName = (btn.getAttribute('data-action-name') || '').toLowerCase();

      if (actionId.includes('load') || actionId.includes('leer') || actionId.includes('read') || actionId.includes('carg') || actionName.includes('leer') || actionName.includes('carg') || actionIdx === 0) {
        executeLoad();
      } else if (actionId.includes('mod') || actionId.includes('dirty') || actionId.includes('escrib') || actionId.includes('updat') || actionName.includes('modif') || actionIdx === 1) {
        executeModify();
      } else if (actionId.includes('check') || actionId.includes('flush') || actionId.includes('commit') || actionId.includes('persis') || actionName.includes('check') || actionName.includes('flush') || actionIdx === 2) {
        executeCheckpoint();
      } else {
        executeLock();
      }

      stepIteration();
      renderAll();
    });
  });

  for (let i = 0; i < NUM_SLOTS; i++) {
    const slotEl = document.getElementById('svg-slot-group-' + i);
    if (slotEl) {
      slotEl.style.cursor = 'pointer';
      slotEl.addEventListener('click', (function (idx) {
        return function () {
          selectedSlotIdx = idx;
          renderAll();
        };
      })(i));
    }
  }

  const resetBtn = document.getElementById('btn-reset-lab');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      for (let i = 0; i < NUM_SLOTS; i++) {
        bufferSlots[i] = { id: null, state: 'empty', lru: i, modCount: 0 };
      }
      redoEntries.length = 0;
      metrics.reads = 0;
      metrics.dirty = 0;
      metrics.writes = 0;
      selectedSlotIdx = 0;
      diskBlockIdx = 0;
      addLog('Simulador reiniciado a estado inicial.');
      if (statusEl) {
        statusEl.setAttribute('state', 'info');
        statusEl.textContent = 'Simulador reiniciado. Puedes volver a interactuar con los controles.';
      }
      renderAll();
    });
  }

  renderAll();
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    num_iterations = ctx.params.get("num_iterations", 3) if ctx and ctx.params else 3

    controls_html = []
    icons = ["📥", "✏️", "💾", "🔒"]
    for idx, c in enumerate(data.get("controles", [])):
        icon = icons[idx % len(icons)]
        cid = esc(c.get("id", f"ctrl_{idx}"))
        caccion = esc(c.get("accion", ""))
        cdesc = esc(c.get("descripcion", ""))
        controls_html.append(
            f'<div class="ova-control-item">'
            f'<button type="button" class="ova-btn ova-action-btn" '
            f'data-action-idx="{idx}" data-action-id="{cid}" '
            f'data-action-name="{caccion}" data-action-desc="{cdesc}">'
            f'<span aria-hidden="true">{icon}</span> '
            f"<span>{caccion}</span>"
            f"</button>"
            f'<p class="ova-control-desc ova-muted">{cdesc}</p>'
            f"</div>"
        )

    return f"""{_STYLE}
<upao-header eyebrow="SIMULADOR VIRTUAL LAB" title="{esc(data["titulo"])}">
  <p>{esc(data["concepto_mecanismo"])}</p>
</upao-header>

<upao-objective>{esc(data["objetivo"])}</upao-objective>

<upao-example title="Ejemplo trabajado de referencia">
  <p>{esc(data["ejemplo_trabajado"])}</p>
</upao-example>

<upao-progress id="prog" current="0" total="{num_iterations}" label="Progreso del laboratorio" show-fraction></upao-progress>

<section class="ova-card">
  <div class="ova-lab-header">
    <h2>Simulación Interactiva del Mecanismo</h2>
    <span class="ova-badge" id="iter-badge">Iteración: 0 de {num_iterations}</span>
  </div>
  <upao-status id="lab-status" state="info">Laboratorio listo. Elige una acción para modificar el estado del sistema.</upao-status>

  <div class="ova-metrics-bar">
    <div class="ova-metric-box">
      <span class="ova-metric-val" id="metric-reads">0</span>
      <span class="ova-metric-label">Lecturas Disco (I/O)</span>
    </div>
    <div class="ova-metric-box">
      <span class="ova-metric-val" id="metric-dirty">0</span>
      <span class="ova-metric-label">Bloques Sucios</span>
    </div>
    <div class="ova-metric-box">
      <span class="ova-metric-val" id="metric-writes">0</span>
      <span class="ova-metric-label">Checkpoints / Vuelcos</span>
    </div>
  </div>

  <div class="ova-lab-layout">
    <div class="ova-controls-panel">
      <h3>Acciones del Laboratorio</h3>
      <p class="ova-muted" style="font-size:0.85rem;margin:0 0 10px">
        Ejecuta acciones para manipular el buffer cache, modificar bloques o forzar persistencia:
      </p>
      <div class="ova-controls-list" role="group" aria-label="Controles del laboratorio">
        {"".join(controls_html)}
      </div>
      <button type="button" class="ova-btn ova-btn--ghost" id="btn-reset-lab" style="margin-top:12px">
        <span aria-hidden="true">↺</span> Reiniciar estado visual
      </button>
    </div>

    <div class="ova-diagram-panel">
      <div class="ova-svg-container">
        {_SVG_DIAGRAM}
      </div>
      <div class="ova-inspector-box" id="slot-inspector" aria-live="polite">
        Inspección de Ranura [Slot 0]: Vacía — Haz clic en una ranura del buffer para inspeccionarla en detalle.
      </div>
      <div class="ova-log-container">
        <h4 style="margin:0 0 6px;font-size:0.9rem">Bitácora del Motor (Event Log)</h4>
        <ul class="ova-log-list" id="lab-event-log" aria-live="polite" aria-label="Bitácora del motor">
          <li>[00:00] Laboratorio iniciado. Buffer Cache inicializado con 4 ranuras disponibles.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<upao-summary title="Síntesis del mecanismo">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Finalizar laboratorio" locked></upao-complete>
</upao-summary>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script(_LAB_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    return {
        "titulo": f"Laboratorio Virtual: Dinámica de {concept}"[:70],
        "objetivo": f"Comprender la transición de estados internos en {concept} mediante experimentación interactiva."[:160],
        "concepto_mecanismo": f"Los bloques y registros de {concept} se mueven entre memoria y almacenamiento según la carga de trabajo y las políticas de reemplazo."[:200],
        "controles": [
            {
                "id": "cargar",
                "accion": "Cargar bloque en memoria",
                "descripcion": "Lee un bloque de datos del almacenamiento y lo posiciona en la cabecera de la lista LRU del buffer cache.",
            },
            {
                "id": "modificar",
                "accion": "Modificar datos (Dirty)",
                "descripcion": "Aplica cambios al bloque en memoria, marcándolo como sucio y generando una entrada en el log de redo.",
            },
            {
                "id": "checkpoint",
                "accion": "Ejecutar Checkpoint / Flush",
                "descripcion": "El proceso de fondo escribe los bloques sucios a disco y actualiza las cabeceras de control.",
            },
        ],
        "ejemplo_trabajado": "Al ejecutar 'Cargar bloque', el bloque A entra al buffer; luego 'Modificar' lo torna sucio (rojo) y 'Checkpoint' lo persiste a disco (verde)."[:250],
        "sintesis": f"El mecanismo de {concept} optimiza el rendimiento postergando la escritura a disco y garantizando durabilidad con el registro previo en redo log."[:250],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=1,
    title="Simulador Virtual Lab",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
