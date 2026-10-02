"""EXPLORE 10 — Lab de Hipótesis: contrastar hipótesis sobre el comportamiento del sistema.

Permite al estudiante manipular configuraciones (variable independiente), ejecutar pruebas
experimentales para observar métricas reactivas (variable dependiente) en tabla y gráfica,
y contrastar hipótesis para formular una conclusión empírica fundamentada.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, b, obj, s

PARAMS = (Param("num_trials", 3, min=3, max=5, help="Número de pruebas experimentales"),)


def schema(p: dict) -> dict:
    return obj(
        titulo=s(70),
        objetivo=s(160),
        variable_independiente=s(50),
        variable_dependiente=s(50),
        opciones_prueba=arr(
            obj(
                id=s(20),
                valor=s(40),
                resultado_metrica=s(50),
                interpretacion=s(140),
            ),
            3,
            5,
        ),
        pregunta_conclusion=s(180),
        opciones_conclusion=arr(
            obj(
                texto=s(100),
                feedback=s(140),
                correcta=b(),
            ),
            2,
            3,
        ),
        sintesis_evidencia=s(300),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p.get("num_trials", 3)
    return f"""[ROL] Diseñador pedagógico de laboratorios experimentales y contraste de hipótesis en bases de datos.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña un laboratorio experimental para contrastar hipótesis sobre el comportamiento del sistema al variar parámetros de «{concept}» (ej. tamaño del buffer cache vs lecturas físicas a disco, grado de concurrencia vs tiempos de bloqueo, o factor de relleno vs encadenamiento de filas). El estudiante formulará predicciones y ejecutará {n} pruebas experimentales para observar las métricas y deducir una conclusión fundada en evidencia empírica.
- titulo: título conciso del laboratorio experimental (≤10 palabras).
- objetivo: objetivo de aprendizaje observable en una frase (≤25 palabras, qué hipótesis contrastará el estudiante).
- variable_independiente: factor o parámetro de configuración que el estudiante manipula (≤7 palabras, ej. "Tamaño asignado al Buffer Cache").
- variable_dependiente: métrica o efecto observable del sistema que se mide tras la prueba (≤7 palabras, ej. "Tasa de aciertos de caché (Hit Ratio)").
- opciones_prueba: lista de {n} configuraciones experimentales ordenadas progresivamente para evaluar el comportamiento del sistema (mínimo 3, máximo 5). Para cada opción:
  * `id`: identificador alfanumérico corto sin espacios (ej. "cfg_1", "cfg_2").
  * `valor`: valor asignado a la variable independiente en esta prueba (≤5 palabras, ej. "Buffer Cache = 64 MB").
  * `resultado_metrica`: valor medido de la variable dependiente con su unidad (≤6 palabras, ej. "Hit Ratio: 65% (410 I/O disco/s)").
  * `interpretacion`: explicación causa-efecto de lo que ocurre internamente en la base de datos con este valor (≤20 palabras).
- pregunta_conclusion: pregunta final de síntesis científica que pide al estudiante enunciar la regla o principio empírico demostrado por los datos acumulados (≤25 palabras).
- opciones_conclusion: entre 2 y 3 opciones de respuesta fundamentadas en la evidencia observada. Exactamente UNA con `correcta: true` y las demás `correcta: false`. Cada opción con `texto` (afirmación concluyente, ≤15 palabras) y `feedback` formativo que justifique por qué la evidencia respalda o refuta esa deducción (≤20 palabras).
- sintesis_evidencia: consolidación de los hallazgos experimentales, explicando el umbral óptimo o límite técnico del comportamiento observado en producción (≤45 palabras).
[RESTRICCIONES] Enfoque riguroso de indagación científica y causa-efecto en bases de datos. Las métricas deben ser plausibles para una base de datos Oracle/relacional. No generes etiquetas HTML ni markdown en el JSON.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-vars-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 14px;
}
@media (min-width: 600px) {
  .ova-vars-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.ova-var-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 10px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ova-var-card--indep {
  border-left: 4px solid var(--primary, #0A3D91);
}
.ova-var-card--dep {
  border-left: 4px solid var(--accent, #f47a20);
}
.ova-var-type {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted, #64748b);
}
.ova-var-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text, #1e293b);
  margin: 0;
}
.ova-exp-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: clamp(16px, 3vw, 24px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
}
.ova-exp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.ova-exp-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}
.ova-counter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-tint, #eef2ff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary, #0A3D91);
}
.ova-ctrl-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ova-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text, #1e293b);
}
.ova-ctrl-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.ova-select {
  flex: 1 1 240px;
  min-height: 44px;
  padding: 8px 12px;
  font-size: 0.95rem;
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius, 8px);
  background: var(--surface, #ffffff);
  color: var(--text, #0f172a);
}
.ova-select:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 1px;
}
.ova-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius, 8px);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.ova-btn:active {
  transform: translateY(1px);
}
.ova-btn--primary {
  background: var(--primary, #0A3D91);
  color: #ffffff;
}
.ova-btn--primary:hover {
  opacity: 0.92;
}
.ova-btn--primary:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-chart-container {
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 10px);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ova-chart-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.ova-chart-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary, #0A3D91);
}
.ova-chart-svg {
  width: 100%;
  height: auto;
  display: block;
  max-height: 220px;
}
.ova-chart-track {
  fill: var(--border, #e2e8f0);
  opacity: 0.45;
}
.ova-chart-bar {
  fill: var(--primary, #0A3D91);
  transition: height 0.4s ease, y 0.4s ease;
}
.ova-chart-val {
  font-size: 11px;
  font-family: inherit;
  font-weight: 600;
  fill: var(--text, #1e293b);
  text-anchor: middle;
}
.ova-chart-lbl {
  font-size: 11px;
  font-family: inherit;
  font-weight: 600;
  fill: var(--muted, #64748b);
  text-anchor: middle;
}
.ova-table-scroll {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 8px);
}
.ova-table-scroll table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  text-align: left;
}
.ova-table-scroll caption {
  text-align: left;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted, #64748b);
}
.ova-table-scroll th {
  background: var(--surface-2, #f1f5f9);
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--border, #e2e8f0);
  color: var(--text, #1e293b);
}
.ova-table-scroll td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  vertical-align: top;
}
.ova-table-scroll tr:last-child td {
  border-bottom: none;
}
.ova-trial-row--pending {
  color: var(--muted, #64748b);
}
.ova-trial-row--done {
  background: var(--surface-tint, #f8fafc);
  color: var(--text, #0f172a);
}
.ova-cell-placeholder {
  color: var(--muted, #94a3b8);
  font-style: italic;
}
.ova-pill {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.ova-pill--pending {
  background: #f1f5f9;
  color: #64748b;
}
.ova-pill--success {
  background: #dcfce7;
  color: #166534;
}
.ova-conclusion-card {
  margin-top: 20px;
}
.ova-conclusion-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.ova-badge-step {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #eef2ff);
  color: var(--primary, #0A3D91);
}
</style>
"""

_JS = """
(function () {
  const raw = document.getElementById('ova-data');
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw.textContent);
  } catch (err) {
    return;
  }

  const trials = data.opciones_prueba || [];
  const totalTrials = trials.length;
  const testedTrials = new Set();

  const selectEl = document.getElementById('trial-select');
  const runBtn = document.getElementById('btn-run-trial');
  const counterVal = document.getElementById('trial-counter-val');
  const labStatus = document.getElementById('lab-status');

  function runTrial(idx) {
    if (idx < 0 || idx >= totalTrials) return;
    const trial = trials[idx];
    if (!trial) return;

    testedTrials.add(idx);

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('trial-' + idx);
    }

    const metricCell = document.getElementById('metric-cell-' + idx);
    if (metricCell) {
      metricCell.textContent = trial.resultado_metrica || '';
    }

    const interpCell = document.getElementById('interp-cell-' + idx);
    if (interpCell) {
      interpCell.textContent = trial.interpretacion || '';
    }

    const statusCell = document.getElementById('status-cell-' + idx);
    if (statusCell) {
      statusCell.innerHTML = '<span class="ova-pill ova-pill--success">✓ Registrada</span>';
    }

    const row = document.getElementById('trial-row-' + idx);
    if (row) {
      row.classList.remove('ova-trial-row--pending');
      row.classList.add('ova-trial-row--done');
    }

    const maxH = 120;
    const h = Math.round(30 + ((idx + 1) / totalTrials) * (maxH - 30));
    const bar = document.getElementById('chart-bar-' + idx);
    if (bar) {
      bar.setAttribute('height', h);
      bar.setAttribute('y', 170 - h);
    }
    const valText = document.getElementById('chart-val-' + idx);
    if (valText) {
      const metricStr = trial.resultado_metrica || '';
      valText.textContent = metricStr.length > 18 ? metricStr.slice(0, 17) + '…' : metricStr;
      valText.setAttribute('y', 162 - h);
    }

    if (counterVal) {
      counterVal.textContent = testedTrials.size + ' / ' + totalTrials;
    }

    if (labStatus) {
      labStatus.setAttribute('state', 'success');
      if (testedTrials.size >= totalTrials) {
        labStatus.textContent = '¡Todas las pruebas (' + testedTrials.size + '/' + totalTrials + ') han sido registradas! Analiza la evidencia acumulada y formula tu conclusión científica.';
      } else {
        labStatus.textContent = 'Prueba ' + (idx + 1) + ' registrada (' + (trial.valor || '') + '): ' + (trial.resultado_metrica || '') + '. ' + (trial.interpretacion || '');
      }
    }
  }

  if (runBtn && selectEl) {
    runBtn.addEventListener('click', function () {
      const idx = parseInt(selectEl.value, 10);
      runTrial(idx);
    });
  }

  trials.forEach(function (_, i) {
    const row = document.getElementById('trial-row-' + i);
    if (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        if (selectEl) selectEl.value = String(i);
        runTrial(i);
      });
    }
    const group = document.querySelector('.ova-chart-group[data-idx="' + i + '"]');
    if (group) {
      group.style.cursor = 'pointer';
      group.addEventListener('click', function () {
        if (selectEl) selectEl.value = String(i);
        runTrial(i);
      });
    }
  });

  document.addEventListener('upao-choice-selected', function () {
    if (typeof window.ovaMark === 'function') {
      window.ovaMark('conclusion');
    }
  });

  const conclusionChoices = document.querySelectorAll('upao-choice[group="conclusion"]');
  conclusionChoices.forEach(function (choice) {
    choice.addEventListener('click', function () {
      if (typeof window.ovaMark === 'function') {
        window.ovaMark('conclusion');
      }
    });
  });
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    trials = data.get("opciones_prueba", [])
    n = len(trials)
    total_progress = n + 1

    select_options = []
    for idx, opt in enumerate(trials):
        select_options.append(
            f'<option value="{idx}">Prueba {idx + 1}: {esc(opt.get("valor", ""))}</option>'
        )

    chart_elements = []
    slot_w = 480.0 / max(1, n)
    for idx, opt in enumerate(trials):
        cx = 60.0 + slot_w * idx + slot_w / 2.0
        bar_w = min(54.0, slot_w * 0.55)
        bx = cx - bar_w / 2.0
        chart_elements.append(
            f'<g class="ova-chart-group" data-idx="{idx}">'
            f'<rect x="{bx:.1f}" y="35" width="{bar_w:.1f}" height="135" rx="6" class="ova-chart-track"/>'
            f'<rect id="chart-bar-{idx}" x="{bx:.1f}" y="170" width="{bar_w:.1f}" height="0" rx="6" class="ova-chart-bar"/>'
            f'<text id="chart-val-{idx}" x="{cx:.1f}" y="162" class="ova-chart-val">—</text>'
            f'<text id="chart-lbl-{idx}" x="{cx:.1f}" y="192" class="ova-chart-lbl">P{idx + 1}</text>'
            f'</g>'
        )

    table_rows = []
    for idx, opt in enumerate(trials):
        table_rows.append(
            f'<tr id="trial-row-{idx}" class="ova-trial-row ova-trial-row--pending">'
            f'<td class="ova-cell-idx"><strong>{idx + 1}</strong></td>'
            f'<td class="ova-cell-val"><strong>{esc(opt.get("valor", ""))}</strong></td>'
            f'<td class="ova-cell-metric" id="metric-cell-{idx}"><span class="ova-cell-placeholder">—</span></td>'
            f'<td class="ova-cell-interp" id="interp-cell-{idx}"><span class="ova-cell-placeholder">Pendiente de ejecutar</span></td>'
            f'<td class="ova-cell-status" id="status-cell-{idx}"><span class="ova-pill ova-pill--pending">Pendiente</span></td>'
            f'</tr>'
        )

    choices_html = []
    for k, opt in enumerate(data.get("opciones_conclusion", [])):
        choices_html.append(
            f'<upao-choice group="conclusion" value="{chr(65 + k)}" '
            f'correct="{str(bool(opt.get("correcta", False))).lower()}" '
            f'feedback="{esc(opt.get("feedback", ""))}">{esc(opt.get("texto", ""))}</upao-choice>'
        )

    return f"""{_STYLE}
<upao-header eyebrow="LAB DE HIPÓTESIS" title="{esc(data.get("titulo", ""))}"></upao-header>

<upao-objective>{esc(data.get("objetivo", ""))}</upao-objective>

<upao-progress id="prog" current="0" total="{total_progress}" label="Progreso del laboratorio" show-fraction></upao-progress>

<div class="ova-vars-grid">
  <div class="ova-var-card ova-var-card--indep">
    <span class="ova-var-type">Variable Independiente (Causa manipulable)</span>
    <p class="ova-var-name">{esc(data.get("variable_independiente", ""))}</p>
  </div>
  <div class="ova-var-card ova-var-card--dep">
    <span class="ova-var-type">Variable Dependiente (Efecto medido)</span>
    <p class="ova-var-name">{esc(data.get("variable_dependiente", ""))}</p>
  </div>
</div>

<section class="ova-card ova-exp-card">
  <div class="ova-exp-header">
    <div>
      <h2 class="ova-exp-title">Panel de Experimentación</h2>
      <p class="ova-muted" style="margin:2px 0 0;font-size:0.875rem">
        Ejecuta las pruebas sistemáticas para contrastar la hipótesis de comportamiento del sistema.
      </p>
    </div>
    <div class="ova-counter-chip" id="trial-counter-wrap">
      <span aria-hidden="true">🧪</span>
      <span>Pruebas: <strong id="trial-counter-val">0 / {n}</strong></span>
    </div>
  </div>

  <upao-status id="lab-status" state="info">
    Laboratorio listo. Selecciona una configuración y haz clic en «Ejecutar prueba» para medir el resultado.
  </upao-status>

  <div class="ova-ctrl-section">
    <label for="trial-select" class="ova-label">
      <strong>Configuración a evaluar ({esc(data.get("variable_independiente", ""))}):</strong>
    </label>
    <div class="ova-ctrl-bar">
      <select id="trial-select" class="ova-select" aria-label="Seleccionar configuración para la prueba">
        {"".join(select_options)}
      </select>
      <button type="button" id="btn-run-trial" class="ova-btn ova-btn--primary">
        <span aria-hidden="true">🔬</span> Ejecutar prueba
      </button>
    </div>
  </div>

  <div class="ova-chart-container">
    <div class="ova-chart-title-bar">
      <span class="ova-chart-title">Visualización de Resultados: {esc(data.get("variable_dependiente", ""))}</span>
      <span class="ova-muted" style="font-size:0.8rem">Gráfica reactiva acumulada</span>
    </div>
    <svg viewBox="0 0 600 220" class="ova-chart-svg" role="img" aria-label="Gráfica reactiva de resultados acumulados">
      <line x1="40" y1="170" x2="560" y2="170" stroke="var(--border, #cbd5e1)" stroke-width="2"/>
      {"".join(chart_elements)}
    </svg>
  </div>

  <div class="ova-table-scroll" role="region" aria-label="Tabla de resultados acumulados" tabindex="0">
    <table>
      <caption>Registro acumulado de pruebas experimentales</caption>
      <thead>
        <tr>
          <th scope="col" style="width:40px">#</th>
          <th scope="col">{esc(data.get("variable_independiente", "Configuración"))}</th>
          <th scope="col">{esc(data.get("variable_dependiente", "Métrica"))}</th>
          <th scope="col">Interpretación de la evidencia</th>
          <th scope="col" style="width:110px">Estado</th>
        </tr>
      </thead>
      <tbody>
        {"".join(table_rows)}
      </tbody>
    </table>
  </div>
</section>

<section class="ova-card ova-conclusion-card" id="conclusion-section">
  <div class="ova-conclusion-head">
    <h3 style="margin:0;font-size:1.1rem;font-weight:700">Contraste de Hipótesis y Conclusión</h3>
    <span class="ova-badge-step">Paso Final</span>
  </div>
  <p class="ova-muted" style="margin:0 0 14px;font-size:0.875rem">
    A partir de la evidencia experimental acumulada en la tabla y gráfica, selecciona la conclusión fundamentada:
  </p>
  <upao-question number="1" prompt="{esc(data.get("pregunta_conclusion", ""))}">
    {"".join(choices_html)}
  </upao-question>
</section>

<upao-summary title="Síntesis de la evidencia">
  <p>{esc(data.get("sintesis_evidencia", ""))}</p>
  <upao-complete slot="actions" label="Finalizar laboratorio" locked></upao-complete>
</upao-summary>

{json_data(data, "ova-data")}
{script(PROGRESS_JS)}
{script(_JS)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_trials", 3)
    n = max(3, min(5, n))
    base_trials = [
        {
            "id": "cfg_minima",
            "valor": "Buffer Cache: 64 MB (Mínimo)",
            "resultado_metrica": "Hit Ratio: 62% | 480 I/O disco/s",
            "interpretacion": "Memoria insuficiente: alta contención y desalojo prematuro de bloques limpios.",
        },
        {
            "id": "cfg_baja",
            "valor": "Buffer Cache: 128 MB (Reducido)",
            "resultado_metrica": "Hit Ratio: 78% | 260 I/O disco/s",
            "interpretacion": "Mejora moderada, pero las tablas medianas aún provocan lecturas frecuentes a disco.",
        },
        {
            "id": "cfg_media",
            "valor": "Buffer Cache: 256 MB (Recomendado)",
            "resultado_metrica": "Hit Ratio: 92% | 85 I/O disco/s",
            "interpretacion": "Punto de inflexión: la mayoría de consultas frecuentes encuentran sus bloques en RAM.",
        },
        {
            "id": "cfg_alta",
            "valor": "Buffer Cache: 512 MB (Ampliado)",
            "resultado_metrica": "Hit Ratio: 96% | 35 I/O disco/s",
            "interpretacion": "Rendimiento óptimo: casi todo el conjunto de trabajo caliente reside en memoria.",
        },
        {
            "id": "cfg_maxima",
            "valor": "Buffer Cache: 1024 MB (Sobredimensionado)",
            "resultado_metrica": "Hit Ratio: 97% | 30 I/O disco/s",
            "interpretacion": "Rendimientos decrecientes: ganancia marginal de aciertos con mayor costo de escaneo LRU.",
        },
    ]
    return {
        "titulo": f"Lab Experimental: Hipótesis de {concept}"[:70],
        "objetivo": f"Contrastar cómo influye la configuración del sistema en el rendimiento de {concept}."[:160],
        "variable_independiente": f"Tamaño asignado a {concept}"[:50],
        "variable_dependiente": "Tasa de aciertos en memoria (Hit Ratio)"[:50],
        "opciones_prueba": base_trials[:n],
        "pregunta_conclusion": f"¿Qué principio empírico se deduce de las pruebas sobre {concept}?"[:180],
        "opciones_conclusion": [
            {
                "texto": "Aumentar la memoria mejora el rendimiento hasta un umbral de beneficio marginal.",
                "feedback": "Correcto: la evidencia muestra que sobrepasar el tamaño de trabajo genera rendimientos decrecientes.",
                "correcta": True,
            },
            {
                "texto": "El rendimiento siempre se incrementa de forma lineal e indefinida.",
                "feedback": "Incorrecto: los datos revelan que la curva se estabiliza alrededor de 512 MB.",
                "correcta": False,
            },
            {
                "texto": "El tamaño asignado no tiene relación con las lecturas físicas en disco.",
                "feedback": "Incorrecto: la métrica de I/O en disco se redujo drásticamente de 480 a 35 lecturas/s.",
                "correcta": False,
            },
        ],
        "sintesis_evidencia": f"La experimentación sistemática confirma que dimensionar {concept} por encima del conjunto activo aporta ganancias mínimas frente al costo de recursos."[:300],
    }


SPEC = TemplateSpec(
    phase="explore",
    rt=10,
    title="Lab de Hipótesis",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
