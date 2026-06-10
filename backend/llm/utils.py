"""Shared utilities for all phase generation routers."""
import json
import re

SCORM_JS = (
    'function _scormInit(){if(window.API)window.API.LMSInitialize("")}'
    'function _scormComplete(s){if(window.API){'
    'if(s!=null)window.API.LMSSetValue("cmi.core.score.raw",s);'
    'window.API.LMSSetValue("cmi.core.lesson_status","completed");'
    'window.API.LMSCommit("");window.API.LMSFinish("")}}'
    'window.addEventListener("load",_scormInit)'
)

# Strict design system injected into every HTML-generating prompt. Keeps the
# 20 resource types visually consistent and forces modern UX patterns. The
# concrete COLORS are guidelines — recipes can shift palette per phase but the
# structure, spacing, and a11y rules are non-negotiable.
DESIGN_SYSTEM = """
[SISTEMA_DE_DISEÑO_OBLIGATORIO]
APLICA TODAS ESTAS REGLAS. Son NO NEGOCIABLES.

1) BASE TÉCNICA
   - <!DOCTYPE html>, lang="es", viewport meta para responsive.
   - Reset CSS al inicio: *{box-sizing:border-box;margin:0;padding:0}
   - Font stack del sistema: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif.
   - Define variables CSS en :root (--bg, --surface, --primary, --primary-hover,
     --text, --text-muted, --border, --success, --danger, --radius, --shadow, --space).
   - SIN dependencias externas: nada de CDN, fonts.google, jsdelivr, unpkg, jquery, bootstrap.

2) PALETA (elige UNA, mantenla coherente):
   - Educativa clara: bg #f8fafc, surface #ffffff, primary #4f46e5, text #0f172a, muted #64748b.
   - Educativa oscura: bg #0f172a, surface #1e293b, primary #818cf8, text #f1f5f9, muted #94a3b8.
   - Adapta acentos según el tipo (podcast oscuro elegante, noticia tipo periódico claro,
     escape-room dramático, lab científico clínico). Pero contraste WCAG AA mínimo.

3) TIPOGRAFÍA
   - Tamaños con clamp() para responsive sin media queries:
     h1: clamp(1.6rem, 4vw, 2.2rem); h2: clamp(1.3rem, 3vw, 1.6rem);
     body: clamp(0.95rem, 2vw, 1.05rem).
   - line-height >= 1.5 en cuerpo, 1.2 en headings.
   - font-weight: 700 para títulos, 600 para subtítulos, 400 normal.

4) LAYOUT
   - Mobile-first. Max-width contenedor 880px centrado con padding lateral 20px.
   - Espaciado consistente: 8/12/16/24/32/48 px. Usa --space-* vars.
   - Grid o flex con gap (nunca margins arbitrarios entre hermanos).
   - Cards: border-radius 12-16px, shadow sutil (0 4px 12px rgba(0,0,0,0.08)).

5) INTERACCIÓN
   - Botones: padding 12px 20px, font-weight 600, transition all 200ms ease,
     :hover transform translateY(-1px) + shadow elevada, :active translateY(0),
     :focus-visible outline 3px solid color primary con offset 2px.
   - Inputs/selectables: borde 2px, focus-visible cambia borde a primary.
   - Estados de carga, completado y error VISUALMENTE distintos (color + icono/emoji).
   - Animaciones de entrada en elementos clave: opacity 0→1, translateY 8px→0, 300ms ease-out.

6) ACCESIBILIDAD
   - Contraste texto/fondo >= 4.5:1 (cuerpo) y >= 3:1 (títulos grandes).
   - Focus visible en TODO elemento interactivo.
   - aria-label en botones-icono. role="button" en divs clicables.
   - Respeta @media (prefers-reduced-motion: reduce) → animation: none.

7) CALIDAD
   - Mínimo lo indicado por la tarea, sin sections vacías ni texto lorem.
   - JavaScript funcional REAL: ningún botón sin handler, ningún estado sin transición.
   - Limpieza: declara handlers con addEventListener, evita inline onclick=.
   - El recurso debe trabajar SOLO (sin asumir LMS para correr — SCORM es opcional).
   - Si el tipo requiere drag & drop: TODOS los items arrastrables llevan
     draggable="true" y handlers dragstart/dragend; las zonas destino tienen
     dragover (preventDefault) + drop.
   - Si el tipo requiere cronómetro: usa Date.now() o setInterval con cleanup.
   - Si el tipo requiere visualización (gráfico, árbol, scatter): genera SVG real
     con elementos visibles (no solo texto plano); usa viewBox + preserveAspectRatio.
   - Si el tipo usa cards/items en grid: usa CSS grid con minmax(min, 1fr) para
     que se reflowee en móvil sin overflow horizontal.
   - PROHIBIDO `width:` o `min-width:` en px > 320 sin un media query / clamp().
   - Texto en SVG: usa <text> con text-anchor + tamaño adaptado; nunca trunques.

8) PROHIBIDO
   - Lorem ipsum / placeholder copy.
   - Imágenes externas (las que se inyectan ya vienen como data-URI).
   - Librerías JS/CSS externas.
   - Comentarios > 30 caracteres en código de salida (mantén HTML compacto).
   - Múltiples <h1> en el mismo documento.
   - position:fixed que tape contenido en móvil.
[/SISTEMA_DE_DISEÑO_OBLIGATORIO]
"""

# Shared course context injected into every generation prompt. The project
# targets a single university Machine Learning course, so the audience and
# level are constant — the only variable is the specific ML concept.
CURSO_CONTEXTO = (
    "Recurso para un curso universitario de Machine Learning. Audiencia: "
    "estudiantes en su primer contacto con el tema, sin formación matemática "
    "avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y "
    "técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, "
    "analogía o mecánica debe ser específico y fiel al concepto de ML "
    "indicado — nunca genérico ni de otro subtema."
)


def format_contexto_usuario(contexto: str | None) -> str:
    """Wrap retrieved RAG context in a tagged block for prompt injection. Returns
    "" when no context was retrieved (callers concat unconditionally)."""
    if not contexto or not contexto.strip():
        return ""
    return (
        "\n[CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
        "Material de apoyo subido por el estudiante. Úsalo como referencia fiel "
        "siempre que sea coherente con la tarea pedida.\n"
        f"{contexto.strip()}\n"
        "[/CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
    )


def strip_markdown(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json|html)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def parse_json(raw: str) -> dict | list:
    """Tolerant JSON parser for LLM output.

    Strategy: strip code fences, try direct parse, then walk balanced bracket
    spans from the first `{` or `[` and try each one. Returns the first valid
    parse; raises ValueError if nothing parses.
    """
    cleaned = strip_markdown(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        while start != -1:
            depth = 0
            for i in range(start, len(cleaned)):
                c = cleaned[i]
                if c == opener:
                    depth += 1
                elif c == closer:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(cleaned[start : i + 1])
                        except json.JSONDecodeError:
                            break
            start = cleaned.find(opener, start + 1)

    raise ValueError(f"No valid JSON in response: {cleaned[:80]}")
