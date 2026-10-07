"""ENGAGE 1 — Cómic interactivo: viñetas navegables + pregunta de enganche.

PLANTILLA DE REFERENCIA del motor: las demás siguen esta misma forma
(PARAMS → schema → prompt → render → sample → SPEC).
"""

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, script
from ova_engine.schema import arr, b, obj, s

PARAMS = (
    Param("num_panels", 4, min=3, max=6, help="Número de viñetas que necesita la historia"),
    Param(
        "tone",
        "humor",
        choices=("humor", "misterio", "aventura"),
        help="Tono narrativo que mejor engancha con el concepto",
    ),
)


def schema(p: dict) -> dict:
    n = p["num_panels"]
    return obj(
        titulo=s(60),
        gancho=s(140),
        vinetas=arr(
            obj(dialogo=s(140), descripcion_visual=s(160), prompt_imagen=s(300)),
            min_items=n,
            max_items=n,
        ),
        pregunta=obj(
            enunciado=s(160),
            opciones=arr(obj(texto=s(90), correcta=b(), feedback=s(160)), 3, 4),
        ),
        cierre=s(200),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    if d.is_db:
        return f"""[ROL] Guionista de cómics educativos para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Escribe un cómic de {p["num_panels"]} viñetas, tono {p["tone"]}, protagonizado por «Max», un robot DBA de una pequeña empresa. Usa una analogía cotidiana concreta que refleje FIELMENTE cómo funciona «{concept}» y construye una progresión hasta un clímax que despierte curiosidad.
- titulo: título corto del cómic.
- gancho: una frase que invite a leer.
- vinetas: por cada viñeta, `dialogo` (lo que DICE Max, ≤18 palabras, sin acotaciones), `descripcion_visual` (la escena, ≤25 palabras) y `prompt_imagen` (escena en inglés, sin texto en la imagen; di solo la acción y el decorado, incluyendo «Max» por su nombre: el sistema añade su aspecto y el estilo visual, idénticos en todas las viñetas).
- pregunta: una pregunta de enganche sobre la analogía con 3-4 opciones; exactamente UNA con `correcta: true`; cada `feedback` explica por qué.
- cierre: frase que conecte la historia con lo que se aprenderá.
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""
    return f"""[ROL] Guionista de cómics educativos para {d.audiencia}.
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Escribe un cómic de {p["num_panels"]} viñetas, tono {p["tone"]}, protagonizado por «Max», un robot curioso y simpático que ayuda a entender el tema. Usa una analogía cotidiana concreta que refleje FIELMENTE cómo funciona «{concept}» y construye una progresión hasta un clímax que despierte curiosidad.
- titulo: título corto del cómic.
- gancho: una frase que invite a leer.
- vinetas: por cada viñeta, `dialogo` (lo que DICE Max, ≤18 palabras, sin acotaciones), `descripcion_visual` (la escena, ≤25 palabras) y `prompt_imagen` (escena en inglés, sin texto en la imagen; di solo la acción y el decorado, incluyendo «Max» por su nombre: el sistema añade su aspecto y el estilo visual, idénticos en todas las viñetas).
- pregunta: una pregunta de enganche sobre la analogía con 3-4 opciones; exactamente UNA con `correcta: true`; cada `feedback` explica por qué.
- cierre: frase que conecte la historia con lo que se aprenderá.
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático.
{d.rules()}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


_FALLBACK_ART = """<svg slot="art" viewBox="0 0 320 180" role="img" aria-label="{alt}">
<rect width="320" height="180" rx="12" fill="var(--surface-2, #eef2ff)"/>
<circle cx="80" cy="96" r="34" fill="var(--primary, #0A3D91)" opacity=".9"/>
<rect x="62" y="80" width="36" height="12" rx="6" fill="#fff"/>
<rect x="150" y="40" width="140" height="100" rx="10" fill="#fff" stroke="var(--primary, #0A3D91)" stroke-width="3"/>
<text x="220" y="100" font-size="34" text-anchor="middle">{n}</text>
</svg>"""


def render(data: dict, ctx: RenderContext) -> str:
    panels = data["vinetas"]
    total = len(panels)
    steps = []
    for n, v in enumerate(panels, 1):
        alt = esc(v.get("descripcion_visual", ""))
        src = v.get("image_placeholder")
        art = (
            f'<img slot="art" src="{esc(src)}" alt="{alt}">'
            if src
            else _FALLBACK_ART.format(alt=alt, n=n)
        )
        side = "left" if n % 2 else "right"
        steps.append(
            f'<section class="step" data-step="{n}"{"" if n == 1 else " hidden"}>'
            f'<upao-comic-panel number="{n}" character="Max" bubble-side="{side}" img-alt="{alt}">'
            f"{art}{esc(v['dialogo'])}</upao-comic-panel></section>"
        )
    q = data["pregunta"]
    choices = "".join(
        f'<upao-choice group="q1" value="{chr(65 + k)}" correct="{str(bool(o["correcta"])).lower()}" '
        f'feedback="{esc(o["feedback"])}">{esc(o["texto"])}</upao-choice>'
        for k, o in enumerate(q["opciones"])
    )
    return f"""
<upao-header eyebrow="CÓMIC INTERACTIVO" title="{esc(data["titulo"])}"><p>{esc(data["gancho"])}</p></upao-header>
<upao-progress id="prog" current="0" total="{total + 1}" label="Progreso" show-fraction></upao-progress>
<div class="ova-stack" aria-live="polite">{"".join(steps)}</div>
<upao-nav id="nav" total="{total}" current="1"></upao-nav>
<upao-question number="1" prompt="{esc(q["enunciado"])}">{choices}</upao-question>
<upao-summary>{esc(data["cierre"])}<upao-complete slot="actions" label="Continuar" locked></upao-complete></upao-summary>
{script(PROGRESS_JS)}
{script('''
const nav = document.getElementById('nav');
const steps = document.querySelectorAll('.step');
window.ovaMark('panel-1');
nav.addEventListener('upao-nav-change', e => {
  steps.forEach((el, i) => el.hidden = i !== e.detail.index - 1);
  window.ovaMark('panel-' + e.detail.index);
});
document.addEventListener('upao-choice-selected', () => window.ovaMark('question'));
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_panels"]
    return {
        "titulo": f"Max y el misterio de {concept}"[:60],
        "gancho": f"¿Qué pasaría si {concept} desapareciera mañana?",
        "vinetas": [
            {
                "dialogo": f"Viñeta {k}: Max descubre otra pista sobre {concept}.",
                "descripcion_visual": f"Max en el almacén de datos, escena {k}.",
                "prompt_imagen": f"flat cartoon robot DBA in a warehouse, scene {k}",
            }
            for k in range(1, n + 1)
        ],
        "pregunta": {
            "enunciado": "¿Qué representa el almacén en la historia?",
            "opciones": [
                {"texto": "La base de datos", "correcta": True, "feedback": "Exacto: guarda y ordena."},
                {"texto": "La red", "correcta": False, "feedback": "La red transporta, no guarda."},
                {"texto": "El usuario", "correcta": False, "feedback": "El usuario consulta, no almacena."},
            ],
        },
        "cierre": f"Ahora verás cómo funciona {concept} de verdad.",
    }


SPEC = TemplateSpec(
    phase="engage",
    rt=1,
    title="Cómic Interactivo",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    uses_images=True,
    image_character="max",
)
