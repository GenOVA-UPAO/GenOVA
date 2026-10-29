"""Piezas compartidas por las plantillas EVALUATE (CSS de mecánica y utilidades JS).

Módulo con prefijo `_`: el registro no lo trata como plantilla.
"""

from __future__ import annotations

EV_CSS = """
<style>
.ev-card{background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:var(--space-3,16px)}
.ev-card.is-ok{border-color:var(--success,#1a7f4b)}
.ev-card.is-bad{border-color:var(--danger,#c0392b)}
.ev-badge{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 10px;border-radius:999px;background:var(--surface-tint,#eef2ff);color:var(--primary,#0A3D91)}
.ev-q{font-size:1.05rem;font-weight:700;margin:var(--space-1,8px) 0 var(--space-2,12px);overflow-wrap:anywhere}
.ev-opts{display:grid;gap:var(--space-2,12px)}
.ev-opt{display:flex;gap:var(--space-2,12px);align-items:flex-start;text-align:left;width:100%;padding:var(--space-2,12px) var(--space-3,16px);border:2px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);background:var(--surface,#fff);color:var(--text,#1b2437);font:inherit;cursor:pointer;min-height:44px}
.ev-opt:hover:not(:disabled){border-color:var(--primary,#0A3D91);background:var(--surface-tint,#eef2ff)}
.ev-opt:focus-visible,.ev-btn:focus-visible,.ev-in:focus-visible,.ev-sel:focus-visible,.ev-cell:focus-visible{outline:3px solid var(--primary,#0A3D91);outline-offset:2px}
.ev-opt[aria-pressed="true"]{border-color:var(--primary,#0A3D91);background:var(--surface-tint,#eef2ff)}
.ev-opt.is-ok{border-color:var(--success,#1a7f4b);background:rgba(26,127,75,.10)}
.ev-opt.is-bad{border-color:var(--danger,#c0392b);background:rgba(192,57,43,.10)}
.ev-opt:disabled{cursor:default}
.ev-key{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--primary,#0A3D91);color:#fff;font-weight:700;font-size:.85rem}
.ev-fb{margin-top:var(--space-2,12px);padding:var(--space-2,12px);border-left:4px solid var(--accent,#F47A20);background:var(--surface-tint,#eef2ff);border-radius:0 8px 8px 0;overflow-wrap:anywhere}
.ev-fb.is-ok{border-left-color:var(--success,#1a7f4b)}
.ev-fb.is-bad{border-left-color:var(--danger,#c0392b)}
.ev-fb[hidden]{display:none}
.ev-row{display:flex;flex-wrap:wrap;gap:var(--space-2,12px);align-items:center}
.ev-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 20px;border-radius:10px;border:2px solid var(--primary,#0A3D91);background:var(--primary,#0A3D91);color:#fff;font:inherit;font-weight:700;cursor:pointer}
.ev-btn.is-ghost{background:transparent;color:var(--primary,#0A3D91)}
.ev-btn:disabled{opacity:.4;cursor:not-allowed}
.ev-hud{display:flex;flex-wrap:wrap;gap:var(--space-2,12px);align-items:center;justify-content:space-between;padding:var(--space-2,12px) var(--space-3,16px);background:var(--surface-tint,#eef2ff);border:1px solid var(--border,#cbd5e1);border-radius:var(--radius,12px)}
.ev-in{width:100%;min-width:0;padding:10px 12px;border:2px solid var(--border,#cbd5e1);border-radius:10px;font:inherit;background:var(--surface,#fff);color:var(--text,#1b2437)}
.ev-bar{height:10px;border-radius:999px;background:var(--surface-tint,#eef2ff);border:1px solid var(--border,#cbd5e1);overflow:hidden}
.ev-bar>span{display:block;height:100%;width:0;background:var(--accent,#F47A20);transition:width .4s ease}
.ev-result{text-align:center}
.ev-big{font-size:2.2rem;font-weight:800;color:var(--primary,#0A3D91);line-height:1.1}
[hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
"""

# Normaliza para comparar respuestas: minúsculas, sin acentos ni espacios sobrantes.
NORM_JS = """
function norm(t){return String(t==null?'':t).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim();}
function say(el,text,kind){el.hidden=false;el.textContent=text;el.className='ev-fb'+(kind?' is-'+kind:'');}
"""


def trim_to_param(key: str, param: str):
    """Normalizador puro `(data, params) -> data`: si el LLM devuelve más elementos de
    `key` que los pedidos en `params[param]`, recorta; si devuelve menos, los deja
    (la plantilla se ajusta al número real)."""

    def normalize(data: dict, params: dict) -> dict:
        items = data.get(key)
        n = params.get(param)
        if isinstance(items, list) and isinstance(n, int) and len(items) > n:
            return {**data, key: items[:n]}
        return data

    return normalize


def normalize_bank(data: dict, params: dict) -> dict:
    """Quiz adaptativo: recorta cada nivel del banco a `num_per_level`."""
    banco = data.get("banco")
    n = params.get("num_per_level")
    if not isinstance(banco, dict) or not isinstance(n, int):
        return data
    return {**data, "banco": {k: (v[:n] if isinstance(v, list) else v) for k, v in banco.items()}}
