"""OVA content theming — single source of truth for the palette + design system
injected into every HTML-generating prompt (Prometheus).

Two independent axes, both defaulting to "upao":
  - color_mode:  "upao" (fixed UPAO palette) | "free" (LLM chooses a palette)
  - design_mode: "upao" (structured UPAO template) | "free" (LLM chooses layout)

This is intentionally separate from the app *chrome* theme in
frontend/src/index.css — these colors only style the generated learning objects.
Edit UPAO_PALETTE below to retune the institutional colors; nothing else changes.
"""

# ── UPAO institutional palette — editorial académico, blanco dominante ─────────
# Azul = estructura/títulos · Naranja = separadores/acento/CTA · Blanco = base.
# WCAG AA sobre blanco. Edita SOLO estos hex para afinar la marca UPAO.
UPAO_PALETTE = {
    "bg": "#F7F9FC",  # fondo página (blanco frío)
    "surface": "#FFFFFF",  # tarjetas / superficie dominante
    "surface_tint": "#EAF0FB",  # callouts e interactivos (azul muy claro)
    "primary": "#0A3D91",  # AZUL UPAO — títulos, headers, estructura
    "primary_hover": "#072C6B",
    "accent": "#F47A20",  # NARANJA UPAO — separadores, acento, CTA
    "accent_hover": "#D9650F",
    "accent_tint": "#FDEEE0",  # fondo suave de realces naranja
    "text": "#15233B",  # tinta casi-navy
    "text_muted": "#5A6B85",
    "border": "#E2E8F2",
    "success": "#1B9C6B",
    "danger": "#D64545",
    "radius": "14px",
    "shadow": "0 6px 20px rgba(10,61,145,.08)",
}


def _upao_root_vars() -> str:
    p = UPAO_PALETTE
    return (
        ":root{"
        f"--bg:{p['bg']};--surface:{p['surface']};--surface-tint:{p['surface_tint']};"
        f"--primary:{p['primary']};--primary-hover:{p['primary_hover']};"
        f"--accent:{p['accent']};--accent-hover:{p['accent_hover']};--accent-tint:{p['accent_tint']};"
        f"--text:{p['text']};--text-muted:{p['text_muted']};--border:{p['border']};"
        f"--success:{p['success']};--danger:{p['danger']};"
        f"--radius:{p['radius']};--shadow:{p['shadow']};"
        "--space-1:8px;--space-2:12px;--space-3:16px;--space-4:24px;--space-5:32px;--space-6:48px}"
    )


def _palette_block(color_mode: str) -> str:
    if color_mode == "free":
        return (
            "2) PALETA (elige UNA coherente y mantenla):\n"
            "   - Educativa clara: bg #f8fafc, surface #ffffff, primary #4f46e5, text #0f172a, muted #64748b.\n"
            "   - Educativa oscura: bg #0f172a, surface #1e293b, primary #818cf8, text #f1f5f9, muted #94a3b8.\n"
            "   - Adapta acentos al tipo de recurso, pero contraste WCAG AA mínimo."
        )
    # UPAO (default): paleta FIJA institucional.
    return (
        "2) PALETA UPAO OBLIGATORIA (no uses otros colores de marca):\n"
        f"   - Define EXACTAMENTE estas variables CSS en :root:\n     {_upao_root_vars()}\n"
        "   - BLANCO (--surface/--bg) = superficie dominante: la mayor parte del recurso.\n"
        "   - AZUL (--primary) = títulos (h1/h2), barras de cabecera, bordes de estructura,\n"
        "     iconos primarios y el track de barras de progreso.\n"
        "   - NARANJA (--accent) = líneas/keylines de SEPARACIÓN, botones/CTA primarios,\n"
        "     resaltados, estados de respuesta/clave y el relleno de progreso.\n"
        "   - NUNCA uses naranja para texto de cuerpo largo (solo títulos, acentos o gráficos).\n"
        "   - Contraste WCAG AA mínimo en todo texto."
    )


def _layout_block(design_mode: str) -> str:
    if design_mode == "free":
        return (
            "4) LAYOUT (libre, con criterio):\n"
            "   - Elige la composición más adecuada al recurso, pero mantén jerarquía visual clara,\n"
            "     espaciado coherente (escala 8/12/16/24/32/48px) y lectura mobile-first.\n"
            "   - Contenedor legible (máx ~880px en texto), grid/flex con gap, sin overflow horizontal."
        )
    # UPAO (default): plantilla estructurada con firma de marca + componentes.
    return (
        "4) LAYOUT UPAO — USA LOS COMPONENTES UPAO DISPONIBLES:\n"
        "   El script upao_components.js YA está inyectado en el HTML. Usa estos Custom Elements:\n"
        "   <upao-card eyebrow='FASE' title='Título' icon='🧠'>contenido</upao-card>\n"
        "   <upao-node number='1' title='Hito' label='Año'>detalle expandible</upao-node>\n"
        "   <upao-choice value='A' correct='true' feedback='¡Correcto!' group='q1'>texto</upao-choice>\n"
        "   <upao-reveal label='Ver respuesta'>contenido oculto</upao-reveal>\n"
        "   <upao-progress id='p' current='0' total='N' show-fraction></upao-progress>\n"
        "   <upao-timer id='t' seconds='30'></upao-timer>  → start: document.getElementById('t').start()\n"
        "   <upao-score id='s' current='0' max='100'></upao-score>  → add: getElementById('s').add(10)\n"
        "   <upao-nav id='n' total='N' current='1'></upao-nav>  → evento upao-nav-change { index }\n"
        "   <upao-comic-panel number='1' character='Max' img-src='__IMG_1__'>diálogo</upao-comic-panel>\n"
        "   <upao-podcast src='data:audio/wav;base64,...' concept='X' transcript='texto'></upao-podcast>\n"
        "   <upao-drag-item item-id='id' category='cat'>texto</upao-drag-item>\n"
        "   <upao-drop-zone zone-id='z1' accepts='cat' label='Zona'></upao-drop-zone>\n"
        "   <upao-complete label='Continuar →' locked require-progress='N'></upao-complete>\n"
        "   ÚSALOS para construir el recurso. Complementa con HTML/CSS/JS propio cuando sea necesario.\n"
        "   Paleta fija UPAO: --primary #0A3D91 · --accent #F47A20 · --bg #F7F9FC · --surface #FFFFFF.\n"
        "   Mobile-first, contenedor máx 880px, espaciado escala 8/12/16/24/32/48px."
    )


def build_design_system(color_mode: str = "upao", design_mode: str = "upao") -> str:
    """Build the [SISTEMA_DE_DISEÑO_OBLIGATORIO] block injected into HTML prompts.

    Technical / accessibility / SCORM / quality rules are NON-negotiable and
    constant; only the PALETA (color_mode) and LAYOUT (design_mode) sections vary.
    """
    color_mode = color_mode if color_mode in ("upao", "free") else "upao"
    design_mode = design_mode if design_mode in ("upao", "free") else "upao"
    return f"""
[SISTEMA_DE_DISEÑO_OBLIGATORIO]
APLICA TODAS ESTAS REGLAS. Son NO NEGOCIABLES.

1) BASE TÉCNICA
   - <!DOCTYPE html>, lang="es", viewport meta para responsive.
   - Reset CSS al inicio: *{{box-sizing:border-box;margin:0;padding:0}}
   - Font stack del sistema: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif.
   - Define variables CSS en :root (--bg, --surface, --primary, --primary-hover,
     --text, --text-muted, --border, --success, --danger, --radius, --shadow, --space).
   - SIN dependencias externas: nada de CDN, fonts.google, jsdelivr, unpkg, jquery, bootstrap.

{_palette_block(color_mode)}

3) TIPOGRAFÍA
   - Tamaños con clamp() para responsive sin media queries:
     h1: clamp(1.6rem, 4vw, 2.2rem); h2: clamp(1.3rem, 3vw, 1.6rem);
     body: clamp(0.95rem, 2vw, 1.05rem).
   - line-height >= 1.5 en cuerpo, 1.2 en headings.
   - font-weight: 700 para títulos, 600 para subtítulos, 400 normal.

{_layout_block(design_mode)}

5) INTERACCIÓN
   - Botones: padding 12px 20px, font-weight 600, transition all 200ms ease,
     :hover transform translateY(-1px) + shadow elevada, :active translateY(0),
     :focus-visible outline 3px solid color primario con offset 2px.
   - Inputs/selectables: borde 2px, focus-visible cambia borde a primary.
   - Estados de carga, completado y error VISUALMENTE distintos (color + icono/emoji).
   - Animaciones de entrada en elementos clave: opacity 0→1, translateY 8px→0, 300ms ease-out.

6) ACCESIBILIDAD (WCAG 2.2 AA — OBLIGATORIO)
   - Contraste texto/fondo >= 4.5:1 (cuerpo) y >= 3:1 (títulos grandes y bordes de UI).
   - Focus visible en TODO elemento interactivo (:focus-visible outline 3px, offset 2px). Nunca outline:none sin reemplazo.
   - Estructura semántica: un único <h1>, luego <h2>/<h3> en orden sin saltos; usa <main>, <nav>, <section>, <button>, <ul>/<ol>.
   - IMÁGENES: todo <img> con alt descriptivo y específico (qué muestra y por qué importa); alt="" SOLO si es puramente decorativa. Nunca alt genérico tipo "imagen".
   - TECLADO: todo widget interactivo es operable con teclado. Si usas <div>/<span> clicable: tabindex="0", role apropiado (button/tab/checkbox) y handler keydown para Enter y Space (e.preventDefault). Preferir <button> nativo siempre que se pueda.
   - No transmitas información SOLO por color (añade texto, icono o forma): correcto/incorrecto, seleccionado, etc.
   - Inputs/controles con <label> asociado (for/id) o aria-label. Mensajes de estado dinámicos en un contenedor con aria-live="polite".
   - Objetivos táctiles >= 24x24 CSS px (WCAG 2.5.8) con espacio entre ellos.
   - Respeta @media (prefers-reduced-motion: reduce) → animation:none; transition:none; scroll-behavior:auto.

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


def inject_design_system(prompt: str, theme: dict | None = None) -> str:
    """Helper for callers that prefer post-hoc injection (unused by the param path)."""
    color = (theme or {}).get("color", "upao")
    design = (theme or {}).get("design", "upao")
    return prompt.replace("[[DESIGN_SYSTEM]]", build_design_system(color, design))
