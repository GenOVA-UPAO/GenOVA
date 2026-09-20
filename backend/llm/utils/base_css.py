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
html{-webkit-text-size-adjust:100%;scrollbar-color:var(--primary) var(--surface-tint);scrollbar-width:thin}
body{font-family:var(--font-body);
background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh;
font-size:clamp(.95rem,2vw,1.05rem)}
::selection{background:var(--accent-tint);color:var(--text)}
h1,h2,h3{margin-block:var(--space-5) var(--space-2);text-wrap:balance}
h1:first-child,h2:first-child,h3:first-child{margin-block-start:0}
h1{font-family:var(--font-display);font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.2;color:var(--primary);font-weight:700;letter-spacing:-.015em}
h2{font-family:var(--font-display);font-size:clamp(1.3rem,3vw,1.6rem);line-height:1.2;color:var(--primary);font-weight:700;letter-spacing:-.01em}
h3{font-family:var(--font-display);font-size:clamp(1.1rem,2.5vw,1.3rem);line-height:1.25;font-weight:600}
code,kbd,samp,pre{font-family:var(--font-mono);font-size:.92em}
p,li{max-inline-size:72ch;text-wrap:pretty}
:where(p,ul,ol,dl,blockquote,pre,figure,table,details){margin-block:0 var(--space-3)}
:where(ul,ol){padding-inline-start:1.5em}
:where(li+li){margin-block-start:.5em}
:where(li>ul,li>ol){margin-block:.5em 0}
:where(li)::marker{color:var(--primary);font-weight:700}
:where(dt){font-weight:700;color:var(--primary)}
:where(dd){margin-inline-start:var(--space-3);margin-block-end:var(--space-2)}
:where(h4,h5,h6){font-family:var(--font-display);line-height:1.35;margin-block:var(--space-3) var(--space-1)}
:where(blockquote){padding:var(--space-3) var(--space-4);border-inline-start:4px solid var(--accent);background:var(--surface-tint);border-radius:0 10px 10px 0}
:where(cite,figcaption,caption){font-size:.9rem;color:var(--text-muted);line-height:1.5}
:where(cite){display:block;margin-block-start:var(--space-2)}
:where(figcaption){margin-block-start:var(--space-2)}
:where(pre){padding:var(--space-3);overflow:auto;max-width:100%;background:var(--surface-tint);border:1px solid var(--border);border-radius:10px;tab-size:2}
:where(:not(pre)>code,kbd,samp){background:var(--surface-tint);padding:.1em .3em;border-radius:4px;overflow-wrap:anywhere}
:where(table){width:100%;border-collapse:collapse;background:var(--surface);font-size:.95em}
:where(caption){text-align:start;padding-block:var(--space-2);font-weight:600}
:where(th,td){padding:12px 16px;text-align:start;vertical-align:top;border-bottom:1px solid var(--border);overflow-wrap:normal}
:where(th){background:var(--surface-tint);color:var(--primary);font-weight:700}
:where(tbody tr:nth-child(even)){background:var(--bg)}
:where(summary){cursor:pointer;font-weight:600;color:var(--primary);padding-block:var(--space-2);min-height:44px}
:where(fieldset){min-inline-size:0;border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-3)}
:where(legend){font-weight:700;padding-inline:8px}
:where(input,select,textarea){font:inherit;color:inherit;max-width:100%;accent-color:var(--primary)}
:where(a){color:var(--primary)}
:where(hr){border:0;border-top:1px solid var(--border);margin-block:var(--space-4)}
:where(.ova-container>*,.ova-stack>*,.ova-card>*){min-width:0}
:where(.ova-container> :not([hidden])+ :not([hidden]),.ova-stack> :not([hidden])+ :not([hidden])){margin-block-start:var(--space-4)}
:where(.ova-card> :last-child,blockquote> :last-child){margin-block-end:0}
[hidden]{display:none!important}
img,svg{max-width:100%;height:auto}
button{font:inherit;cursor:pointer;min-height:44px;padding:10px 18px;border-radius:10px;
font-weight:600;line-height:1.2;display:inline-flex;align-items:center;justify-content:center;
gap:8px;text-align:center}
button:disabled{opacity:.55;cursor:not-allowed}
a{text-underline-offset:.16em;text-decoration-thickness:.08em}
input,textarea{caret-color:var(--accent)}
table,th,td,.ova-number,.ova-counter,.ova-timer,.ova-score,.ova-progress{font-variant-numeric:tabular-nums}
@media (pointer:fine){::-webkit-scrollbar{width:12px;height:12px}::-webkit-scrollbar-track{background:var(--surface-tint)}::-webkit-scrollbar-thumb{background:var(--primary);border:3px solid var(--surface-tint);border-radius:999px}}
/* Solo lo que el usuario puede enfocar con teclado: un contenedor con
tabindex="-1" enfocado por JS (p. ej. la pregunta activa de un quiz) mostraba
un recuadro azul que parecía un error de maquetación. */
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,
textarea:focus-visible,summary:focus-visible,[tabindex]:not([tabindex="-1"]):focus-visible
{outline:3px solid var(--primary);outline-offset:2px}
.ova-container{max-width:880px;margin-inline:auto;padding:clamp(16px,4vw,24px);padding-block-end:var(--space-6);overflow-wrap:break-word}
.ova-table-scroll{max-width:100%;overflow-x:auto;margin-block:var(--space-3);border:1px solid var(--border);border-radius:10px}
.ova-table-scroll>table{margin:0}
.ova-card{background:var(--surface);border:1px solid var(--border);
border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--space-4)}
.ova-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
min-height:44px;padding:12px 20px;font-weight:600;border:none;border-radius:10px;
background:var(--action);color:#fff;transition:background .2s ease,transform .2s ease}
.ova-btn:hover{background:var(--action-hover);transform:translateY(-1px);
box-shadow:0 8px 22px rgba(10,61,145,.16)}
.ova-btn:active{transform:translateY(0)}
.ova-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.ova-btn--ghost{background:transparent;color:var(--action);
border:2px solid var(--action)}
.ova-btn--ghost:hover{background:var(--accent-tint)}
.ova-input{width:100%;padding:10px 14px;border:2px solid var(--border);
border-radius:10px;background:var(--surface);font:inherit;color:var(--text)}
.ova-input:focus-visible{border-color:var(--primary);outline:3px solid var(--primary);outline-offset:2px}
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
background:var(--accent-tint);color:var(--action-hover)}
.ova-grid{display:grid;gap:var(--space-3);
grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))}
.ova-muted{color:var(--text-muted)}
.ova-divider{border:none;border-top:3px solid var(--accent);width:64px;
margin-block:var(--space-3)}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}
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
