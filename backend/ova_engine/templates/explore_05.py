"""EXPLORE 5 — Lectura Interactiva: caso exploratorio con tabla de datos y análisis de patrones.

El estudiante explora una lectura de caso intrigante acompañada de un dataset
plausible para identificar un patrón técnico a simple vista, seguido de una
pregunta de validación y la revelación del mecanismo subyacente.
"""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    paragraphs,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.schema import arr, b, obj, s

PARAMS = (
    Param(
        "num_records",
        6,
        min=4,
        max=8,
        help="Número de registros en la tabla de datos",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_records"]
    sch = obj(
        titulo=s(70),
        lectura=s(600),
        columnas=arr(s(30), 2, 4),
        filas=arr(
            obj(valores=arr(s(40), 2, 4), observacion=s(100)),
            min_items=n,
            max_items=n,
        ),
        pregunta_patron=s(180),
        opciones_patron=arr(
            obj(texto=s(100), feedback=s(160), correcta=b()),
            2,
            4,
        ),
        revelacion=s(300),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_records"]
    return f"""[ROL] Redactor de materiales de análisis exploratorio para universitarios.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Redacta una lectura intrigante de investigación de incidentes o auditoría técnica (≤120 palabras) acompañada de una tabla de datos ficticia pero plausible de exactamente {n} registros donde el estudiante descubra a simple vista un patrón claro y revelador sobre «{concept}».
- titulo: titular periodístico o de reporte técnico sobre el caso (≤10 palabras).
- lectura: relato intrigante (≤100 palabras) sobre una situación o anomalía observada en producción, contextualizando las métricas recopiladas sin desvelar la teoría ni usar jerga técnica avanzada prematuramente.
- columnas: lista de entre 2 y 4 nombres de columnas para la tabla de datos (ej. métricas observables como tiempos de respuesta, lecturas lógicas, identificadores de sesión o tablas).
- filas: exactamente {n} registros. Cada registro contiene:
  * `valores`: lista de strings con los datos correspondientes a cada columna (debe tener exactamente la misma cantidad de elementos que `columnas`).
  * `observacion`: breve apunte o nota contextual que aclara el registro al inspeccionarlo (≤15 palabras).
- pregunta_patron: pregunta desafiante que invita al estudiante a identificar el patrón evidente o la relación sistemática en los datos de la tabla (≤25 palabras).
- opciones_patron: entre 2 y 4 opciones de respuesta para resolver el patrón. Exactamente UNA opción debe tener `correcta: true` y las demás `correcta: false`. Cada opción incluye `texto` (descripción del patrón, ≤15 palabras) y `feedback` explicativo que argumente por qué es correcta o por qué descarta la hipótesis (≤25 palabras).
- revelacion: explicación pedagógica clara (≤50 palabras) que conecta el patrón descubierto en la tabla con el mecanismo y funcionamiento real de «{concept}».
- imagen (opcional): recurso visual del incidente o análisis:
  * tipo "foto" ÚNICAMENTE para hardware de servidores, salas de monitoreo (NOC) o infraestructura física real tangible.
  * tipo "diagrama" para flujos del incidente o esquemas conceptuales (incluye objeto `diagrama`: tipo, titulo, nodos, aristas).
  * tipo "logo" para marcas o tecnologías analizadas.
  * tipo "escena" para ilustraciones pedagógicas de la situación.
  Incluye {{"tipo": "foto"|"diagrama"|"logo"|"escena", "descripcion": "...", "consulta": "..." (en inglés)}}.
[RESTRICCIONES] El patrón debe ser identificable a simple vista mediante inspección visual y contraste de filas (p. ej. un incremento repentino, una correlación directa entre dos métricas o una repetición anómala). No uses la terminología técnica avanzada de «{concept}» en la lectura inicial. No incluyas etiquetas de formato ni código web.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_records", 6)
    base_filas = [
        {
            "valores": ["TX-101 (Básica)", "150 req/s", "4 ms"],
            "observacion": "Comportamiento óptimo con lectura directa en caché.",
        },
        {
            "valores": ["TX-102 (Filtro)", "300 req/s", "6 ms"],
            "observacion": "Acceso eficiente a memoria sin esperas.",
        },
        {
            "valores": ["TX-103 (Rango)", "550 req/s", "12 ms"],
            "observacion": "Leve aumento por concurrencia moderada.",
        },
        {
            "valores": ["TX-104 (Agregación)", "800 req/s", "45 ms"],
            "observacion": "Primeros indicios de cola en buffer pool.",
        },
        {
            "valores": ["TX-105 (Escaneo)", "1200 req/s", "380 ms"],
            "observacion": "Salto abrupto de latencia y saturación de E/S.",
        },
        {
            "valores": ["TX-106 (Masiva)", "1600 req/s", "920 ms"],
            "observacion": "Contención severa con tiempos de espera críticos.",
        },
        {
            "valores": ["TX-107 (Pico)", "2100 req/s", "1850 ms"],
            "observacion": "Degradación no lineal por bloqueo de recursos.",
        },
        {
            "valores": ["TX-108 (Estrés)", "2800 req/s", "3400 ms"],
            "observacion": "Saturación sostenida que degrada todo el sistema.",
        },
    ]
    return {
        "titulo": f"El patrón de rendimiento en {concept}"[:70],
        "lectura": (
            "Durante una auditoría operativa se registraron métricas de ejecución en momentos de distinta carga sobre el sistema. "
            "Al observar la tabla de datos, se percibe un cambio sustancial en el comportamiento del tiempo de respuesta y los recursos involucrados a medida que las transacciones aumentan. "
            "El equipo técnico necesita analizar estas mediciones para identificar el patrón que explica la degradación del servicio."
        )[:600],
        "columnas": ["Transacción", "Peticiones / s", "Tiempo respuesta"],
        "filas": base_filas[:n],
        "pregunta_patron": (
            "Al analizar la tabla de mediciones, ¿qué patrón consistente describe la relación entre las peticiones y el tiempo de respuesta?"
        )[:180],
        "opciones_patron": [
            {
                "texto": "El tiempo de respuesta se dispara de forma no lineal al superar cierto umbral de carga.",
                "feedback": "¡Correcto! La latencia salta bruscamente de milisegundos a valores críticos al subir el tráfico.",
                "correcta": True,
            },
            {
                "texto": "El tiempo de respuesta disminuye uniformemente a medida que aumentan las peticiones por segundo.",
                "feedback": "Incorrecto. Los datos muestran lo contrario: a mayor carga, el tiempo de respuesta aumenta.",
                "correcta": False,
            },
            {
                "texto": "El tiempo de respuesta se mantiene estable e insensible al volumen de operaciones simultáneas.",
                "feedback": "Incorrecto. Al pasar de 800 req/s se evidencia un salto radical en la latencia.",
                "correcta": False,
            },
        ],
        "revelacion": (
            f"Este patrón manifiesta el principio operativo de {concept}: cuando el volumen de solicitudes sobrepasa la capacidad de los búferes y colas internas, el costo de contención y E/S se multiplica exponencialmente, provocando cuellos de botella característicos en el motor de datos."
        )[:300],
        "imagen": {
            "query": f"{concept} database performance monitoring",
            "tipo": "foto",
            "descripcion": f"Métricas de rendimiento en servidores para {concept}",
        },
    }


_STYLE = """
<style>
.card-badge-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.card-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--primary);
}
.ova-badge {
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary);
  background: var(--surface-tint);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 6px;
}
.read-text {
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--text);
}
.table-instruction {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 0;
  margin-bottom: 10px;
}
.interactive-table {
  width: 100%;
  border-collapse: collapse;
}
.interactive-table tr.table-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.interactive-table tr.table-row:hover {
  background-color: var(--surface-tint);
}
.interactive-table tr.table-row.is-highlighted {
  background-color: var(--surface-tint);
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
.interactive-table td.obs-cell {
  color: var(--text-muted);
  font-size: 0.9rem;
}
.inspector-box {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius, 10px);
  background: var(--surface-tint);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.5;
}
.inspector-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
.revelation-hint {
  font-size: 0.92rem;
  color: var(--text-muted);
  margin-top: 0;
  margin-bottom: 12px;
}
.revelacion-content {
  padding-block: 8px;
  line-height: 1.65;
  color: var(--text);
}
.revelacion-content p {
  margin: 0;
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    th_cols = "".join(f'<th scope="col">{esc(c)}</th>' for c in data["columnas"])
    tr_rows = []
    for k, row in enumerate(data["filas"], 1):
        td_vals = "".join(f"<td>{esc(v)}</td>" for v in row.get("valores", []))
        obs = esc(row.get("observacion", ""))
        tr_rows.append(
            f'<tr class="table-row" data-index="{k}" tabindex="0" role="button" '
            f'aria-pressed="false" data-obs="{obs}">'
            f'<td style="text-align:center;font-weight:600">{k}</td>'
            f"{td_vals}"
            f'<td class="obs-cell">{obs}</td>'
            f"</tr>"
        )
    tbody = "".join(tr_rows)

    choices = "".join(
        f'<upao-choice group="patron" value="{chr(65 + k)}" correct="{str(bool(o.get("correcta", False))).lower()}" '
        f'feedback="{esc(o.get("feedback", ""))}"><strong>{chr(65 + k)}.</strong> {esc(o.get("texto", ""))}</upao-choice>'
        for k, o in enumerate(data.get("opciones_patron", []))
    )

    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Métricas y análisis de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""{_STYLE}{IMAGE_FIGURE_CSS}
<upao-header eyebrow="LECTURA INTERACTIVA" title="{esc(data["titulo"])}">
  <p>Examina la lectura y el conjunto de datos para descubrir el patrón oculto.</p>
</upao-header>

<upao-progress id="prog" current="0" total="2" label="Progreso del análisis" show-fraction></upao-progress>

<section class="ova-card read-section" aria-labelledby="read-heading">
  <div class="card-badge-header">
    <span class="ova-badge">Caso de Análisis</span>
    <h2 id="read-heading" class="card-title">Lectura del Caso</h2>
  </div>
  <div class="read-text">
    {paragraphs(data["lectura"])}
  </div>
  {fig_html}
</section>

<section class="ova-card table-section" aria-labelledby="table-heading">
  <div class="card-badge-header">
    <span class="ova-badge">Dataset</span>
    <h2 id="table-heading" class="card-title">Registro de Mediciones</h2>
  </div>
  <p class="table-instruction">Haz clic en cualquier fila para resaltar sus datos e inspeccionar la observación correspondiente.</p>
  <div class="ova-table-scroll" role="region" aria-label="Tabla interactiva de mediciones" tabindex="0">
    <table class="interactive-table">
      <caption>Registros observados para análisis de patrones</caption>
      <thead>
        <tr>
          <th scope="col" style="width:48px;text-align:center">#</th>
          {th_cols}
          <th scope="col">Observación</th>
        </tr>
      </thead>
      <tbody>
        {tbody}
      </tbody>
    </table>
  </div>
  <div id="inspector-callout" class="inspector-box" aria-live="polite">
    <span class="inspector-icon" aria-hidden="true">💡</span>
    <span id="inspector-text">Selecciona una fila de la tabla para analizar su observación técnica.</span>
  </div>
</section>

<section class="ova-card question-section" aria-labelledby="question-heading">
  <div class="card-badge-header">
    <span class="ova-badge">Descubrimiento</span>
    <h2 id="question-heading" class="card-title">Identificación del Patrón</h2>
  </div>
  <upao-question number="1" prompt="{esc(data["pregunta_patron"])}">
    {choices}
  </upao-question>
</section>

<section class="ova-card revelation-section" aria-labelledby="revelation-heading">
  <div class="card-badge-header">
    <span class="ova-badge">Fundamento</span>
    <h2 id="revelation-heading" class="card-title">Mecanismo Explicativo</h2>
  </div>
  <p class="revelation-hint">Comprueba el razonamiento técnico que sustenta el patrón observado en los datos:</p>
  <upao-reveal id="revelacion-mecanismo" label="Revelar explicación del mecanismo" icon="🔍">
    <div class="revelacion-content">
      <p>{esc(data["revelacion"])}</p>
    </div>
  </upao-reveal>
</section>

<upao-summary title="Síntesis y Transferencia">
  <p>El análisis exploratorio de datos permite detectar relaciones no evidentes y diagnosticar el comportamiento de <strong>{
        esc(ctx.concept)
    }</strong> antes de realizar modificaciones en producción.</p>
  <upao-complete slot="actions" label="Finalizar lectura" locked></upao-complete>
</upao-summary>
{credits_sec}

{script(PROGRESS_JS)}
{
        script('''
(function() {
  const rows = document.querySelectorAll('.interactive-table tr.table-row');
  const inspectorText = document.getElementById('inspector-text');
  const rev = document.getElementById('revelacion-mecanismo');

  function highlightRow(row) {
    if (!row) return;
    rows.forEach(function(r) {
      r.classList.remove('is-highlighted');
      r.setAttribute('aria-pressed', 'false');
    });
    row.classList.add('is-highlighted');
    row.setAttribute('aria-pressed', 'true');
    const idx = row.getAttribute('data-index');
    const obs = row.getAttribute('data-obs');
    if (inspectorText && obs) {
      inspectorText.textContent = 'Fila #' + idx + ': ' + obs;
    }
    window.ovaMark('table');
  }

  rows.forEach(function(row) {
    row.addEventListener('click', function() {
      highlightRow(row);
    });
    row.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        highlightRow(row);
      }
    });
  });

  document.addEventListener('upao-choice-selected', function() {
    window.ovaMark('question');
    if (rev && typeof rev.reveal === 'function') {
      rev.reveal();
    }
  });

  document.addEventListener('click', function(e) {
    if (e.target && e.target.closest && e.target.closest('upao-choice')) {
      window.ovaMark('question');
      if (rev && typeof rev.reveal === 'function') {
        rev.reveal();
      }
    }
  });
})();
''')
    }
"""


SPEC = TemplateSpec(
    phase="explore",
    rt=5,
    title="Lectura Interactiva",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
