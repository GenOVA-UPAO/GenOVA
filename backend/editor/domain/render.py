"""Renderizador de bloques de recursos a HTML estático con componentes UPAO."""

from __future__ import annotations

import html
from typing import Any

from editor.domain.model import ResourceBlock
from editor.domain.normalization import normalize_type


def esc(value: Any) -> str:
    """Escapa caracteres HTML peligrosos en texto y atributos para prevenir XSS."""
    if value is None:
        return ""
    return html.escape(str(value), quote=True)


def _render_header(props: dict[str, Any]) -> str:
    title = esc(props.get("title", ""))
    eyebrow = props.get("eyebrow")
    eyebrow_attr = f' eyebrow="{esc(eyebrow)}"' if eyebrow else ""
    desc = props.get("description")
    desc_html = f"<p>{esc(desc)}</p>" if desc else ""
    return f'<upao-header title="{title}"{eyebrow_attr}>{desc_html}</upao-header>'


def _render_paragraph(props: dict[str, Any]) -> str:
    text = esc(props.get("text", ""))
    title = props.get("title")
    if title:
        return (
            '<section class="ova-card intro-card">\n'
            f'  <h2 class="card-title">{esc(title)}</h2>\n'
            f'  <p class="card-body-text">{text}</p>\n'
            "</section>"
        )
    lead_class = " lead font-semibold text-lg" if props.get("lead") else ""
    return f'<p class="card-body-text{lead_class}">{text}</p>'


def _render_objective(props: dict[str, Any]) -> str:
    label = esc(props.get("label") or "Objetivo de aprendizaje")
    text = esc(props.get("text", ""))
    return (
        f'<section class="ova-card intro-card" aria-label="{label}">\n'
        f'  <div class="card-badge"><span class="badge-tag">{label}</span></div>\n'
        f'  <p class="card-body-text">{text}</p>\n'
        "</section>"
    )


def _render_example(props: dict[str, Any]) -> str:
    tag = esc(props.get("tag") or "🔍 Ejemplo Razonado")
    title = esc(props.get("title", ""))
    content = esc(props.get("content", ""))
    return (
        '<section class="sec-card sec-ejemplo-card">\n'
        '  <div class="sec-card-header">\n'
        f'    <span class="sec-card-tag tag-ejemplo" aria-hidden="true">{tag}</span>\n'
        f'    <strong class="text-primary">{title}</strong>\n'
        "  </div>\n"
        f'  <p class="sec-text">{content}</p>\n'
        "</section>"
    )


def _render_question(props: dict[str, Any]) -> str:
    num = int(props.get("number") or 1)
    prompt = esc(props.get("prompt", ""))
    choices = props.get("choices") or []
    choices_html_parts = []
    for c in choices:
        val = esc(c.get("value", ""))
        correct = "true" if c.get("correct") else "false"
        feedback = c.get("feedback")
        fb_attr = f' feedback="{esc(feedback)}"' if feedback else ""
        c_text = esc(c.get("text", ""))
        choices_html_parts.append(
            f'<upao-choice group="q{num}" value="{val}" correct="{correct}"{fb_attr}>{c_text}</upao-choice>'
        )
    choices_html = "".join(choices_html_parts)

    explanation = props.get("explanation")
    reveal_html = ""
    if explanation and not choices:
        reveal_html = (
            '\n<upao-reveal class="sec-reveal" label="Comprobar respuesta modelo" icon="✓">\n'
            '  <div class="sec-model-ans">\n'
            "    <strong>Respuesta modelo fundamentada:</strong>\n"
            f"    <p>{esc(explanation)}</p>\n"
            "  </div>\n"
            "</upao-reveal>"
        )
    return f'<upao-question number="{num}" prompt="{prompt}">{choices_html}</upao-question>{reveal_html}'


def _render_panel(props: dict[str, Any]) -> str:
    num = int(props.get("number") or 1)
    character = esc(props.get("character") or "Max")
    bubble_side = esc(props.get("bubbleSide") or "left")
    img_alt = esc(props.get("imgAlt") or "")
    img_url = props.get("imageUrl")
    img_html = f'<img slot="art" src="{esc(img_url)}" alt="{img_alt}">' if img_url else ""
    dialogue = esc(props.get("dialogue", ""))
    return (
        f'<section class="step" data-step="{num}">\n'
        f'  <upao-comic-panel number="{num}" character="{character}" bubble-side="{bubble_side}" img-alt="{img_alt}">\n'
        f"    {img_html}{dialogue}\n"
        "  </upao-comic-panel>\n"
        "</section>"
    )


def _render_summary(props: dict[str, Any]) -> str:
    title = esc(props.get("title") or "Síntesis y Cierre")
    text = esc(props.get("text", ""))
    return (
        f'<upao-summary title="{title}">\n'
        f"  <p>{text}</p>\n"
        '  <upao-complete slot="actions" label="Finalizar recurso" locked></upao-complete>\n'
        "</upao-summary>"
    )


def _render_card(props: dict[str, Any]) -> str:
    title = esc(props.get("title", ""))
    text = esc(props.get("text", ""))
    return (
        '<section class="ova-card dba-panel">\n'
        '  <div class="dba-header">\n'
        '    <span class="dba-icon-badge" aria-hidden="true">🛠️</span>\n'
        f'    <h2 class="dba-title">{title}</h2>\n'
        "  </div>\n"
        '  <div class="dba-body">\n'
        f"    <p>{text}</p>\n"
        "  </div>\n"
        "</section>"
    )


def _render_steps(props: dict[str, Any]) -> str:
    items = props.get("items") or []
    steps_parts = [
        f'<upao-step title="{esc(it.get("title", ""))}">{esc(it.get("content", ""))}</upao-step>'
        for it in items
    ]
    return f"<upao-steps>{''.join(steps_parts)}</upao-steps>"


def _render_reveal(props: dict[str, Any]) -> str:
    label = esc(props.get("label") or "Comprobar respuesta")
    icon = esc(props.get("icon") or "✓")
    prompt = props.get("prompt")
    prompt_html = f'<p class="sec-question">{esc(prompt)}</p>' if prompt else ""
    content = esc(props.get("content", ""))
    return (
        f'{prompt_html}<upao-reveal label="{label}" icon="{icon}">\n'
        f"  <p>{content}</p>\n"
        "</upao-reveal>"
    )


_RENDERERS = {
    "header": _render_header,
    "paragraph": _render_paragraph,
    "objective": _render_objective,
    "example": _render_example,
    "question": _render_question,
    "panel": _render_panel,
    "summary": _render_summary,
    "card": _render_card,
    "steps": _render_steps,
    "reveal": _render_reveal,
}


def render_block(block: ResourceBlock) -> str:
    """Renderiza un bloque individual a su markup HTML semántico UPAO."""
    t = normalize_type(block.tipo)
    p = block.props
    renderer = _RENDERERS.get(t)
    if renderer:
        return renderer(p)
    return f'<div class="unknown-component">{esc(p.get("text") or str(p))}</div>'


def render_blocks_to_html(blocks: list[ResourceBlock]) -> str:
    """Renderiza una lista completa de bloques a HTML de recurso OVA."""
    if not blocks:
        return '<div class="ova-container ova-stack"><p class="text-muted-foreground">Recurso vacío.</p></div>'

    inner = "\n".join(render_block(b) for b in blocks)
    return f'<div class="ova-container ova-stack" data-composed="true">\n{inner}\n</div>'
