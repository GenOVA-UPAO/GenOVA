"""EXPLORE 3 — Juego Drag & Drop: clasificación interactiva de conceptos en dos categorías.

Permite al estudiante clasificar elementos, sentencias, componentes o estructuras técnicas
en dos categorías conceptuales contrastantes (por ejemplo: SGA vs PGA, estructura lógica vs
física, privilegios de sistema vs de objeto).
Soporta interacción mediante Drag & Drop HTML5 nativo y botones accesibles para teclado y móvil.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_rounds",
        6,
        min=3,
        max=8,
        help="Número de items a clasificar",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_rounds"]
    return obj(
        titulo=s(70),
        categoria_a=obj(
            id=s(20),
            nombre=s(40),
            descripcion=s(100),
        ),
        categoria_b=obj(
            id=s(20),
            nombre=s(40),
            descripcion=s(100),
        ),
        items=arr(
            obj(
                id=s(20),
                texto=s(80),
                contexto=s(120),
                categoria=s(20),
                feedback=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_rounds"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Diseñador pedagógico de minijuegos interactivos de clasificación para administración de bases de datos.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un juego drag & drop de clasificación en el que el estudiante debe clasificar {n} elementos en 2 categorías fundamentales e ilustrativas de «{concept}» (por ejemplo: {d.si_oracle("SGA vs PGA, ", "")}estructura lógica vs física, privilegios de sistema vs de objeto, backup en frío vs en caliente, DDL vs DML; elige solo lo que encaje con «{concept}»).
- titulo: título motivador del juego de clasificación (≤10 palabras).
- categoria_a: primera categoría conceptual, con:
  * `id`: identificador alfanumérico corto sin espacios (ej. 'cat_a' o 'logica', ≤10 caracteres).
  * `nombre`: nombre representativo de la categoría (≤4 palabras).
  * `descripcion`: definición o criterio distintivo de esta categoría (≤15 palabras).
- categoria_b: segunda categoría conceptual contrastante, con:
  * `id`: identificador alfanumérico corto sin espacios diferente a categoria_a (ej. 'cat_b' o 'pga', ≤10 caracteres).
  * `nombre`: nombre representativo de la categoría (≤4 palabras).
  * `descripcion`: definición o criterio distintivo de esta categoría (≤15 palabras).
- items: exactamente {n} elementos técnicos para clasificar. Reparte los items de forma equilibrada entre ambas categorías, ordenados de menor a mayor dificultad, incluyendo al menos un caso sutil o desafiante. Cada item debe tener:
  * `id`: identificador único breve (ej. 'item-1', 'item-2').
  * `texto`: elemento, componente, sentencia o mecanismo concreto a clasificar (≤10 palabras).
  * `contexto`: situación práctica o función técnica en la que interviene en la base de datos (≤18 palabras).
  * `categoria`: el `id` exacto de la categoría a la que pertenece (`categoria_a.id` o `categoria_b.id`).
  * `feedback`: explicación concisa de por qué pertenece a esa categoría y cómo opera (≤20 palabras).
- sintesis: conclusión pedagógica que resuma la complementariedad y diferencia esencial entre ambas categorías (≤35 palabras).
[RESTRICCIONES] Sin jerga vacía. Cada item debe pertenecer de forma objetiva y justificable a su categoría asignada. Sin repeticiones. No generes HTML ni hagas mención al esquema JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Diseñador pedagógico de minijuegos interactivos de clasificación sobre «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un juego drag & drop de clasificación en el que el estudiante debe clasificar {n} elementos en 2 categorías fundamentales e ilustrativas de «{concept}» (por ejemplo, dos grupos que se contraponen en el tema, como causa vs efecto, antes vs después o propiedad A vs propiedad B).
- titulo: título motivador del juego de clasificación (≤10 palabras).
- categoria_a: primera categoría conceptual, con:
  * `id`: identificador alfanumérico corto sin espacios (ej. 'cat_a' o 'causa', ≤10 caracteres).
  * `nombre`: nombre representativo de la categoría (≤4 palabras).
  * `descripcion`: definición o criterio distintivo de esta categoría (≤15 palabras).
- categoria_b: segunda categoría conceptual contrastante, con:
  * `id`: identificador alfanumérico corto sin espacios diferente a categoria_a (ej. 'cat_b' o 'pga', ≤10 caracteres).
  * `nombre`: nombre representativo de la categoría (≤4 palabras).
  * `descripcion`: definición o criterio distintivo de esta categoría (≤15 palabras).
- items: exactamente {n} elementos técnicos para clasificar. Reparte los items de forma equilibrada entre ambas categorías, ordenados de menor a mayor dificultad, incluyendo al menos un caso sutil o desafiante. Cada item debe tener:
  * `id`: identificador único breve (ej. 'item-1', 'item-2').
  * `texto`: elemento, componente, sentencia o mecanismo concreto a clasificar (≤10 palabras).
  * `contexto`: situación práctica o función en la que interviene en el tema (≤18 palabras).
  * `categoria`: el `id` exacto de la categoría a la que pertenece (`categoria_a.id` o `categoria_b.id`).
  * `feedback`: explicación concisa de por qué pertenece a esa categoría y cómo opera (≤20 palabras).
- sintesis: conclusión pedagógica que resuma la complementariedad y diferencia esencial entre ambas categorías (≤35 palabras).
[RESTRICCIONES] Sin jerga vacía. Cada item debe pertenecer de forma objetiva y justificable a su categoría asignada. Sin repeticiones. No generes HTML ni hagas mención al esquema JSON.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_rounds", 6)
    base_items = [
        {
            "id": "item-1",
            "texto": f"Tablespace de {concept}"[:80],
            "contexto": "Unidad lógica que agrupa segmentos y tablas en la base de datos."[:120],
            "categoria": "cat_logica",
            "feedback": f"El tablespace es una división lógica que organiza los datos de {concept}."[:140],
        },
        {
            "id": "item-2",
            "texto": "Segmento de datos de tabla",
            "contexto": "Estructura lógica asignada para almacenar las filas de un objeto.",
            "categoria": "cat_logica",
            "feedback": "Los segmentos son divisiones lógicas compuestas por uno o más extents.",
        },
        {
            "id": "item-3",
            "texto": "Extent de almacenamiento",
            "contexto": "Conjunto contiguo de bloques de base de datos asignados a un segmento.",
            "categoria": "cat_logica",
            "feedback": "El extent es una agrupación lógica intermedia entre bloque y segmento.",
        },
        {
            "id": "item-4",
            "texto": "Bloque de datos de BD",
            "contexto": "Unidad lógica mínima de E/S gestionada por la instancia y la SGA.",
            "categoria": "cat_logica",
            "feedback": "El bloque lógico es la granularidad básica administrada por el motor.",
        },
        {
            "id": "item-5",
            "texto": "Datafile en disco (.dbf)",
            "contexto": "Archivo físico almacenado en el sistema de archivos del servidor.",
            "categoria": "cat_fisica",
            "feedback": "Es el contenedor físico en disco que almacena los datos del tablespace.",
        },
        {
            "id": "item-6",
            "texto": "Control file binario",
            "contexto": "Archivo físico que registra la estructura de la base de datos y SCN.",
            "categoria": "cat_fisica",
            "feedback": "Es un archivo físico indispensable para montar y abrir la base de datos.",
        },
        {
            "id": "item-7",
            "texto": "Grupo de Redo Log en disco",
            "contexto": "Archivos secuenciales donde el proceso LGWR registra transacciones.",
            "categoria": "cat_fisica",
            "feedback": "Son archivos físicos que aseguran la durabilidad ante fallas del sistema.",
        },
        {
            "id": "item-8",
            "texto": "Bloque del sistema operativo",
            "contexto": "Unidad de lectura y escritura del medio de almacenamiento físico.",
            "categoria": "cat_fisica",
            "feedback": "Es el sector físico en disco administrado directamente por el SO.",
        },
    ]

    return {
        "titulo": f"Clasificación: Estructuras de {concept}"[:70],
        "categoria_a": {
            "id": "cat_logica",
            "nombre": "Estructura Lógica"[:40],
            "descripcion": f"Organización abstracta de {concept} administrada por el motor de BD."[:100],
        },
        "categoria_b": {
            "id": "cat_fisica",
            "nombre": "Estructura Física"[:40],
            "descripcion": f"Archivos y sectores físicos de {concept} almacenados en el sistema."[:100],
        },
        "items": base_items[:n],
        "sintesis": (
            f"Comprender la diferencia entre estructura lógica y física en {concept} "
            f"permite al DBA diseñar arquitecturas eficientes, garantizando independencia lógica "
            f"y optimización del almacenamiento en disco."
        )[:250],
    }


_STYLE = """
<style>
.drag-game-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 20px);
}
.drag-hud {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 16px;
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
}
.hud-indicators {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
.category-zone-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--surface, #ffffff);
  border: 2px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 18px;
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
  transition: border-color .2s ease-out;
}
.category-zone-card:hover {
  border-color: var(--primary, #0A3D91);
}
.category-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.category-badge {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.category-badge--a {
  background: var(--primary, #0A3D91);
}
.category-badge--b {
  background: var(--accent, #F47A20);
}
.category-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text, #15233B);
  margin: 0 0 4px 0;
}
.category-desc {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text-muted, #5A6B85);
  margin: 0;
}
.classified-box {
  border-top: 1px dashed var(--border, #E2E8F2);
  padding-top: 12px;
  min-height: 80px;
}
.classified-heading {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #5A6B85);
  margin: 0 0 8px 0;
}
.classified-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.classified-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.88rem;
  line-height: 1.4;
  padding: 8px 12px;
  background: var(--surface-tint, #EAF0FB);
  border-radius: var(--radius-sm, 8px);
  border-left: 3px solid var(--success, #146C49);
}
.item-ok-badge {
  color: var(--success, #146C49);
  font-weight: 700;
  flex-shrink: 0;
}
.items-pool {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
}
.pool-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border, #E2E8F2);
  padding-bottom: 12px;
}
.pool-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
  margin: 0;
}
.pool-counter {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted, #5A6B85);
  background: var(--surface-tint, #EAF0FB);
  padding: 4px 10px;
  border-radius: 999px;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.drag-item-card {
  background: var(--surface, #ffffff);
  border: 1.5px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color .2s ease-out, background-color .2s ease-out;
}
.drag-item-card:hover {
  border-color: var(--primary, #0A3D91);
}
.drag-item-card.is-matched {
  border-color: var(--success, #146C49);
  background: var(--success-bg, #EAF7F1);
}
.drag-item-card.is-shake {
  animation: upao-drag-shake 0.4s ease-in-out;
}
@keyframes upao-drag-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.drag-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drag-item-term {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text, #15233B);
  margin: 0;
}
.drag-item-hint {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-muted, #5A6B85);
  margin: 0;
}
.item-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--border, #E2E8F2);
}
.action-prompt {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted, #5A6B85);
}
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-classify {
  flex: 1 1 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 12px;
  border-radius: var(--radius-sm, 8px);
  border: 1.5px solid var(--border, #E2E8F2);
  background: var(--surface, #ffffff);
  color: var(--text, #15233B);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-out;
}
.btn-classify:hover:not(:disabled) {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
}
.btn-classify:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.btn-classify:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
  font-size: 0.72rem;
  font-weight: 700;
}
.item-feedback {
  font-size: 0.85rem;
  line-height: 1.4;
  padding: 8px 10px;
  border-radius: var(--radius-sm, 8px);
}
.item-feedback--ok {
  background: var(--success-bg, #EAF7F1);
  border: 1px solid var(--success, #146C49);
  color: var(--success, #146C49);
}
.item-feedback--bad {
  background: var(--danger-bg, #FBEDED);
  border: 1px solid var(--danger, #C5221F);
  color: var(--danger, #C5221F);
}
</style>
"""


_JS = """
const rawDataEl = document.getElementById('drag-game-data');
if (!rawDataEl) return;
let gameData = {};
try {
  gameData = JSON.parse(rawDataEl.textContent);
} catch (err) {
  return;
}

const catA = gameData.categoria_a || {};
const catB = gameData.categoria_b || {};
const itemsMap = gameData.items || {};
const totalItems = gameData.total || 0;

const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const poolCounter = document.getElementById('pool-counter');
const resolvedItems = new Set();
const ptsPerItem = 10;

function classifyItem(itemId, targetCat) {
  if (resolvedItems.has(itemId)) return;
  const item = itemsMap[itemId];
  if (!item) return;

  const card = document.getElementById('card-' + itemId);
  const fbEl = document.getElementById('fb-' + itemId);
  const dragItemEl = card ? card.querySelector('upao-drag-item') : null;
  const isCorrect = (item.categoria === targetCat);

  if (isCorrect) {
    resolvedItems.add(itemId);
    if (dragItemEl && typeof dragItemEl.matched === 'function') {
      dragItemEl.matched();
    }
    if (card) {
      card.classList.add('is-matched');
      const btns = card.querySelectorAll('.btn-classify');
      btns.forEach(function (b) { b.disabled = true; });
    }
    if (fbEl) {
      fbEl.hidden = false;
      fbEl.className = 'item-feedback item-feedback--ok';
      fbEl.textContent = '✓ ' + item.feedback;
    }

    const listEl = document.getElementById('list-' + targetCat);
    if (listEl) {
      const li = document.createElement('li');
      li.className = 'classified-item';
      const badge = document.createElement('span');
      badge.className = 'item-ok-badge';
      badge.textContent = '✓';
      const txtDiv = document.createElement('div');
      const termSpan = document.createElement('strong');
      termSpan.textContent = item.texto;
      txtDiv.appendChild(termSpan);
      txtDiv.appendChild(document.createTextNode(' — ' + item.feedback));
      li.appendChild(badge);
      li.appendChild(txtDiv);
      listEl.appendChild(li);
    }

    if (scoreEl && typeof scoreEl.add === 'function') {
      scoreEl.add(ptsPerItem);
    }

    const catName = (targetCat === catA.id) ? catA.nombre : catB.nombre;
    if (statusEl) {
      statusEl.setAttribute('state', 'success');
      statusEl.textContent = '¡Correcto! «' + item.texto + '» clasificado en ' + catName + '.';
    }

    if (poolCounter) {
      const remaining = totalItems - resolvedItems.size;
      poolCounter.textContent = remaining > 0 ? ('Pendientes: ' + remaining + ' de ' + totalItems) : '¡Todos los elementos clasificados!';
    }

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('item-' + itemId);
    }

    if (resolvedItems.size >= totalItems && statusEl) {
      statusEl.setAttribute('state', 'success');
      statusEl.textContent = '¡Completado! Has clasificado todos los elementos correctamente.';
    }
  } else {
    if (dragItemEl && typeof dragItemEl.wrong === 'function') {
      dragItemEl.wrong();
    }
    if (card) {
      card.classList.add('is-shake');
      setTimeout(function () { card.classList.remove('is-shake'); }, 600);
    }
    if (fbEl) {
      fbEl.hidden = false;
      fbEl.className = 'item-feedback item-feedback--bad';
      fbEl.textContent = '✗ No corresponde a esta categoría. ' + item.contexto;
    }

    const wrongCatName = (targetCat === catA.id) ? catA.nombre : catB.nombre;
    if (statusEl) {
      statusEl.setAttribute('state', 'error');
      statusEl.textContent = '«' + item.texto + '» no pertenece a ' + wrongCatName + '. Inténtalo de nuevo.';
    }
  }
}

document.querySelectorAll('.btn-classify').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const itemId = btn.getAttribute('data-item-id');
    const targetCat = btn.getAttribute('data-target-cat');
    if (itemId && targetCat) {
      classifyItem(itemId, targetCat);
    }
  });
});

document.addEventListener('upao-drop', function (e) {
  const detail = e.detail || {};
  const itemId = detail.itemId;
  const zone = e.target;
  const targetCat = (zone && typeof zone.getAttribute === 'function' ? zone.getAttribute('accepts') : '') ||
    (detail.zoneId === 'zone-' + catA.id ? catA.id : catB.id);
  if (itemId && targetCat) {
    classifyItem(itemId, targetCat);
  }
});
"""


def render(data: dict, ctx: RenderContext) -> str:
    cat_a = data["categoria_a"]
    cat_b = data["categoria_b"]
    items = data["items"]
    n = len(items)

    items_html_list = []
    for it in items:
        item_id = esc(it["id"])
        item_texto = esc(it["texto"])
        item_ctx = esc(it["contexto"])
        item_cat = esc(it["categoria"])

        items_html_list.append(
            f'<article class="drag-item-card" id="card-{item_id}" data-item-id="{item_id}">'
            f'  <upao-drag-item item-id="{item_id}" category="{item_cat}">'
            f'    <div class="drag-item-content">'
            f'      <p class="drag-item-term">{item_texto}</p>'
            f'      <p class="drag-item-hint">{item_ctx}</p>'
            f"    </div>"
            f"  </upao-drag-item>"
            f'  <div class="item-actions" role="group" aria-label="Clasificar {item_texto}">'
            f'    <span class="action-prompt">O clasifica directamente:</span>'
            f'    <div class="action-buttons">'
            f'      <button type="button" class="btn-classify" data-item-id="{item_id}" data-target-cat="{esc(cat_a["id"])}" aria-label="Clasificar {item_texto} en {esc(cat_a["nombre"])}">'
            f'        <span class="btn-tag" aria-hidden="true">A</span> {esc(cat_a["nombre"])}'
            f"      </button>"
            f'      <button type="button" class="btn-classify" data-item-id="{item_id}" data-target-cat="{esc(cat_b["id"])}" aria-label="Clasificar {item_texto} en {esc(cat_b["nombre"])}">'
            f'        <span class="btn-tag" aria-hidden="true">B</span> {esc(cat_b["nombre"])}'
            f"      </button>"
            f"    </div>"
            f"  </div>"
            f'  <div class="item-feedback" id="fb-{item_id}" role="status" aria-live="polite" hidden></div>'
            f"</article>"
        )
    items_html = "".join(items_html_list)

    game_json = json_data(
        {
            "categoria_a": cat_a,
            "categoria_b": cat_b,
            "items": {it["id"]: it for it in items},
            "total": n,
        },
        element_id="drag-game-data",
    )

    return f"""{_STYLE}
<upao-header eyebrow="JUEGO DRAG &amp; DROP" title="{esc(data["titulo"])}">
  <p>Arrastra cada elemento a su categoría correcta o utiliza los botones de selección directa para jugar con teclado o móvil.</p>
</upao-header>

<div class="drag-game-container">
  <div class="drag-hud">
    <upao-progress id="prog" current="0" total="{n}" label="Progreso de clasificación" show-fraction></upao-progress>
    <div class="hud-indicators">
      <upao-status id="status" state="info">Selecciona o arrastra un elemento para clasificarlo</upao-status>
      <upao-score id="score" current="0" max="{n * 10}" label="Puntuación"></upao-score>
    </div>
  </div>

  <div class="zones-grid" role="region" aria-label="Zonas de destino de clasificación">
    <section class="category-zone-card" id="zone-card-{esc(cat_a["id"])}">
      <div class="category-header">
        <span class="category-badge category-badge--a" aria-hidden="true">A</span>
        <div>
          <h2 class="category-name">{esc(cat_a["nombre"])}</h2>
          <p class="category-desc">{esc(cat_a["descripcion"])}</p>
        </div>
      </div>
      <upao-drop-zone zone-id="zone-{esc(cat_a["id"])}" accepts="{esc(cat_a["id"])}" label="{esc(cat_a["nombre"])}"></upao-drop-zone>
      <div class="classified-box">
        <h3 class="classified-heading">Elementos asignados:</h3>
        <ul class="classified-list" id="list-{esc(cat_a["id"])}" aria-label="Elementos asignados a {esc(cat_a["nombre"])}"></ul>
      </div>
    </section>

    <section class="category-zone-card" id="zone-card-{esc(cat_b["id"])}">
      <div class="category-header">
        <span class="category-badge category-badge--b" aria-hidden="true">B</span>
        <div>
          <h2 class="category-name">{esc(cat_b["nombre"])}</h2>
          <p class="category-desc">{esc(cat_b["descripcion"])}</p>
        </div>
      </div>
      <upao-drop-zone zone-id="zone-{esc(cat_b["id"])}" accepts="{esc(cat_b["id"])}" label="{esc(cat_b["nombre"])}"></upao-drop-zone>
      <div class="classified-box">
        <h3 class="classified-heading">Elementos asignados:</h3>
        <ul class="classified-list" id="list-{esc(cat_b["id"])}" aria-label="Elementos asignados a {esc(cat_b["nombre"])}"></ul>
      </div>
    </section>
  </div>

  <section class="items-pool" aria-labelledby="pool-title">
    <div class="pool-header">
      <h2 id="pool-title" class="pool-title">Elementos por clasificar</h2>
      <span class="pool-counter" id="pool-counter">Pendientes: {n} de {n}</span>
    </div>
    <div class="items-grid" id="pool-grid">
      {items_html}
    </div>
  </section>
</div>

<upao-summary title="Síntesis de Clasificación">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Finalizar exploración" locked></upao-complete>
</upao-summary>

{game_json}
{script(PROGRESS_JS)}
{script(_JS)}
"""


SPEC = TemplateSpec(
    phase="explore",
    rt=3,
    title="Juego Drag & Drop",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
