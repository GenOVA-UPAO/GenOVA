"""Utilidades compartidas por las plantillas explain 6-10 y elaborate 1-10.

El prefijo `_` evita que el registro lo trate como plantilla. Solo aporta CSS
mínimo con prefijo `k-` (sobre la hoja base .ova-*) y pequeños helpers de HTML;
cada plantilla conserva su propio JS.
"""

from __future__ import annotations

from ova_engine.html import esc

KIT_CSS = """
<style>
.k-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.k-grow{flex:1 1 180px;min-width:0}
.k-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;
font-size:.8rem;font-weight:700;background:var(--surface-tint);color:var(--primary);border:1px solid var(--border)}
.k-chip.ok{background:var(--success-bg,#EAF7F1);color:var(--success);border-color:var(--success)}
.k-chip.bad{background:var(--danger-bg,#FBEDED);color:var(--danger);border-color:var(--danger)}
.k-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:8px 16px;
border-radius:10px;border:2px solid var(--primary);background:var(--surface);color:var(--primary);
font:inherit;font-weight:600;cursor:pointer}
.k-btn:hover{background:var(--surface-tint)}
.k-btn[aria-pressed="true"],.k-btn.on{background:var(--primary);color:#fff}
.k-btn:disabled{opacity:.5;cursor:not-allowed}
.k-btn.main{background:var(--action);border-color:var(--action);color:#fff}
.k-btn.main:hover{background:var(--action-hover)}
.k-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.k-panel.tint{background:var(--surface-tint)}
.k-label{font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted)}
.k-fb{margin-top:10px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface-tint)}
.k-fb.ok{background:var(--success-bg,#EAF7F1);border-color:var(--success)}
.k-fb.bad{background:var(--danger-bg,#FBEDED);border-color:var(--danger)}
.k-code{font-family:var(--font-mono);font-size:.88rem;white-space:pre-wrap;word-break:break-word;
background:#0F1B33;color:#E8EEFA;border-radius:10px;padding:12px 14px;margin:0}
textarea.k-code-in{width:100%;min-height:120px;font-family:var(--font-mono);font-size:.9rem;
padding:10px 12px;border:2px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);resize:vertical}
textarea.k-code-in:focus-visible{border-color:var(--primary)}
.k-hide{display:none!important}
.k-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.k-meter{height:12px;background:var(--surface-tint);border-radius:6px;overflow:hidden;border:1px solid var(--border)}
.k-meter>span{display:block;height:100%;background:var(--accent);transition:width .25s ease}
</style>
"""

# JS compartido (se concatena dentro de script(...)): normalizar texto y mezclar.
UTIL_JS = """
function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ').trim();}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function kwHit(ans,kp){const w=norm(kp).split(' ').filter(x=>x.length>=2);const a=norm(ans);if(!w.length)return !!norm(kp)&&a.includes(norm(kp));return w.every(x=>a.includes(x.length>5?x.slice(0,x.length-2):x));}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
"""


def header(eyebrow: str, titulo: str, sub: str = "") -> str:
    p = f"<p>{esc(sub)}</p>" if sub else ""
    return f'<upao-header eyebrow="{esc(eyebrow)}" title="{esc(titulo)}">{p}</upao-header>'


def progress(total: int, label: str = "Progreso") -> str:
    return f'<upao-progress id="prog" current="0" total="{int(total)}" label="{esc(label)}" show-fraction></upao-progress>'


def summary(texto: str, title: str = "Cierre") -> str:
    return (
        f'<upao-summary title="{esc(title)}">{esc(texto)}'
        '<upao-complete slot="actions" label="Continuar" locked></upao-complete></upao-summary>'
    )


def clip(text, n: int) -> str:
    t = str(text or "")
    return t if len(t) <= n else t[: n - 1] + "…"
