"""ELABORATE 8 — Mapa de Problemas: empareja cada incidencia (contexto + síntomas) con su diagnóstico (arrastrar o tocar)."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_problems", 4, min=2, max=5, help="Número de incidencias del mapa"),
)


def schema(p: dict) -> dict:
    n = p["num_problems"]
    return obj(
        titulo=s(70),
        intro=s(190),
        problemas=arr(
            obj(
                sector=s(32),
                contexto=s(290),
                sintomas=arr(s(95), 3, 3),
                diagnostico=s(150),
                solucion_recomendada=s(340),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(230),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_problems"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        f"""[ROL] Facilitador de análisis de incidencias de bases de datos {d.bd_adj}.""",
        f"""[ROL] Facilitador de análisis de casos para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Crea {n} incidencias de sectores distintos (banca, salud, retail, educación, logística…) cuyo diagnóstico dependa de «{concept}». El estudiante deberá emparejar cada incidencia con su diagnóstico, así que los {n} diagnósticos deben ser claramente DISTINTOS entre sí.""",
        f"""[TAREA] Crea {n} situaciones problemáticas de contextos distintos (familia, escuela, comunidad, salud, comercio, ambiente…) cuyo diagnóstico dependa de «{concept}». El estudiante deberá emparejar cada situación con su diagnóstico, así que los {n} diagnósticos deben ser claramente DISTINTOS entre sí.""",
    )
    _l3 = d.pick(
        """  * `sector`: sector o empresa (≤4 palabras).""",
        """  * `sector`: contexto o ámbito (≤4 palabras).""",
    )
    _l4 = d.pick(
        """  * `sintomas`: 3 síntomas observables (lentitud medible, errores ORA-, disco lleno, esperas…; ≤15 palabras cada uno).""",
        """  * `sintomas`: 3 señales observables de la situación (≤15 palabras cada una).""",
    )
    _l5 = d.pick(
        """  * `diagnostico`: causa raíz formulada como etiqueta corta (≤15 palabras, p. ej. «Consulta sin índice adecuado»), sin repetir palabras de los síntomas.""",
        """  * `diagnostico`: causa raíz formulada como etiqueta corta (≤15 palabras), sin repetir palabras de las señales.""",
    )
    _l6 = d.pick(
        """[RESTRICCIONES] Los síntomas deben ser coherentes con UNA sola causa; evita diagnósticos intercambiables.""",
        f"""[RESTRICCIONES] Las señales deben ser coherentes con UNA sola causa; evita diagnósticos intercambiables. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
- titulo: título corto del mapa.
- intro: instrucción breve para el estudiante (≤25 palabras).
- problemas: EXACTAMENTE {n}; cada uno con:
{_l3}
  * `contexto`: la situación en ≈40 palabras.
{_l4}
{_l5}
  * `solucion_recomendada`: cómo aplicar «{concept}» para resolverlo y por qué funciona (≈45 palabras).
- cierre: patrón común para diagnosticar con «{concept}».
{_l6}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    ps = data["problemas"]
    n = len(ps)
    cards = "".join(
        f'<article class="k-panel ova-stack mpb-card" data-i="{k}" aria-labelledby="mpb-h{k}">'
        f'<div class="k-row"><span class="k-chip">Problema {k + 1}</span><span class="k-chip">{esc(p["sector"])}</span></div>'
        f'<h3 id="mpb-h{k}" style="margin:0">{esc(p["contexto"])}</h3>'
        f'<ul>{"".join(f"<li>{esc(x)}</li>" for x in p["sintomas"])}</ul>'
        f'<upao-drop-zone class="mpb-zone" zone-id="z{k}" accepts="p{k}" label="Problema {k + 1}" role="button" tabindex="0" '
        f'aria-label="Zona del problema {k + 1}: suelta o toca aquí el diagnóstico seleccionado"></upao-drop-zone>'
        f'<div class="mpb-fb k-hide" aria-live="polite"></div>'
        f'<div class="mpb-sol k-fb ok k-hide"><p class="k-label">Solución recomendada</p><p>{esc(p["solucion_recomendada"])}</p></div></article>'
        for k, p in enumerate(ps)
    )
    chips = "".join(
        f'<upao-drag-item class="mpb-chip" item-id="Diagnóstico {chr(65 + k)}" category="p{k}" role="button" tabindex="0" '
        f'aria-label="Diagnóstico {chr(65 + k)}: {esc(p["diagnostico"])}. Pulsa para seleccionarlo">'
        f'<strong>{chr(65 + k)}.</strong> {esc(p["diagnostico"])}</upao-drag-item>'
        for k, p in enumerate(ps)
    )
    return f"""
{header("MAPA DE PROBLEMAS", data["titulo"], data["intro"])}
{KIT_CSS}
<style>
.mpb-pool{{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))}}
.mpb-chip.sel{{outline:3px solid var(--accent);outline-offset:2px;border-radius:12px}}
.mpb-chip.done{{opacity:.55}}
.mpb-chip[hidden]{{display:none}}
</style>
{progress(n, "Incidencias diagnosticadas")}
<section class="ova-card ova-stack" aria-labelledby="mpb-pool-h"><h2 id="mpb-pool-h">Diagnósticos disponibles</h2>
<p class="ova-muted">Arrastra cada diagnóstico a su problema, o toca primero el diagnóstico y luego el problema.</p>
<div class="mpb-pool" id="mpb-pool">{chips}</div>
<p class="k-chip" id="mpb-sel" aria-live="polite">Ningún diagnóstico seleccionado</p></section>
<div class="ova-stack">{cards}</div>
{summary(data["cierre"], "Patrón de diagnóstico")}
{script(PROGRESS_JS + UTIL_JS + '''
const pool = document.getElementById('mpb-pool');
shuffle(Array.from(pool.children)).forEach(c => pool.appendChild(c));
const chips = Array.from(document.querySelectorAll('.mpb-chip'));
const zones = Array.from(document.querySelectorAll('.mpb-zone'));
let selected = null, solved = 0;
function setSel(c) {
  chips.forEach(x => x.classList.remove('sel')); selected = c;
  if (c) c.classList.add('sel');
  document.getElementById('mpb-sel').textContent = c ? 'Seleccionado: ' + c.getAttribute('item-id') + '. Ahora toca el problema.' : 'Ningún diagnóstico seleccionado';
}
function result(zone, chip, ok) {
  const card = zone.closest('.mpb-card'), fb = card.querySelector('.mpb-fb');
  if (card.dataset.done) return;
  fb.classList.remove('k-hide'); fb.textContent = '';
  if (ok) {
    card.dataset.done = '1'; card.querySelector('.mpb-sol').classList.remove('k-hide');
    fb.appendChild(el('div', 'k-fb ok', '✓ Correcto: ' + chip.getAttribute('item-id') + ' explica estos síntomas.'));
    chip.classList.add('done'); if (chip.matched) chip.matched();
    try { zone.shadowRoot.querySelector('.zone').classList.add('correct'); const d = zone.shadowRoot.querySelector('#dropped'); d.hidden = false; d.textContent = chip.getAttribute('item-id'); zone.shadowRoot.querySelector('#hint').hidden = true; } catch (e) {}
    chip.setAttribute('aria-disabled', 'true'); setSel(null);
    window.ovaMark('prob-' + card.dataset.i);
  } else {
    fb.appendChild(el('div', 'k-fb bad', 'Ese diagnóstico no explica estos síntomas. Relee el contexto y los síntomas e inténtalo con otro.'));
    if (chip.wrong) { chip.wrong(); setTimeout(() => { try { chip.shadowRoot.querySelector('.item').classList.remove('wrong'); } catch (e) {} }, 700); }
  }
}
document.addEventListener('upao-drop', e => {
  const z = zones.find(x => x.getAttribute('zone-id') === e.detail.zoneId);
  const c = chips.find(x => x.getAttribute('item-id') === e.detail.itemId);
  if (z && c && !c.classList.contains('done')) result(z, c, !!e.detail.correct);
});
chips.forEach(c => {
  const pick = () => { if (!c.classList.contains('done')) setSel(selected === c ? null : c); };
  c.addEventListener('click', pick);
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
});
zones.forEach(z => {
  const drop = () => { if (selected) result(z, selected, selected.getAttribute('category') === z.getAttribute('accepts')); };
  z.addEventListener('click', drop);
  z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); } });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    sectores = ["Banca", "Salud", "Retail", "Educación", "Logística"]
    return {
        "titulo": f"Mapa de problemas de {concept}"[:70],
        "intro": "Empareja cada incidencia con el diagnóstico que explica sus síntomas.",
        "problemas": [
            {
                "sector": sectores[k % 5],
                "contexto": f"En una empresa de {sectores[k % 5].lower()} el sistema se degrada después de un cambio relacionado con {concept}.",
                "sintomas": [f"Síntoma {k + 1}.1: lentitud medible.", f"Síntoma {k + 1}.2: error ORA-0{k + 1}000.", f"Síntoma {k + 1}.3: recurso casi lleno."],
                "diagnostico": f"Causa raíz número {k + 1} de {concept}",
                "solucion_recomendada": f"Aplicar {concept} de la forma {k + 1} elimina la causa porque ataca el recurso saturado.",
            }
            for k in range(p["num_problems"])
        ],
        "cierre": "Diagnostica siempre desde los síntomas hacia la causa raíz.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=8,
    title="Mapa de Problemas",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
)
