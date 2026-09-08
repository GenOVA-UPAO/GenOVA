"""Hoja base UPAO inyectada server-side en cada recurso generado (F1.2).

El LLM ya no escribe reset, variables, tipografía ni componentes genéricos —
eso vivía en cada prompt y costaba ~300 líneas de CSS de tokens de salida por
recurso. Ahora se inyecta aquí tras la generación; el HTML sigue siendo
autocontenido (funciona igual en la preview blob del workspace y en el SCORM).

Las clases .ova-* son el contrato con build_design_system(): si añades una
clase aquí, documéntala allá para que el LLM la use.
"""

from llm.utils.themes import _upao_root_vars

_MARKER = 'id="ova-base"'

OVA_BASE_CSS = (
    _upao_root_vars()
    + """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh;
font-size:clamp(.95rem,2vw,1.05rem)}
h1{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.2;color:var(--primary);font-weight:700}
h2{font-size:clamp(1.3rem,3vw,1.6rem);line-height:1.2;color:var(--primary);font-weight:700}
h3{font-size:clamp(1.1rem,2.5vw,1.3rem);line-height:1.25;font-weight:600}
img,svg{max-width:100%;height:auto}
button{font:inherit;cursor:pointer;min-height:44px;padding:10px 18px;border-radius:10px;
font-weight:600;line-height:1.2;display:inline-flex;align-items:center;justify-content:center;
gap:8px;text-align:center}
button:disabled{opacity:.55;cursor:not-allowed}
:focus-visible{outline:3px solid var(--primary);outline-offset:2px}
.ova-container{max-width:880px;margin-inline:auto;padding:var(--space-4)}
.ova-card{background:var(--surface);border:1px solid var(--border);
border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--space-4)}
.ova-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
min-height:44px;padding:12px 20px;font-weight:600;border:none;border-radius:10px;
background:var(--accent);color:#fff;transition:all .2s ease}
.ova-btn:hover{background:var(--accent-hover);transform:translateY(-1px);
box-shadow:0 8px 22px rgba(10,61,145,.16)}
.ova-btn:active{transform:translateY(0)}
.ova-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.ova-btn--ghost{background:transparent;color:var(--accent);
border:2px solid var(--accent)}
.ova-btn--ghost:hover{background:var(--accent-tint)}
.ova-input{width:100%;padding:10px 14px;border:2px solid var(--border);
border-radius:10px;background:var(--surface);font:inherit;color:var(--text)}
.ova-input:focus-visible{border-color:var(--primary);outline:none}
.ova-option{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;
padding:14px 16px;border:2px solid var(--border);border-radius:12px;
background:var(--surface);transition:border-color .2s,background .2s}
.ova-option:hover{border-color:var(--primary);background:var(--surface-tint)}
.ova-option.is-selected{border-color:var(--primary);background:var(--surface-tint)}
.ova-option.is-correct{border-color:var(--success);background:#EAF7F1}
.ova-option.is-wrong{border-color:var(--danger);background:#FBEDED}
.ova-feedback{padding:12px 16px;border-radius:10px;font-weight:600;margin-block:var(--space-2)}
.ova-feedback--ok{background:#EAF7F1;color:var(--success);border:1px solid var(--success)}
.ova-feedback--bad{background:#FBEDED;color:var(--danger);border:1px solid var(--danger)}
.ova-progress{height:10px;background:var(--surface-tint);border-radius:6px;overflow:hidden}
.ova-progress>span{display:block;height:100%;background:var(--accent);
border-radius:6px;transition:width .3s ease}
.ova-badge{display:inline-block;padding:4px 10px;border-radius:999px;
font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
background:var(--accent-tint);color:var(--accent-hover)}
.ova-grid{display:grid;gap:var(--space-3);
grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))}
.ova-muted{color:var(--text-muted)}
.ova-divider{border:none;border-top:3px solid var(--accent);width:64px;
margin-block:var(--space-3)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}
html{scroll-behavior:auto}}
"""
)


def inject_base_css(html: str) -> str:
    """Inserta la hoja base en <head>. Idempotente; no toca docs que ya la traen."""
    if _MARKER in html:
        return html
    style = f'<style id="ova-base">{OVA_BASE_CSS}</style>'
    lower = html.lower()
    idx = lower.find("<head>")
    if idx != -1:
        cut = idx + len("<head>")
        return html[:cut] + "\n" + style + html[cut:]
    idx = lower.find("</head>")
    if idx != -1:
        return html[:idx] + style + "\n" + html[idx:]
    # Documento sin head explícito — anteponer para que igual aplique.
    return style + "\n" + html
