"""EXPLORE 9 — Mapa Mental: emparejamiento interactivo de analogías cotidianas y nodos técnicos.

El estudiante asocia pistas intuitivas de la vida real con componentes y mecanismos reales
de bases de datos (relación 1:1) mediante interacción de clic o drag & drop, consolidando
una red conceptual y revelando la arquitectura integrada del tema al completar todos los vínculos.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_cards",
        6,
        min=4,
        max=8,
        help="Número de tarjetas de emparejamiento",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_cards"]
    return obj(
        titulo=s(70),
        intro=s(160),
        tarjetas=arr(
            obj(
                id=s(10),
                pista_cotidiana=s(100),
                nodo_tecnico=s(80),
                feedback_correcto=s(140),
                feedback_incorrecto=s(140),
            ),
            min_items=n,
            max_items=n,
        ),
        revelacion=s(350),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_cards"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Facilitador de mapas mentales y esquemas cognitivos para el aprendizaje de sistemas de gestión de bases de datos.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña una actividad interactiva de mapa mental basada en emparejamiento con exactamente {n} tarjetas que conecten intuiciones cotidianas con componentes o mecanismos técnicos reales de «{concept}» (relación 1:1).
- titulo: título atractivo e intrigante del mapa mental o red conceptual (≤10 palabras).
- intro: breve orientación motivadora (≤25 palabras) que invite al estudiante a vincular cada pista de la vida diaria con su equivalente en la arquitectura de datos.
- tarjetas: lista de exactamente {n} tarjetas de emparejamiento. Cada tarjeta contiene:
  * `id`: identificador corto único sin espacios (ej. 'c1', 'c2', 'c3', ≤5 caracteres).
  * `pista_cotidiana`: situación, objeto, analogía o metáfora cotidiana intuitiva sin jerga técnica (≤15 palabras).
  * `nodo_tecnico`: término técnico, estructura, proceso o componente real de «{concept}» en el SGBD (≤8 palabras).
  * `feedback_correcto`: explicación clara que valida la relación y aporta contexto técnico de su rol en «{concept}» (≤20 palabras).
  * `feedback_incorrecto`: pista constructiva sin desvelar la solución directa, orientando la reflexión del estudiante (≤20 palabras).
- revelacion: síntesis conceptual integradora (≤60 palabras) en tono celebratorio que articule cómo todos estos nodos forman el mapa mental cohesivo del funcionamiento de «{concept}».
[RESTRICCIONES] Las pistas cotidianas deben entenderse sin conocimientos técnicos previos. Cada pista debe asociarse de forma única e inequívoca con su nodo técnico. No generes etiquetas HTML ni formato web.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Facilitador de mapas mentales y esquemas cognitivos para el aprendizaje de «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña una actividad interactiva de mapa mental basada en emparejamiento con exactamente {n} tarjetas que conecten intuiciones cotidianas con componentes o mecanismos técnicos reales de «{concept}» (relación 1:1).
- titulo: título atractivo e intrigante del mapa mental o red conceptual (≤10 palabras).
- intro: breve orientación motivadora (≤25 palabras) que invite al estudiante a vincular cada pista de la vida diaria con su equivalente en la arquitectura de datos.
- tarjetas: lista de exactamente {n} tarjetas de emparejamiento. Cada tarjeta contiene:
  * `id`: identificador corto único sin espacios (ej. 'c1', 'c2', 'c3', ≤5 caracteres).
  * `pista_cotidiana`: situación, objeto, analogía o metáfora cotidiana intuitiva sin jerga técnica (≤15 palabras).
  * `nodo_tecnico`: término técnico, estructura, proceso o componente real de «{concept}» en el tema (≤8 palabras).
  * `feedback_correcto`: explicación clara que valida la relación y aporta contexto técnico de su rol en «{concept}» (≤20 palabras).
  * `feedback_incorrecto`: pista constructiva sin desvelar la solución directa, orientando la reflexión del estudiante (≤20 palabras).
- revelacion: síntesis conceptual integradora (≤60 palabras) en tono celebratorio que articule cómo todos estos nodos forman el mapa mental cohesivo del funcionamiento de «{concept}».
[RESTRICCIONES] Las pistas cotidianas deben entenderse sin conocimientos técnicos previos. Cada pista debe asociarse de forma única e inequívoca con su nodo técnico. No generes etiquetas HTML ni formato web.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_cards", 6)
    base_cards = [
        {
            "id": "c1",
            "pista_cotidiana": "La mesa de trabajo donde tienes a mano los libros que estás leyendo hoy.",
            "nodo_tecnico": "Buffer Cache (Memoria RAM)",
            "feedback_correcto": f"¡Exacto! El buffer cache retiene en memoria los bloques de {concept} más consultados.",
            "feedback_incorrecto": "Piensa en el espacio de memoria rápida donde se trabaja antes de guardar los cambios.",
        },
        {
            "id": "c2",
            "pista_cotidiana": "El cuaderno de notas donde anotas cada cambio urgente por si se corta la luz.",
            "nodo_tecnico": "Redo Log (Registro de transacciones)",
            "feedback_correcto": f"¡Correcto! El redo log anota secuencialmente cada cambio para garantizar la durabilidad de {concept}.",
            "feedback_incorrecto": "Busca el componente que asegura la durabilidad escribiendo cambios en orden cronológico.",
        },
        {
            "id": "c3",
            "pista_cotidiana": "El índice alfabético al final de un libro para saltar directo a la página.",
            "nodo_tecnico": "Índice B-Tree (Acceso rápido)",
            "feedback_correcto": f"¡Muy bien! Los índices permiten localizar registros rápidamente en {concept} sin escanear toda la tabla.",
            "feedback_incorrecto": "Esta pista se refiere a una estructura auxiliar ordenada para acelerar búsquedas.",
        },
        {
            "id": "c4",
            "pista_cotidiana": "La opción de deshacer (Ctrl+Z) para revertir una acción si te equivocas.",
            "nodo_tecnico": "Segmentos Undo (Rollback)",
            "feedback_correcto": f"¡Excelente! Los segmentos undo guardan la imagen previa para revertir cambios en {concept}.",
            "feedback_incorrecto": "No es el registro de cambios futuros, sino el mecanismo para revertir operaciones previas.",
        },
        {
            "id": "c5",
            "pista_cotidiana": "El archivero definitivo en el sótano donde se guardan los expedientes en físico.",
            "nodo_tecnico": "Datafiles (Almacenamiento persistente)",
            "feedback_correcto": f"¡Acertaste! Los datafiles son los archivos persistentes en disco donde {concept} guarda sus datos.",
            "feedback_incorrecto": "Se trata del contenedor permanente en disco, no de la memoria volátil.",
        },
        {
            "id": "c6",
            "pista_cotidiana": "El recepcionista que sella la hora oficial y sincroniza todos los relojes de la oficina.",
            "nodo_tecnico": "Proceso Checkpoint (Sincronización CKPT)",
            "feedback_correcto": f"¡Correcto! El checkpoint sincroniza los encabezados y marca el punto seguro en {concept}.",
            "feedback_incorrecto": "Relaciona esta pista con el evento de sincronización periódica entre memoria y disco.",
        },
        {
            "id": "c7",
            "pista_cotidiana": "El mapa de navegación y lista maestra que indica dónde está cada pieza de la nave.",
            "nodo_tecnico": "Control File (Metadatos de BD)",
            "feedback_correcto": f"¡Perfecto! El control file contiene la estructura física y el estado operativo de {concept}.",
            "feedback_incorrecto": "Identifica el archivo binario esencial que guía el arranque y montaje de la base de datos.",
        },
        {
            "id": "c8",
            "pista_cotidiana": "El encargado de limpieza que pasa periódicamente a guardar los papeles de la mesa al archivero.",
            "nodo_tecnico": "Proceso DBWn (Escritor en Disco)",
            "feedback_correcto": "¡Brillante! El proceso DBWn traslada los bloques modificados desde la memoria caché hacia el disco.",
            "feedback_incorrecto": "Busca el proceso en segundo plano que escribe los bloques sucios desde la memoria al disco.",
        },
    ]

    cards = []
    for c in base_cards[:n]:
        cards.append(
            {
                "id": c["id"][:10],
                "pista_cotidiana": c["pista_cotidiana"][:100],
                "nodo_tecnico": c["nodo_tecnico"][:80],
                "feedback_correcto": c["feedback_correcto"][:140],
                "feedback_incorrecto": c["feedback_incorrecto"][:140],
            }
        )

    return {
        "titulo": f"Mapa Mental: Conexiones de {concept}"[:70],
        "intro": f"Descubre la arquitectura de {concept} asociando intuiciones cotidianas con sus componentes técnicos."[
            :160
        ],
        "tarjetas": cards,
        "revelacion": (
            f"¡Excelente conexión mental! Cada analogía cotidiana refleja cómo {concept} organiza su memoria, persistencia y "
            f"consistencia en el motor de base de datos para brindar alta disponibilidad, integridad transaccional y rendimiento óptimo."
        )[:350],
    }


_STYLE = """
<style>
.mindmap-feedback-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface, #ffffff);
  border: 1.5px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.06));
  transition: border-color .2s ease-out, background-color .2s ease-out;
  margin-bottom: 20px;
}
.mindmap-feedback-banner.is-success {
  border-color: var(--success, #146C49);
  background: var(--success-bg, #EAF7F1);
}
.mindmap-feedback-banner.is-error {
  border-color: var(--danger, #C5221F);
  background: var(--danger-bg, #FBEDED);
}
.feedback-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-tint, #EAF0FB);
  font-size: 1.1rem;
}
.mindmap-feedback-banner.is-success .feedback-badge {
  background: var(--success, #146C49);
  color: #ffffff;
}
.mindmap-feedback-banner.is-error .feedback-badge {
  background: var(--danger, #C5221F);
  color: #ffffff;
}
.feedback-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.feedback-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text, #15233B);
}
.mindmap-feedback-banner.is-success .feedback-title {
  color: var(--success, #146C49);
}
.mindmap-feedback-banner.is-error .feedback-title {
  color: var(--danger, #C5221F);
}
.feedback-msg {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text-muted, #5A6B85);
}
.mindmap-board {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: start;
  margin-bottom: 24px;
}
@media (max-width: 768px) {
  .mindmap-board {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .mindmap-divider {
    display: none;
  }
}
.mindmap-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.col-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.col-pill {
  align-self: flex-start;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 999px;
}
.col-pill--clue {
  background: var(--surface-tint, #EAF0FB);
  color: var(--primary, #0A3D91);
  border: 1px solid var(--border, #E2E8F2);
}
.col-pill--tech {
  background: #FFF3EB;
  color: var(--action, #B84B00);
  border: 1px solid #FFE0CC;
}
.col-sub {
  font-size: 0.82rem;
  color: var(--text-muted, #5A6B85);
}
.cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mindmap-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 40px;
  height: 100%;
}
.divider-icon {
  font-size: 1.2rem;
  color: var(--accent, #F47A20);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.divider-line {
  width: 2px;
  flex: 1;
  background: dashed var(--border, #E2E8F2);
  margin-top: -16px;
  min-height: 100px;
}
.mindmap-card {
  background: var(--surface, #ffffff);
  border: 2px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  transition: transform .15s ease-out, border-color .15s ease-out, background-color .15s ease-out, box-shadow .15s ease-out;
  box-shadow: 0 2px 8px rgba(10,61,145,.04);
}
.mindmap-card:hover:not(.is-matched):not(:disabled) {
  border-color: var(--primary, #0A3D91);
  box-shadow: 0 4px 14px rgba(10,61,145,.10);
  transform: translateY(-1px);
}
.mindmap-card:focus-visible {
  outline: 2px solid var(--primary, #0A3D91);
  outline-offset: 2px;
}
.mindmap-card.is-selected {
  border-color: var(--primary, #0A3D91);
  background: var(--surface-tint, #EAF0FB);
  box-shadow: 0 0 0 3px rgba(10,61,145,.15);
  transform: scale(1.01);
}
.mindmap-card.tech-card.is-selected {
  border-color: var(--accent, #F47A20);
  background: #FFF3EB;
  box-shadow: 0 0 0 3px rgba(244,122,32,.18);
}
.mindmap-card.is-drag-over {
  border-color: var(--accent, #F47A20);
  border-style: dashed;
  background: #FFF7F0;
  transform: scale(1.02);
}
.mindmap-card.is-dragging {
  opacity: 0.45;
  transform: scale(0.98);
}
.mindmap-card.is-matched {
  border-color: var(--success, #146C49);
  background: var(--success-bg, #EAF7F1);
  cursor: default;
  box-shadow: none;
  opacity: 0.92;
}
.mindmap-card.is-wrong {
  border-color: var(--danger, #C5221F) !important;
  background: var(--danger-bg, #FBEDED) !important;
  animation: mindmap-shake 0.4s ease-in-out;
}
@keyframes mindmap-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@media (prefers-reduced-motion: reduce) {
  .mindmap-card.is-wrong {
    animation: none;
  }
}
.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted, #5A6B85);
}
.card-tag--tech {
  color: var(--action, #B84B00);
}
.match-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--success, #146C49);
  background: #ffffff;
  border: 1px solid var(--success, #146C49);
  border-radius: 999px;
  padding: 1px 8px;
}
.card-desc {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text, #15233B);
}
.tech-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary, #0A3D91);
}
.mindmap-network-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}
.network-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.network-title {
  margin: 0;
  font-size: 1.15rem;
  color: var(--primary, #0A3D91);
}
.network-intro {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted, #5A6B85);
}
.network-empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px dashed var(--border, #E2E8F2);
  border-radius: var(--radius-sm, 8px);
  background: var(--surface-tint, #EAF0FB);
  color: var(--text-muted, #5A6B85);
  font-size: 0.88rem;
}
.empty-icon {
  font-size: 1.1rem;
}
.network-connections-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.network-connection-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface-tint, #EAF0FB);
  border-left: 3px solid var(--success, #146C49);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.88rem;
  line-height: 1.4;
  animation: fadeInConn .25s ease-out;
}
@keyframes fadeInConn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.conn-icon {
  color: var(--success, #146C49);
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}
.conn-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.conn-pair {
  color: var(--text, #15233B);
  font-size: 0.9rem;
}
.conn-pair strong {
  color: var(--primary, #0A3D91);
}
.conn-feedback {
  color: var(--text-muted, #5A6B85);
  font-size: 0.84rem;
}
.revelation-card {
  margin-bottom: 24px;
  border-color: var(--success, #146C49);
  box-shadow: 0 6px 24px rgba(20,108,73,.12);
  animation: fadeInConn .3s ease-out;
}
.revelation-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.ova-badge--success {
  background: var(--success-bg, #EAF7F1);
  color: var(--success, #146C49);
  border: 1px solid var(--success, #146C49);
}
.revelation-title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--success, #146C49);
}
.revelation-body {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--text, #15233B);
}
.revelation-text {
  margin: 0;
}
</style>
"""


def _permute_nodes(tarjetas: list) -> list:
    n = len(tarjetas)
    perms = {
        4: [1, 3, 0, 2],
        5: [2, 0, 4, 1, 3],
        6: [3, 0, 5, 1, 2, 4],
        7: [3, 6, 0, 5, 1, 4, 2],
        8: [4, 7, 1, 6, 0, 3, 5, 2],
    }
    p = perms.get(n)
    if p and len(p) == n:
        return [tarjetas[i] for i in p]
    if n > 1:
        return tarjetas[1:] + tarjetas[:1]
    return tarjetas


def render(data: dict, ctx: RenderContext) -> str:
    tarjetas = data.get("tarjetas", [])
    total = len(tarjetas)

    cards_pistas = []
    for k, t in enumerate(tarjetas, 1):
        cards_pistas.append(
            f'<div class="mindmap-card clue-card" '
            f'id="clue-{esc(t["id"])}" '
            f'data-card-id="{esc(t["id"])}" '
            f'data-type="clue" '
            f'tabindex="0" '
            f'role="button" '
            f'aria-pressed="false" '
            f'aria-label="Pista cotidiana: {esc(t["pista_cotidiana"])}" '
            f'draggable="true">'
            f'<div class="card-topline">'
            f'<span class="card-tag">Pista #{k}</span>'
            f'<span class="match-badge" aria-hidden="true" hidden>✓ Conectado</span>'
            f"</div>"
            f'<p class="card-desc">{esc(t["pista_cotidiana"])}</p>'
            f"</div>"
        )
    cards_pistas_html = "".join(cards_pistas)

    permuted = _permute_nodes(tarjetas)
    cards_nodos = []
    for t in permuted:
        cards_nodos.append(
            f'<div class="mindmap-card tech-card" '
            f'id="tech-{esc(t["id"])}" '
            f'data-card-id="{esc(t["id"])}" '
            f'data-type="tech" '
            f'tabindex="0" '
            f'role="button" '
            f'aria-pressed="false" '
            f'aria-label="Nodo técnico: {esc(t["nodo_tecnico"])}" '
            f'draggable="true">'
            f'<div class="card-topline">'
            f'<span class="card-tag card-tag--tech">Nodo Técnico</span>'
            f'<span class="match-badge" aria-hidden="true" hidden>✓ Conectado</span>'
            f"</div>"
            f'<h3 class="tech-title">{esc(t["nodo_tecnico"])}</h3>'
            f"</div>"
        )
    cards_nodos_html = "".join(cards_nodos)

    data_for_js = {
        "total": total,
        "tarjetas": [
            {
                "id": t["id"],
                "pista_cotidiana": t["pista_cotidiana"],
                "nodo_tecnico": t["nodo_tecnico"],
                "feedback_correcto": t["feedback_correcto"],
                "feedback_incorrecto": t["feedback_incorrecto"],
            }
            for t in tarjetas
        ],
    }

    _js = """
const dataEl = document.getElementById('mindmap-data');
if (!dataEl) return;
let parsed = {};
try {
  parsed = JSON.parse(dataEl.textContent);
} catch (e) {
  return;
}

const cardsMap = {};
(parsed.tarjetas || []).forEach(function(c) {
  cardsMap[c.id] = c;
});
const total = Number(parsed.total || 0);

const fbBanner = document.getElementById('mindmap-live-feedback');
const fbTitle = document.getElementById('feedback-title');
const fbMsg = document.getElementById('feedback-msg');
const fbBadge = document.getElementById('feedback-badge');

const emptyNetwork = document.getElementById('network-empty');
const networkList = document.getElementById('network-connections');
const revelacionCard = document.getElementById('revelacion-card');

const matchedCards = new Set();
let selectedCard = null;
let draggedCard = null;

function setFeedback(type, title, msg) {
  if (!fbBanner || !fbTitle || !fbMsg) return;
  fbBanner.classList.remove('is-success', 'is-error');
  if (type === 'success') {
    fbBanner.classList.add('is-success');
    if (fbBadge) fbBadge.textContent = '✓';
  } else if (type === 'error') {
    fbBanner.classList.add('is-error');
    if (fbBadge) fbBadge.textContent = '⚠';
  } else {
    if (fbBadge) fbBadge.textContent = '💡';
  }
  fbTitle.textContent = title;
  fbMsg.textContent = msg;
}

function handleCardClick(card) {
  const cardId = card.getAttribute('data-card-id');
  const cardType = card.getAttribute('data-type');
  if (matchedCards.has(cardId)) return;

  if (!selectedCard) {
    selectedCard = card;
    card.classList.add('is-selected');
    card.setAttribute('aria-pressed', 'true');
    if (cardType === 'clue') {
      setFeedback('info', 'Pista seleccionada', 'Ahora haz clic en el nodo técnico correspondiente para asociarlo.');
    } else {
      setFeedback('info', 'Nodo técnico seleccionado', 'Ahora haz clic en la pista cotidiana correspondiente para asociarla.');
    }
    return;
  }

  if (selectedCard === card) {
    card.classList.remove('is-selected');
    card.setAttribute('aria-pressed', 'false');
    selectedCard = null;
    setFeedback('info', 'Asocia cada intuición cotidiana con su nodo técnico', 'Haz clic en una pista cotidiana y luego en su nodo técnico correspondiente, o arrastra una tarjeta sobre la otra.');
    return;
  }

  const prevType = selectedCard.getAttribute('data-type');
  if (prevType === cardType) {
    selectedCard.classList.remove('is-selected');
    selectedCard.setAttribute('aria-pressed', 'false');
    selectedCard = card;
    card.classList.add('is-selected');
    card.setAttribute('aria-pressed', 'true');
    if (cardType === 'clue') {
      setFeedback('info', 'Nueva pista seleccionada', 'Ahora haz clic en el nodo técnico correspondiente para asociarlo.');
    } else {
      setFeedback('info', 'Nuevo nodo técnico seleccionado', 'Ahora haz clic en la pista cotidiana correspondiente para asociarla.');
    }
    return;
  }

  const firstCard = selectedCard;
  const secondCard = card;
  const firstId = firstCard.getAttribute('data-card-id');
  const secondId = secondCard.getAttribute('data-card-id');

  attemptMatch(firstCard, secondCard, firstId, secondId);
}

function attemptMatch(cardA, cardB, idA, idB) {
  if (idA === idB) {
    const cardId = idA;
    matchedCards.add(cardId);

    [cardA, cardB].forEach(function(c) {
      c.classList.remove('is-selected', 'is-wrong');
      c.classList.add('is-matched');
      c.setAttribute('aria-pressed', 'false');
      c.setAttribute('draggable', 'false');
      c.removeAttribute('tabindex');
      c.setAttribute('aria-disabled', 'true');
      const badge = c.querySelector('.match-badge');
      if (badge) badge.hidden = false;
    });

    selectedCard = null;
    const data = cardsMap[cardId] || {};

    if (networkList) {
      if (emptyNetwork) emptyNetwork.hidden = true;
      const li = document.createElement('li');
      li.className = 'network-connection-item';

      const icon = document.createElement('span');
      icon.className = 'conn-icon';
      icon.textContent = '✓';

      const textDiv = document.createElement('div');
      textDiv.className = 'conn-text';

      const pairSpan = document.createElement('span');
      pairSpan.className = 'conn-pair';
      const strongA = document.createElement('strong');
      strongA.textContent = data.pista_cotidiana || '';
      const linkTxt = document.createTextNode('  ⟵(vínculo)⟶  ');
      const strongB = document.createElement('strong');
      strongB.textContent = data.nodo_tecnico || '';
      pairSpan.appendChild(strongA);
      pairSpan.appendChild(linkTxt);
      pairSpan.appendChild(strongB);

      const fbSpan = document.createElement('span');
      fbSpan.className = 'conn-feedback';
      fbSpan.textContent = data.feedback_correcto || '';

      textDiv.appendChild(pairSpan);
      textDiv.appendChild(fbSpan);
      li.appendChild(icon);
      li.appendChild(textDiv);
      networkList.appendChild(li);
    }

    setFeedback('success', '✓ ¡Vínculo correcto!', data.feedback_correcto || '¡Asociación conceptual válida!');

    if (typeof window.ovaMark === 'function') {
      window.ovaMark('match-' + cardId);
    }

    if (matchedCards.size >= total) {
      if (revelacionCard) {
        revelacionCard.hidden = false;
        try {
          revelacionCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch(e) {}
      }
      document.querySelectorAll('upao-complete[locked]').forEach(function(b) {
        if (b && typeof b.unlock === 'function') b.unlock();
      });
      setFeedback('success', '🎉 ¡Mapa mental completado!', 'Has establecido con éxito todos los vínculos entre analogías cotidianas y la arquitectura técnica.');
    }
  } else {
    const clueId = cardA.getAttribute('data-type') === 'clue' ? idA : idB;
    const clueData = cardsMap[clueId] || {};

    [cardA, cardB].forEach(function(c) {
      c.classList.add('is-wrong');
    });

    setFeedback('error', '✗ Vínculo incorrecto', clueData.feedback_incorrecto || 'Esa no es la correspondencia adecuada. Intenta nuevamente.');

    setTimeout(function() {
      [cardA, cardB].forEach(function(c) {
        c.classList.remove('is-wrong', 'is-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      if (selectedCard === cardA || selectedCard === cardB) {
        selectedCard = null;
      }
    }, 900);
  }
}

const allCards = document.querySelectorAll('.mindmap-card');
allCards.forEach(function(card) {
  card.addEventListener('click', function() {
    handleCardClick(card);
  });

  card.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(card);
    }
  });

  card.addEventListener('dragstart', function(e) {
    const cardId = card.getAttribute('data-card-id');
    if (matchedCards.has(cardId)) {
      e.preventDefault();
      return;
    }
    card.classList.add('is-dragging');
    draggedCard = card;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'link';
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: cardId,
        type: card.getAttribute('data-type')
      }));
    }
  });

  card.addEventListener('dragend', function() {
    draggedCard = null;
    allCards.forEach(function(c) {
      c.classList.remove('is-dragging', 'is-drag-over');
    });
  });

  card.addEventListener('dragover', function(e) {
    if (!draggedCard || draggedCard === card) return;
    const targetId = card.getAttribute('data-card-id');
    if (matchedCards.has(targetId)) return;
    if (draggedCard.getAttribute('data-type') === card.getAttribute('data-type')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'link';
    card.classList.add('is-drag-over');
  });

  card.addEventListener('dragleave', function() {
    card.classList.remove('is-drag-over');
  });

  card.addEventListener('drop', function(e) {
    e.preventDefault();
    card.classList.remove('is-drag-over');
    if (!draggedCard || draggedCard === card) return;
    const targetId = card.getAttribute('data-card-id');
    const targetType = card.getAttribute('data-type');
    if (matchedCards.has(targetId)) return;
    if (draggedCard.getAttribute('data-type') === targetType) return;

    const sourceCard = draggedCard;
    const sourceId = sourceCard.getAttribute('data-card-id');
    attemptMatch(sourceCard, card, sourceId, targetId);
  });
});
"""

    return f"""{_STYLE}
<upao-header eyebrow="MAPA MENTAL" title="{esc(data["titulo"])}">
  <p>{esc(data["intro"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total}" label="Vínculos conceptuales completados" show-fraction></upao-progress>

<div id="mindmap-live-feedback" class="mindmap-feedback-banner" role="status" aria-live="polite">
  <div class="feedback-badge" id="feedback-badge" aria-hidden="true">💡</div>
  <div class="feedback-content">
    <strong id="feedback-title" class="feedback-title">Asocia cada intuición cotidiana con su nodo técnico</strong>
    <p id="feedback-msg" class="feedback-msg">Haz clic en una pista cotidiana y luego en su nodo técnico correspondiente, o arrastra una tarjeta sobre la otra.</p>
  </div>
</div>

<div class="mindmap-board">
  <div class="mindmap-col">
    <div class="col-header">
      <span class="col-pill col-pill--clue">Pistas Cotidianas</span>
      <span class="col-sub">¿A qué te recuerda en la vida real?</span>
    </div>
    <div class="cards-list" id="clues-list" role="region" aria-label="Pistas cotidianas">
      {cards_pistas_html}
    </div>
  </div>

  <div class="mindmap-divider" aria-hidden="true">
    <span class="divider-icon">⚡</span>
    <span class="divider-line"></span>
  </div>

  <div class="mindmap-col">
    <div class="col-header">
      <span class="col-pill col-pill--tech">Nodos Técnicos</span>
      <span class="col-sub">Componente real en la base de datos</span>
    </div>
    <div class="cards-list" id="nodes-list" role="region" aria-label="Nodos técnicos">
      {cards_nodos_html}
    </div>
  </div>
</div>

<div class="mindmap-network-section ova-card">
  <div class="network-header">
    <span class="ova-badge">Red de Conocimiento</span>
    <h2 class="network-title">Vínculos Establecidos en el Mapa Mental</h2>
  </div>
  <p class="network-intro">Conforme emparejes cada concepto, aquí se consolidará la red de relaciones:</p>
  <div id="network-empty" class="network-empty-state">
    <span class="empty-icon" aria-hidden="true">🔗</span>
    <span>Aún no hay conexiones establecidas. Empareja tu primera pista arriba.</span>
  </div>
  <ul id="network-connections" class="network-connections-list" aria-live="polite"></ul>
</div>

<section id="revelacion-card" class="ova-card revelation-card" hidden aria-live="polite">
  <div class="revelation-header">
    <span class="ova-badge ova-badge--success">¡MAPA MENTAL COMPLETADO!</span>
    <h2 class="revelation-title">Revelación Conceptual</h2>
  </div>
  <div class="revelation-body">
    <p class="revelation-text">{esc(data["revelacion"])}</p>
  </div>
</section>

<upao-summary title="Síntesis y Transferencia">
  <p>Has articulado los componentes de <strong>{esc(ctx.concept)}</strong> mediante asociaciones significativas entre intuiciones cotidianas y la arquitectura técnica del motor de bases de datos.</p>
  <upao-complete slot="actions" label="Finalizar mapa mental" locked></upao-complete>
</upao-summary>

{json_data(data_for_js, "mindmap-data")}
{script(PROGRESS_JS)}
{script(_js)}
"""


SPEC = TemplateSpec(
    phase="explore",
    rt=9,
    title="Mapa Mental",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
