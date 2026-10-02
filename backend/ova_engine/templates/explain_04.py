"""EXPLAIN 4 — FAQ Interactivo: preguntas frecuentes con filtros por categoría/nivel y analogías didácticas."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_questions",
        6,
        min=4,
        max=8,
        help="Número de preguntas frecuentes",
    ),
)


def schema(p: dict) -> dict:
    n = p.get("num_questions", 6)
    return obj(
        titulo=s(70),
        intro=s(160),
        faqs=arr(
            obj(
                pregunta=s(120),
                respuesta=s(250),
                nivel=s(20),
                categoria=s(40),
            ),
            min_items=n,
            max_items=n,
        ),
        categorias=arr(s(40), 2, 4),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p.get("num_questions", 6)
    return f"""[ROL] Curador y docente especialista en didáctica universitaria.
[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).
[TAREA] Diseña una sección de {n} Preguntas Frecuentes (FAQ interactivo) que responda a dudas genuinas, confusiones habituales y obstáculos reales que experimentan los estudiantes al aprender «{concept}». Cada respuesta debe usar una analogía cotidiana o técnica explicativa que clarifique el concepto y corrija errores comunes.
- titulo: título directo y motivador para la sección de FAQ (≤10 palabras).
- intro: introducción empática que invite a explorar las dudas frecuentes antes de programar o administrar (≤25 palabras).
- categorias: lista de 2 a 4 categorías temáticas distintas que agrupen las dudas (ej. 'Conceptos Básicos', 'Arquitectura Interna', 'Casos Prácticos', 'Optimización').
- faqs: array de exactamente {n} objetos de preguntas frecuentes. Cada uno contiene:
  * `pregunta`: duda o confusión común formulada desde la voz del estudiante (≤18 palabras, ej. '¿Por qué no indexar todas las columnas si aceleran las búsquedas?').
  * `respuesta`: explicación didáctica con una analogía clara o contraejemplo razonado que disipe el error conceptual (≤45 palabras).
  * `nivel`: nivel de dificultad de la pregunta ('Principiante', 'Intermedio' o 'Avanzado').
  * `categoria`: exactamente una de las categorías definidas en la lista `categorias`.
- sintesis: conclusión integradora que consolide la comprensión global de «{concept}» (≤40 palabras).
[RESTRICCIONES] Distribuye las preguntas entre las categorías definidas y balancea los niveles de dificultad (principiante, intermedio y avanzado). Las analogías deben ser fieles a la realidad técnica. No uses etiquetas HTML ni hagas referencia a la estructura del JSON.
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-faq-hud {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--surface, #FFFFFF);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  margin-bottom: 16px;
}
.ova-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.ova-filter-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #5A6B85);
  min-width: 85px;
}
.ova-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.ova-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  min-height: 44px;
  border-radius: 999px;
  border: 1.5px solid var(--border, #E2E8F2);
  background: var(--surface, #FFFFFF);
  color: var(--text, #15233B);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}
.ova-filter-btn:hover {
  background: var(--surface-tint, #EAF0FB);
  border-color: var(--primary, #0A3D91);
}
.ova-filter-btn:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-filter-btn.is-active {
  background: var(--primary, #0A3D91);
  border-color: var(--primary, #0A3D91);
  color: #FFFFFF;
  font-weight: 700;
}
.ova-filter-btn.is-active:hover {
  background: var(--primary-hover, #072C6B);
}
.ova-actions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-block: 8px 16px;
}
.ova-btn--toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  min-height: 44px;
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
  border: 1.5px solid var(--border, #E2E8F2);
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.ova-btn--toggle:hover {
  background: var(--primary, #0A3D91);
  color: #FFFFFF;
}
.ova-btn--toggle:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.ova-filter-count {
  font-size: 0.85rem;
  color: var(--text-muted, #5A6B85);
  font-weight: 500;
}
.ova-faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}
.ova-faq-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ova-faq-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #E2E8F2);
}
.ova-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.ova-chip--category {
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
}
.ova-chip--level {
  background: #FEF3C7;
  color: #92400E;
}
.ova-chip--level[data-level*="Avanzado"],
.ova-chip--level[data-level*="avanzado"] {
  background: #FEE2E2;
  color: #991B1B;
}
.ova-chip--level[data-level*="Principiante"],
.ova-chip--level[data-level*="principiante"] {
  background: #DCFCE7;
  color: #166534;
}
.ova-chip--status {
  margin-left: auto;
  background: var(--surface, #FFFFFF);
  color: var(--text-muted, #5A6B85);
  border: 1px solid var(--border, #E2E8F2);
  transition: all 0.2s ease;
}
.ova-chip--status.is-done {
  background: #DCFCE7;
  color: #146C49;
  border-color: #86EFAC;
  font-weight: 700;
}
.ova-faq-answer {
  background: var(--surface, #FFFFFF);
  border-radius: var(--radius-sm, 8px);
  padding: 14px 18px;
  border-left: 3px solid var(--accent, #F47A20);
}
.ova-faq-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--action, #B84B00);
  margin-bottom: 6px;
}
.ova-faq-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text, #15233B);
  margin: 0;
  max-width: 72ch;
}
.ova-empty-state {
  text-align: center;
  padding: 32px 16px;
  background: var(--surface, #FFFFFF);
  border: 2px dashed var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  margin-block: 16px;
}
.ova-empty-state p {
  color: var(--text-muted, #5A6B85);
  margin-bottom: 12px;
  font-size: 0.95rem;
}
.ova-btn--reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  background: var(--primary, #0A3D91);
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}
.ova-btn--reset:hover {
  background: var(--primary-hover, #072C6B);
}
.ova-btn--reset:focus-visible {
  outline: 3px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
</style>
"""


def render(data: dict, ctx: RenderContext) -> str:
    faqs = data.get("faqs", [])
    total = len(faqs)
    titulo = esc(data.get("titulo", "FAQ Interactivo"))
    intro = esc(data.get("intro", ""))
    sintesis = esc(data.get("sintesis", ""))

    raw_categorias = data.get("categorias", [])
    cat_set: list[str] = []
    for c in raw_categorias:
        if c and c not in cat_set:
            cat_set.append(c)
    for f in faqs:
        fc = f.get("categoria", "")
        if fc and fc not in cat_set:
            cat_set.append(fc)

    known_levels = ["Principiante", "Intermedio", "Avanzado"]
    level_set: list[str] = []
    faq_levels = [f.get("nivel", "") for f in faqs if f.get("nivel")]
    for kl in known_levels:
        if any(kl.lower() == fl.lower() for fl in faq_levels):
            level_set.append(kl)
    for fl in faq_levels:
        if not any(kl.lower() == fl.lower() for kl in level_set):
            level_set.append(fl)
    if not level_set:
        level_set = known_levels

    cat_buttons = [
        '<button type="button" class="ova-filter-btn is-active" data-filter-category="all" aria-pressed="true">'
        'Todas'
        '</button>'
    ]
    for cat in cat_set:
        cat_buttons.append(
            f'<button type="button" class="ova-filter-btn" data-filter-category="{esc(cat)}" aria-pressed="false">'
            f'{esc(cat)}'
            f'</button>'
        )
    cat_filters_html = "".join(cat_buttons)

    lvl_buttons = [
        '<button type="button" class="ova-filter-btn is-active" data-filter-level="all" aria-pressed="true">'
        'Todos'
        '</button>'
    ]
    for lvl in level_set:
        lvl_buttons.append(
            f'<button type="button" class="ova-filter-btn" data-filter-level="{esc(lvl)}" aria-pressed="false">'
            f'{esc(lvl)}'
            f'</button>'
        )
    lvl_filters_html = "".join(lvl_buttons)

    nodes = []
    for idx, faq in enumerate(faqs, 1):
        preg = esc(faq.get("pregunta", ""))
        resp = esc(faq.get("respuesta", ""))
        cat = esc(faq.get("categoria", ""))
        lvl = esc(faq.get("nivel", ""))

        nodes.append(
            f'<upao-node id="faq-node-{idx}" data-idx="{idx}" data-categoria="{cat}" data-nivel="{lvl}" '
            f'number="{idx}" label="{cat} • {lvl}" title="{preg}">'
            f'<div class="ova-faq-body">'
            f'<div class="ova-faq-meta">'
            f'<span class="ova-chip ova-chip--category"><span aria-hidden="true">🏷️</span> {cat}</span>'
            f'<span class="ova-chip ova-chip--level" data-level="{lvl}"><span aria-hidden="true">📊</span> {lvl}</span>'
            f'<span class="ova-chip ova-chip--status" id="faq-status-{idx}" aria-live="polite">⚪ Sin revisar</span>'
            f'</div>'
            f'<div class="ova-faq-answer">'
            f'<h3 class="ova-faq-label">💡 Explicación didáctica</h3>'
            f'<p class="ova-faq-text">{resp}</p>'
            f'</div>'
            f'</div>'
            f'</upao-node>'
        )
    nodes_html = "".join(nodes)

    js_code = f"""
const total = parseInt(document.getElementById('prog')?.getAttribute('total') || '{total}', 10);
let currentCategory = 'all';
let currentLevel = 'all';
let allExpanded = false;

function markQuestion(idx) {{
  if (!idx) return;
  if (typeof window.ovaMark === 'function') {{
    window.ovaMark('faq-' + idx);
  }}
  const statusEl = document.getElementById('faq-status-' + idx);
  if (statusEl) {{
    statusEl.textContent = '✓ Revisada';
    statusEl.classList.add('is-done');
  }}
}}

document.addEventListener('upao-node-toggle', function (e) {{
  if (e.detail && e.detail.open) {{
    const node = e.target.closest('upao-node');
    if (node) {{
      const idx = node.getAttribute('data-idx');
      if (idx) markQuestion(idx);
    }}
  }}
}});

document.querySelectorAll('upao-node[data-idx]').forEach(function (node) {{
  if (node.shadowRoot) {{
    const tTitle = node.shadowRoot.querySelector('.t-title');
    if (tTitle) {{
      tTitle.style.whiteSpace = 'normal';
      tTitle.style.lineHeight = '1.35';
    }}
  }}
  node.addEventListener('click', function () {{
    setTimeout(function () {{
      if (node.shadowRoot) {{
        const wrap = node.shadowRoot.querySelector('.wrap');
        if (wrap && wrap.hasAttribute('open')) {{
          markQuestion(node.getAttribute('data-idx'));
        }}
      }}
    }}, 40);
  }});
}});

function applyFilters() {{
  const nodes = document.querySelectorAll('upao-node[data-idx]');
  let visibleCount = 0;
  nodes.forEach(function (node) {{
    const cat = node.getAttribute('data-categoria') || '';
    const lvl = node.getAttribute('data-nivel') || '';
    const matchCat = (currentCategory === 'all' || cat.toLowerCase() === currentCategory.toLowerCase());
    const matchLvl = (currentLevel === 'all' || lvl.toLowerCase() === currentLevel.toLowerCase());
    const show = matchCat && matchLvl;
    node.hidden = !show;
    if (show) visibleCount++;
  }});

  const emptyMsg = document.getElementById('faq-empty-state');
  if (emptyMsg) {{
    emptyMsg.hidden = (visibleCount > 0);
  }}

  const countEl = document.getElementById('faq-filter-count');
  if (countEl) {{
    countEl.textContent = 'Mostrando ' + visibleCount + ' de ' + total + ' preguntas';
  }}
}}

document.querySelectorAll('[data-filter-category]').forEach(function (btn) {{
  btn.addEventListener('click', function () {{
    document.querySelectorAll('[data-filter-category]').forEach(function (b) {{
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    }});
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    currentCategory = btn.getAttribute('data-filter-category');
    applyFilters();
  }});
}});

document.querySelectorAll('[data-filter-level]').forEach(function (btn) {{
  btn.addEventListener('click', function () {{
    document.querySelectorAll('[data-filter-level]').forEach(function (b) {{
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    }});
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    currentLevel = btn.getAttribute('data-filter-level');
    applyFilters();
  }});
}});

const resetBtn = document.getElementById('faq-reset-filters');
if (resetBtn) {{
  resetBtn.addEventListener('click', function () {{
    currentCategory = 'all';
    currentLevel = 'all';
    document.querySelectorAll('[data-filter-category]').forEach(function (b) {{
      const isAll = (b.getAttribute('data-filter-category') === 'all');
      b.classList.toggle('is-active', isAll);
      b.setAttribute('aria-pressed', String(isAll));
    }});
    document.querySelectorAll('[data-filter-level]').forEach(function (b) {{
      const isAll = (b.getAttribute('data-filter-level') === 'all');
      b.classList.toggle('is-active', isAll);
      b.setAttribute('aria-pressed', String(isAll));
    }});
    applyFilters();
  }});
}}

const toggleBtn = document.getElementById('toggle-all-btn');
const toggleIcon = document.getElementById('toggle-icon');
const toggleText = document.getElementById('toggle-text');

if (toggleBtn) {{
  toggleBtn.addEventListener('click', function () {{
    allExpanded = !allExpanded;
    const nodes = document.querySelectorAll('upao-node[data-idx]');
    nodes.forEach(function (node) {{
      if (!node.hidden) {{
        if (node.shadowRoot) {{
          const wrap = node.shadowRoot.querySelector('.wrap');
          const head = node.shadowRoot.querySelector('.head');
          if (wrap && head) {{
            const isOpen = wrap.hasAttribute('open');
            if (allExpanded && !isOpen) {{
              head.click();
            }} else if (!allExpanded && isOpen) {{
              head.click();
            }}
          }}
        }}
        if (allExpanded) {{
          markQuestion(node.getAttribute('data-idx'));
        }}
      }}
    }});
    toggleBtn.setAttribute('aria-expanded', String(allExpanded));
    if (toggleIcon) toggleIcon.textContent = allExpanded ? '📁' : '📂';
    if (toggleText) toggleText.textContent = allExpanded ? 'Colapsar todas' : 'Expandir todas';
  }});
}}
"""

    return f"""{_STYLE}
<upao-header eyebrow="FAQ INTERACTIVO" title="{titulo}">
  <p>{intro}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total}" label="Preguntas revisadas" show-fraction></upao-progress>

<section class="ova-faq-hud" aria-label="Filtros de preguntas frecuentes">
  <div class="ova-filter-row">
    <span class="ova-filter-label" id="lbl-cat">Categoría:</span>
    <div class="ova-filter-group" role="group" aria-labelledby="lbl-cat">
      {cat_filters_html}
    </div>
  </div>
  <div class="ova-filter-row">
    <span class="ova-filter-label" id="lbl-lvl">Nivel:</span>
    <div class="ova-filter-group" role="group" aria-labelledby="lbl-lvl">
      {lvl_filters_html}
    </div>
  </div>
</section>

<div class="ova-actions-bar">
  <button type="button" class="ova-btn ova-btn--toggle" id="toggle-all-btn" aria-expanded="false">
    <span id="toggle-icon" aria-hidden="true">📂</span>
    <span id="toggle-text">Expandir todas</span>
  </button>
  <span id="faq-filter-count" class="ova-filter-count" aria-live="polite">Mostrando {total} de {total} preguntas</span>
</div>

<div class="ova-faq-list" role="region" aria-label="Lista de preguntas frecuentes">
  {nodes_html}
</div>

<div id="faq-empty-state" class="ova-empty-state" hidden role="status">
  <p>🔍 No hay preguntas frecuentes con los filtros seleccionados.</p>
  <button type="button" class="ova-btn--reset" id="faq-reset-filters">Restablecer filtros</button>
</div>

<upao-summary title="Síntesis">{sintesis}<upao-complete slot="actions" label="Finalizar" locked></upao-complete></upao-summary>

{script(PROGRESS_JS)}
{script(js_code)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_questions", 6)
    categorias = ["Fundamentos", "Funcionamiento", "Casos Prácticos"]

    pool = [
        {
            "pregunta": f"¿Qué es exactamente {concept} y cuál es su objetivo?",
            "respuesta": f"Imagina el índice de un libro técnico: {concept} permite al motor localizar registros específicos rápidamente sin tener que escanear toda la tabla página por página.",
            "nivel": "Principiante",
            "categoria": "Fundamentos",
        },
        {
            "pregunta": f"¿Por qué no conviene aplicar {concept} sobre todas las tablas?",
            "respuesta": f"Cada modificación (INSERT o UPDATE) exige actualizar {concept}. Es como reescribir el índice de un libro cada vez que añades una frase: demasiados índices ralentizan la escritura.",
            "nivel": "Principiante",
            "categoria": "Fundamentos",
        },
        {
            "pregunta": f"¿Cómo interactúa {concept} con la memoria RAM del servidor?",
            "respuesta": f"El motor almacena las estructuras más consultadas de {concept} en el buffer cache de la memoria RAM, evitando lecturas físicas repetitivas desde el disco de almacenamiento.",
            "nivel": "Intermedio",
            "categoria": "Funcionamiento",
        },
        {
            "pregunta": f"¿Qué ocurre internamente cuando se fragmenta {concept}?",
            "respuesta": "Tras constantes borrados y modificaciones se generan huecos vacíos. Es como un archivador con carpetas a medio llenar: el DBA debe reconstruir la estructura para recuperar eficiencia.",
            "nivel": "Intermedio",
            "categoria": "Funcionamiento",
        },
        {
            "pregunta": f"¿Cómo diagnostica el DBA el rendimiento real de {concept}?",
            "respuesta": "Analizando el plan de ejecución de la consulta (EXPLAIN PLAN) y verificando estadísticas del optimizador para confirmar que el costo de acceso disminuye significativamente.",
            "nivel": "Avanzado",
            "categoria": "Casos Prácticos",
        },
        {
            "pregunta": f"¿Cuándo un escaneo completo es mejor opción que usar {concept}?",
            "respuesta": "Cuando la consulta recupera un porcentaje alto de filas (más del 15%). Leer el libro entero de un tirón resulta más rápido que saltar continuamente entre el índice y las páginas.",
            "nivel": "Avanzado",
            "categoria": "Casos Prácticos",
        },
        {
            "pregunta": f"¿Cómo afecta el volumen masivo de transacciones a {concept}?",
            "respuesta": f"En entornos OLTP de alta concurrencia, las operaciones concurrentes pueden causar contención de latches o bloqueos en los bloques raíz de la estructura de {concept}.",
            "nivel": "Avanzado",
            "categoria": "Funcionamiento",
        },
        {
            "pregunta": f"¿Qué buenas prácticas garantizan la estabilidad de {concept}?",
            "respuesta": "Monitorear periódicamente las estadísticas mediante DBMS_STATS y evaluar el ratio de lecturas lógicas frente a físicas para prevenir degradaciones de tiempo de respuesta.",
            "nivel": "Intermedio",
            "categoria": "Casos Prácticos",
        },
    ]

    faqs = list(pool[:n])
    while len(faqs) < n:
        k = len(faqs) + 1
        faqs.append(
            {
                "pregunta": f"¿Qué otro aspecto relevante caracteriza a {concept}? (Duda {k})"[:120],
                "respuesta": f"La gestión eficiente de {concept} requiere monitoreo continuo y calibración según la carga de trabajo real del sistema."[:250],
                "nivel": "Intermedio",
                "categoria": "Casos Prácticos",
            }
        )

    usadas = {f["categoria"] for f in faqs}
    cats = [c for c in categorias if c in usadas]
    if len(cats) < 2:
        cats = categorias[:2]

    return {
        "titulo": f"Preguntas frecuentes sobre {concept}"[:70],
        "intro": f"Aclara tus dudas sobre {concept} mediante analogías y explicaciones didácticas de menor a mayor complejidad."[:160],
        "categorias": cats,
        "faqs": faqs,
        "sintesis": f"Comprender los fundamentos, comportamiento y diagnósticos de {concept} permite tomar mejores decisiones de diseño y administración en bases de datos."[:250],
    }


SPEC = TemplateSpec(
    phase="explain",
    rt=4,
    title="FAQ Interactivo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
