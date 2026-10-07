"""ENGAGE 8 — Timeline Interactivo: hitos históricos verídicos y evolución.

Recurso de contextualización histórica: muestra una secuencia cronológica interactiva
de hitos clave con upao-node, navegación secuencial con upao-nav, control para
desplegar todos y barra de progreso que desbloquea la finalización al revisar los hitos.
"""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.icons import icon
from ova_engine.schema import arr, obj, s

PARAMS = (
    Param(
        "num_milestones",
        4,
        min=3,
        max=6,
        help="Número de hitos históricos",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_milestones"]
    return obj(
        titulo=s(70),
        intro=s(160),
        hitos=arr(
            obj(
                anio=s(20),
                nombre=s(70),
                descripcion=s(300),
                dato_sorprendente=s(150),
                conexion_actual=s(150),
            ),
            min_items=n,
            max_items=n,
        ),
        sintesis=s(250),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_milestones"]
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Historiador y divulgador científico de la tecnología y bases de datos.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Construye una crónica histórica en {n} hitos verídicos o altamente plausibles que llevaron al surgimiento y evolución de «{concept}».
- titulo: título atractivo del timeline histórico (≤10 palabras).
- intro: introducción intrigante que contextualice la necesidad histórica de «{concept}» (≤25 palabras).
- hitos: exactamente {n} hitos históricos cronológicos. Por cada hito:
  * `anio`: año o época del acontecimiento (ej. '1970', '1979', 'Años 80', ≤20 caracteres).
  * `nombre`: nombre corto y memorable del hito (≤10 palabras).
  * `descripcion`: crónica narrativa de qué ocurrió y qué problema resolvió (≤45 palabras).
  * `dato_sorprendente`: curiosidad o anécdota poco conocida del hito (≤25 palabras).
  * `conexion_actual`: impacto directo en la vida cotidiana o profesional del estudiante hoy (≤25 palabras).
- sintesis: conclusión de cómo el pasado forjó lo que hoy es «{concept}» y por qué importa dominarlo (≤35 palabras).
[RESTRICCIONES] Hechos verídicos o altamente plausibles que llevaron al concepto. Sin fórmulas ni jerga técnica densa. Tono de divulgación histórica apasionante y riguroso.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Historiador y divulgador científico especializado en «{concept}».
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Construye una crónica histórica en {n} hitos verídicos o altamente plausibles que llevaron al surgimiento y evolución de «{concept}».
- titulo: título atractivo del timeline histórico (≤10 palabras).
- intro: introducción intrigante que contextualice la necesidad histórica de «{concept}» (≤25 palabras).
- hitos: exactamente {n} hitos históricos cronológicos. Por cada hito:
  * `anio`: año o época del acontecimiento (ej. '1970', '1979', 'Años 80', ≤20 caracteres).
  * `nombre`: nombre corto y memorable del hito (≤10 palabras).
  * `descripcion`: crónica narrativa de qué ocurrió y qué problema resolvió (≤45 palabras).
  * `dato_sorprendente`: curiosidad o anécdota poco conocida del hito (≤25 palabras).
  * `conexion_actual`: impacto directo en la vida cotidiana o profesional del estudiante hoy (≤25 palabras).
- sintesis: conclusión de cómo el pasado forjó lo que hoy es «{concept}» y por qué importa dominarlo (≤35 palabras).
[RESTRICCIONES] Hechos verídicos o altamente plausibles que llevaron al concepto. Sin fórmulas ni jerga técnica densa. Tono de divulgación histórica apasionante y riguroso.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_STYLE = """
<style>
.ova-timeline-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-block: 16px;
}
.ova-timeline-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #E2E8F2);
  border-radius: var(--radius, 12px);
  box-shadow: var(--shadow, 0 4px 20px rgba(10,61,145,.09));
}
.ova-timeline-hint {
  font-size: 0.85rem;
  color: var(--text-muted, #5A6B85);
}
.ova-milestone-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ova-milestone-desc {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--text, #15233B);
}
.ova-milestone-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 4px;
}
.ova-milestone-card {
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  line-height: 1.5;
}
.ova-milestone-card--fact {
  background: var(--surface-tint, #EAF0FB);
  border-left: 3px solid var(--primary, #0A3D91);
}
.ova-milestone-card--conn {
  background: var(--accent-tint, #FDEEE0);
  border-left: 3px solid var(--accent, #F47A20);
}
.ova-meta-title {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 4px;
  color: var(--text, #15233B);
}
.ova-milestone-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px dashed var(--border, #E2E8F2);
  margin-top: 4px;
}
.ova-milestone-status {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--surface-tint, #EAF0FB);
  color: var(--text-muted, #5A6B85);
  transition: all 0.2s ease;
}
.ova-milestone-status.is-done {
  background: var(--success-bg, #DCFCE7);
  color: var(--success, #146C49);
  font-weight: 700;
}
.ova-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid var(--primary, #0A3D91);
  background: var(--primary, #0A3D91);
  color: #ffffff;
  font-family: inherit;
}
.ova-btn:hover {
  background: var(--primary-hover, #072C6B);
}
.ova-btn--ghost {
  background: transparent;
  color: var(--primary, #0A3D91);
}
.ova-btn--ghost:hover {
  background: var(--surface-tint, #EAF0FB);
}
</style>
"""

_TIMELINE_JS = """
(function () {
  const total = __TOTAL__;
  const nav = document.getElementById('nav');
  const toggleAllBtn = document.getElementById('btn-toggle-all');
  const toggleIcon = document.getElementById('btn-toggle-icon');
  const toggleText = document.getElementById('btn-toggle-text');
  const statusEl = document.getElementById('timeline-status');
  let allOpen = false;
  let isNavigating = false;

  function markMilestone(idx) {
    if (!idx || idx < 1 || idx > total) return;
    window.ovaMark('milestone-' + idx);
    const st = document.getElementById('status-milestone-' + idx);
    if (st) {
      st.textContent = '✓ Revisado';
      st.classList.add('is-done');
    }
  }

  function openNode(idx) {
    const node = document.getElementById('milestone-node-' + idx);
    if (!node) return;
    if (node.shadowRoot) {
      const wrap = node.shadowRoot.querySelector('.wrap');
      const head = node.shadowRoot.querySelector('.head');
      if (wrap && !wrap.hasAttribute('open') && head) {
        head.click();
      }
    }
    markMilestone(idx);
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('upao-node-toggle', function (e) {
    if (isNavigating) return;
    const target = e.target.closest('upao-node');
    if (!target) return;
    const idx = parseInt(target.getAttribute('data-idx'), 10);
    if (e.detail && e.detail.open && idx) {
      markMilestone(idx);
      if (nav && typeof nav.go === 'function') {
        isNavigating = true;
        nav.go(idx);
        isNavigating = false;
      }
    }}
  );

  if (nav) {
    nav.addEventListener('upao-nav-change', function (e) {
      if (isNavigating) return;
      isNavigating = true;
      openNode(e.detail.index);
      isNavigating = false;
    });
  }

  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', function () {
      allOpen = !allOpen;
      const nodes = document.querySelectorAll('upao-node');
      nodes.forEach(function (node, i) {
        const idx = i + 1;
        if (node.shadowRoot) {
          const wrap = node.shadowRoot.querySelector('.wrap');
          const head = node.shadowRoot.querySelector('.head');
          if (wrap && head) {
            const isOpen = wrap.hasAttribute('open');
            if (allOpen && !isOpen) {
              head.click();
            } else if (!allOpen && isOpen) {
              head.click();
            }
          }
        }
        if (allOpen) {
          markMilestone(idx);
        }
      });
      if (toggleIcon) toggleIcon.innerHTML = allOpen ? ovaIcon('folder') : ovaIcon('folder-open');
      if (toggleText) toggleText.textContent = allOpen ? 'Plegar todos los hitos' : 'Abrir todos los hitos';
      toggleAllBtn.setAttribute('aria-expanded', String(allOpen));
      if (statusEl) {
        statusEl.textContent = allOpen
          ? 'Todos los hitos abiertos (' + total + ' de ' + total + ' revisados).'
          : 'Hitos plegados. Explora cada uno individualmente.';
      }
    });
  }
})();
"""


def render(data: dict, ctx: RenderContext) -> str:
    hitos = data.get("hitos", [])
    total = len(hitos)

    nodes = []
    for idx, h in enumerate(hitos, 1):
        anio = esc(h.get("anio", ""))
        nombre = esc(h.get("nombre", ""))
        descripcion = esc(h.get("descripcion", ""))
        dato = esc(h.get("dato_sorprendente", ""))
        conexion = esc(h.get("conexion_actual", ""))

        nodes.append(
            f'<upao-node id="milestone-node-{idx}" data-idx="{idx}" number="{idx}" '
            f'year="{anio}" label="{anio}" title="{nombre}">'
            f'<div class="ova-milestone-content">'
            f'<p class="ova-milestone-desc">{descripcion}</p>'
            f'<div class="ova-milestone-meta">'
            f'<div class="ova-milestone-card ova-milestone-card--fact">'
            f'<strong class="ova-meta-title">{icon("bulb")} Dato sorprendente</strong>'
            f'<p>{dato}</p>'
            f"</div>"
            f'<div class="ova-milestone-card ova-milestone-card--conn">'
            f'<strong class="ova-meta-title">{icon("link")} Conexión actual</strong>'
            f'<p>{conexion}</p>'
            f"</div>"
            f"</div>"
            f'<div class="ova-milestone-footer">'
            f'<span class="ova-milestone-status" id="status-milestone-{idx}" aria-live="polite">{icon("eye")} Por revisar</span>'
            f"</div>"
            f"</div>"
            f"</upao-node>"
        )

    timeline_html = "".join(nodes)
    timeline_js = _TIMELINE_JS.replace("__TOTAL__", str(total))

    return f"""{_STYLE}
<upao-header eyebrow="TIMELINE INTERACTIVO" title="{esc(data["titulo"])}">
  <p>{esc(data["intro"])}</p>
</upao-header>

<upao-progress id="prog" current="0" total="{total}" label="Hitos explorados" show-fraction></upao-progress>

<section class="ova-card">
  <div class="ova-timeline-controls">
    <button type="button" class="ova-btn ova-btn--ghost" id="btn-toggle-all" aria-expanded="false" aria-label="Abrir o plegar todos los hitos históricos">
      <span aria-hidden="true" id="btn-toggle-icon">{icon('folder-open')}</span> <span id="btn-toggle-text">Abrir todos los hitos</span>
    </button>
    <span class="ova-timeline-hint" id="timeline-status" aria-live="polite">
      Explora cada hito histórico o usa los controles para completar la revisión.
    </span>
  </div>

  <div class="ova-timeline-wrapper" role="region" aria-label="Secuencia de hitos históricos">
    {timeline_html}
  </div>

  <upao-nav id="nav" total="{total}" current="1" prev-label="← Hito anterior" next-label="Siguiente hito →"></upao-nav>
</section>

<upao-summary title="Síntesis del Legado Histórico">
  <p>{esc(data["sintesis"])}</p>
  <upao-complete slot="actions" label="Continuar" locked></upao-complete>
</upao-summary>

{script(PROGRESS_JS)}
{script(timeline_js)}
"""


def sample(concept: str, p: dict) -> dict:
    n = p.get("num_milestones", 4)
    base_milestones = [
        (
            "1970",
            f"El dilema del orden: antes de {concept}",
            f"En los primeros sistemas, recuperar información tomaba horas entre cintas magnéticas y tarjetas perforadas sin un método unificado como {concept}."[:280],
            "Los programadores debían navegar manualmente las direcciones físicas en disco.",
            "Cualquier app móvil hoy obtiene tus datos en milisegundos gracias a estos cimientos.",
        ),
        (
            "1974",
            f"El salto conceptual hacia {concept}",
            f"Investigadores y pioneros formularon los primeros algoritmos y estructuras formales que permitieron organizar y acceder a {concept} de manera predecible."[:280],
            "El prototipo inicial se ejecutaba en computadoras que ocupaban habitaciones enteras.",
            "Las transacciones bancarias que usas a diario descansan sobre este avance.",
        ),
        (
            "1979",
            f"Comercialización y adopción de {concept}",
            f"Aparecen los primeros motores comerciales capaces de implementar {concept} en entornos productivos de alta exigencia empresarial."[:280],
            "La primera versión comercial requirió meses de optimización matemática manual.",
            "El comercio electrónico moderno no existiría sin la solidez de esta etapa.",
        ),
        (
            "1986",
            f"Estandarización global de {concept}",
            f"Comités internacionales fijan estándares formales, consolidando {concept} como pieza fundamental en la industria del software corporativo."[:280],
            "Empresas competidoras tuvieron que acordar una especificación técnica común.",
            "Permite que aprendas una técnica estándar válida en cualquier plataforma del mundo.",
        ),
        (
            "1995",
            f"La era de la web y el reto de {concept}",
            f"La explosión de Internet obligó a rediseñar {concept} para soportar miles de consultas concurrentes por segundo sin degradar el servicio."[:280],
            "El tráfico de datos en red se multiplicó por diez mil en apenas tres años.",
            "Tus plataformas de streaming y redes sociales dependen directamente de esta optimización.",
        ),
        (
            "2010",
            f"Evolución en la nube y escala de {concept}",
            f"Sistemas distribuidos modernos integran {concept} con alta disponibilidad, tolerancia a fallos y replicación global en tiempo real."[:280],
            "Miles de servidores coordinados sincronizan estados en microsegundos alrededor del mundo.",
            "Toda la computación moderna en la nube utiliza variantes evolucionadas de este hito.",
        ),
    ]

    hitos = []
    for k in range(n):
        anio, nom, desc, dato, con = base_milestones[k % len(base_milestones)]
        hitos.append(
            {
                "anio": anio,
                "nombre": nom[:70],
                "descripcion": desc[:300],
                "dato_sorprendente": dato[:150],
                "conexion_actual": con[:150],
            }
        )

    return {
        "titulo": f"Evolución Histórica de {concept}"[:70],
        "intro": f"Descubre los momentos clave que transformaron cómo concebimos y aplicamos {concept} en la tecnología moderna."[:160],
        "hitos": hitos,
        "sintesis": f"Comprender la trayectoria de {concept} te permite diseñar arquitecturas más robustas y anticipar los retos del desarrollo profesional en la era de los datos masivos."[:250],
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=8,
    title="Timeline Interactivo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=False,
)
