"""ELABORATE 1 — Estudio de Caso: narrativa con evidencias y preguntas de análisis con respuesta modelo."""

from __future__ import annotations

from llm.images.sources.contract import IMAGE_REQUEST_SCHEMA
from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import (
    IMAGE_FIGURE_CSS,
    PROGRESS_JS,
    esc,
    json_data,
    paragraphs,
    render_credits_section,
    render_image_figure,
    script,
)
from ova_engine.schema import arr, obj, s
from ova_engine.templates._kit_a import KIT_CSS, UTIL_JS, header, progress, summary

PARAMS = (
    Param("num_questions", 4, min=3, max=5, help="Número de preguntas de análisis (de observación a evaluación)"),
)


def schema(p: dict) -> dict:
    n = p["num_questions"]
    sch = obj(
        titulo=s(70),
        empresa=s(60),
        narrativa=s(1300),
        evidencias=arr(obj(fuente=s(40), dato=s(140)), 3, 4),
        preguntas=arr(
            obj(
                pregunta=s(210),
                respuesta_modelo=s(400),
                puntos_clave=arr(s(32), 2, 4),
            ),
            min_items=n,
            max_items=n,
        ),
        cierre=s(230),
    )
    sch["properties"]["imagen"] = IMAGE_REQUEST_SCHEMA
    return sch


def prompt(concept: str, contexto: str, p: dict) -> str:
    n = p["num_questions"]
    d = domain_for(concept, contexto)
    _l0 = d.pick(
        """[ROL] Redactor de casos de estudio para un curso universitario de bases de datos.""",
        f"""[ROL] Redactor de casos de estudio para {d.audiencia}.""",
    )
    _l1 = d.pick(
        f"""[CONCEPTO] «{concept}» (curso: Sistemas de Gestión de Base de Datos).""",
        f"""[CONCEPTO] «{concept}» ({d.curso}).""",
    )
    _l2 = d.pick(
        f"""[TAREA] Redacta un caso plausible donde «{concept}» sea la clave para entender y resolver un problema real de una empresa ficticia que usa Oracle.""",
        f"""[TAREA] Redacta un caso plausible donde «{concept}» sea la clave para entender y resolver un problema real de una persona, comunidad u organización ficticia, propio del área del tema.""",
    )
    _l3 = d.pick(
        """- evidencias: 3 o 4 evidencias técnicas del caso; `fuente` (vista, log o comando: V$..., DBA_..., alert.log) y `dato` (el valor o mensaje observado, p. ej. un error ORA- real o una cifra; ≤25 palabras).""",
        """- evidencias: 3 o 4 evidencias del caso; `fuente` (medición, registro, documento u observación de donde sale) y `dato` (el valor, cita o hecho observado; ≤25 palabras).""",
    )
    _l4 = d.pick(
        """- cierre: reflexión que conecte el caso con la práctica profesional del DBA.""",
        f"""- cierre: reflexión que conecte el caso con {d.practica}.""",
    )
    _l5 = d.pick(
        """[RESTRICCIONES] Datos coherentes entre narrativa y evidencias; las preguntas deben poder responderse con el caso y el concepto.""",
        f"""[RESTRICCIONES] Datos coherentes entre narrativa y evidencias; las preguntas deben poder responderse con el caso y el concepto. Mantente estrictamente en el tema «{concept}» y en el nivel indicado ({d.audiencia}); {d.guia_nivel}""",
    )
    return f"""{_l0}
{_l1}
{_l2}
- titulo: título corto del caso.
- empresa: nombre de la empresa ficticia y su giro (≤8 palabras).
- imagen (opcional): recurso visual estructurado del caso:
  * "foto" ÚNICAMENTE para instalaciones físicas reales, servidores, rack o datacenters tangibles de la empresa (NUNCA para conceptos abstractos).
  * "diagrama" para diagramas de arquitectura, flujos o modelos de datos del caso (incluye objeto `diagrama`: tipo, titulo, nodos, aristas).
  * "escena" para ilustraciones pedagógicas de la situación en la empresa.
  * "logo" para marcas de software o motores de datos.
  Incluye {{"tipo": "foto"|"diagrama"|"escena"|"logo", "descripcion": "...", "consulta": "..." (en inglés)}}.
- narrativa: el caso en unas 180 palabras, en 2-3 párrafos separados por salto de línea: contexto de la empresa, el problema y cómo se manifestó.
{_l3}
- preguntas: EXACTAMENTE {n} preguntas de análisis que suban de nivel (observación → interpretación → aplicación → evaluación). Cada una con `pregunta`, `respuesta_modelo` (respuesta razonada, ≤55 palabras) y `puntos_clave` (2-4 conceptos o términos breves, ≤3 palabras, que una buena respuesta debe mencionar).
{_l4}
{_l5}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def render(data: dict, ctx: RenderContext) -> str:
    qs = data["preguntas"]
    n = len(qs)
    ev = "".join(
        f'<tr><th scope="row">{esc(e["fuente"])}</th><td>{esc(e["dato"])}</td></tr>' for e in data["evidencias"]
    )
    levels = ["Observa", "Interpreta", "Aplica", "Evalúa", "Evalúa"]
    panels = "".join(
        f'<section class="k-panel ova-stack cs-q" data-i="{k}" aria-labelledby="cs-h{k}">'
        f'<div class="k-row"><span class="k-chip">{levels[min(k, 4)]}</span>'
        f'<h3 id="cs-h{k}" style="margin:0">Pregunta {k + 1}</h3></div>'
        f'<p>{esc(q["pregunta"])}</p>'
        f'<label for="cs-a{k}" class="k-label">Tu respuesta</label>'
        f'<textarea id="cs-a{k}" class="ova-input" rows="4" placeholder="Escribe tu análisis (mínimo una oración)"></textarea>'
        f'<div class="k-row"><button type="button" class="k-btn main cs-go" disabled>Comparar con la respuesta modelo</button>'
        f'<span class="ova-muted cs-hint">Escribe al menos 20 caracteres.</span></div>'
        f'<div class="cs-res k-hide" aria-live="polite"></div></section>'
        for k, q in enumerate(qs)
    )
    fig_html = render_image_figure(
        data.get("imagen"),
        data.get("image_placeholder"),
        data.get("image_credit"),
        data.get("image_credit_html", ""),
        alt_fallback=f"Contexto del caso de {ctx.concept}",
    )
    credits_sec = render_credits_section(data)

    return f"""
{header("ESTUDIO DE CASO", data["titulo"], data["empresa"])}
{KIT_CSS}
{IMAGE_FIGURE_CSS}
<style>
.cs-story p{{max-width:70ch}}
.cs-kp{{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}}
</style>
{progress(n, "Preguntas analizadas")}
<article class="ova-card cs-story" aria-labelledby="cs-narr-h">
<h2 id="cs-narr-h">El caso</h2>
{paragraphs(data["narrativa"])}
{fig_html}
</article>
<div class="ova-table-scroll" role="region" aria-label="Evidencias del caso" tabindex="0">
<table><caption>Evidencias recopiladas</caption><thead><tr><th scope="col">Fuente</th><th scope="col">Dato observado</th></tr></thead>
<tbody>{ev}</tbody></table></div>
{panels}
{summary(data["cierre"], "Reflexión")}
{credits_sec}
{json_data([{"m": q["respuesta_modelo"], "k": q["puntos_clave"]} for q in qs])}
{script(PROGRESS_JS + UTIL_JS + '''
const D = JSON.parse(document.getElementById('ova-data').textContent);
document.querySelectorAll('.cs-q').forEach(box => {
  const i = Number(box.dataset.i), ta = box.querySelector('textarea'), go = box.querySelector('.cs-go'), res = box.querySelector('.cs-res');
  ta.addEventListener('input', () => { go.disabled = ta.value.trim().length < 20; });
  go.addEventListener('click', () => {
    const hits = D[i].k.map(k => kwHit(ta.value, k));
    const got = hits.filter(Boolean).length;
    res.textContent = ''; res.classList.remove('k-hide');
    const fb = el('div', 'k-fb ' + (got === hits.length ? 'ok' : got ? '' : 'bad'));
    fb.textContent = 'Tu respuesta cubre ' + got + ' de ' + hits.length + ' ideas clave.';
    res.appendChild(fb);
    const kp = el('div', 'cs-kp');
    D[i].k.forEach((k, j) => kp.appendChild(el('span', 'k-chip ' + (hits[j] ? 'ok' : 'bad'), (hits[j] ? '✓ ' : '✗ ') + k)));
    res.appendChild(kp);
    res.appendChild(el('p', 'k-label', 'Respuesta modelo'));
    res.appendChild(el('p', '', D[i].m));
    res.appendChild(el('p', 'ova-muted', 'Compara: ¿qué ideas te faltaron o expresaste distinto? Ajusta tu texto y compara de nuevo si quieres.'));
    window.ovaMark('q-' + i);
  });
});
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_questions"]
    return {
        "titulo": f"El caso de {concept}"[:70],
        "empresa": "Distribuidora Andina S.A., comercio mayorista",
        "imagen": {
            "tipo": "foto",
            "descripcion": f"Infraestructura y centro de datos para {concept}",
            "consulta": "datacenter database server enterprise",
        },
        "narrativa": f"Distribuidora Andina usa Oracle para sus pedidos y notó lentitud cada fin de mes.\nEl DBA revisó {concept} y halló una configuración inadecuada que degradaba las consultas.",
        "evidencias": [
            {"fuente": "V$SESSION", "dato": "48 sesiones activas esperando por el mismo recurso"},
            {"fuente": "alert.log", "dato": "ORA-01555: snapshot too old"},
            {"fuente": "DBA_SEGMENTS", "dato": "Tabla PEDIDOS con 12 GB y 300 extents"},
        ],
        "preguntas": [
            {
                "pregunta": f"Pregunta {k} sobre el caso y {concept}.",
                "respuesta_modelo": f"La respuesta razonada {k} relaciona la evidencia con el concepto y justifica la decisión.",
                "puntos_clave": ["evidencia", "concepto"],
            }
            for k in range(1, n + 1)
        ],
        "cierre": "Un buen DBA parte de la evidencia antes de tocar la configuración.",
    }


SPEC = TemplateSpec(
    phase="elaborate",
    rt=1,
    title="Estudio de Caso",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
)
