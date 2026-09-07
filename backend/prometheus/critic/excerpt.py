"""Extracto representativo del recurso para el Crítico (EN-015).

Lógica pura: sin LLM, sin red, sin I/O. Reduce un HTML de decenas de miles de
caracteres a una muestra representativa dentro de ``budget``:

1. Sustituye cada data-URI base64 (imagen/audio/vídeo) por un marcador corto
   con su tamaño (``[img:data-uri 340KB]``) — el crítico sabe que hay un
   recurso multimedia sin gastar la ventana en sus bytes.
2. Quita el HTML constante inyectado server-side (idéntico en todos los
   recursos): la hoja base ``<style id="ova-base">`` y la librería de
   componentes UPAO (``<script>…UPAO Components v…``). No es lo que se juzga
   — sus reglas llegan aparte al crítico.
3. Con lo que queda (el contenido propio del recurso), compone una muestra que
   cubre el documento entero — head con <title>/<style> propio, cuerpo y los
   ``<script>`` finales donde vive la interactividad. Lo que no cabe se
   recorta POR EL MEDIO con un marcador ``[… N chars omitidos…]``, nunca por
   el final de forma silenciosa.
"""

import re

# Presupuesto por defecto, elegido con datos de ova_job_resources (n=34):
# el contenido PROPIO de un recurso (sin base64, sin hoja base, sin librería
# upao) tiene mediana 7.631, p90 11.558 y max 26.518 chars → 12.000 muestra el
# recurso COMPLETO en ~90% de los casos y limita los outliers a una muestra
# representativa. ~3.5-4.5k tokens de ENTRADA (no toca el presupuesto de
# salida OVA_RESOURCE_BUDGET_S).
DEFAULT_BUDGET = 12000

_MAX_HEAD = 2400
_MIN_BLOCK_KEEP = 300

_DATA_URI_RE = re.compile(
    r"data:(?P<kind>image|audio|video)/[A-Za-z0-9.+-]+;base64,(?P<payload>[A-Za-z0-9+/=]+)"
)
_OVA_BASE_RE = re.compile(r'<style id="ova-base">.*?</style>', re.DOTALL)
_SCRIPT_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.DOTALL | re.IGNORECASE)
_UPAO_LIB_SIG = "UPAO Components v"

_KIND_LABEL = {"image": "img", "audio": "audio", "video": "video"}


def _cut_marker(omitted: int) -> str:
    return f"\n[… {omitted} chars omitidos…]\n"


def _strip_data_uris(html: str) -> str:
    """Sustituye los data-URIs base64 por marcadores ``[img:data-uri NKB]``."""

    def _sub(m: re.Match) -> str:
        if len(m.group(0)) <= 60:
            return m.group(0)
        kb = max(1, len(m.group("payload")) * 3 // 4 // 1024)
        return f"[{_KIND_LABEL[m.group('kind')]}:data-uri {kb}KB]"

    return _DATA_URI_RE.sub(_sub, html)


def _strip_injected(html: str) -> str:
    """Quita hoja base y librería de componentes (constantes, no juzgables)."""
    html = _OVA_BASE_RE.sub("", html)
    return _SCRIPT_RE.sub(
        lambda m: "" if _UPAO_LIB_SIG in m.group(0) else m.group(0), html
    )


def _blocks(text: str) -> list[tuple[str, str]]:
    """Divide ``text`` en bloques [(tipo, contenido)] en orden de documento."""
    out: list[tuple[str, str]] = []
    pos = 0
    for m in _SCRIPT_RE.finditer(text):
        if m.start() > pos:
            out.append(("text", text[pos : m.start()]))
        out.append(("script", m.group(0)))
        pos = m.end()
    if pos < len(text):
        out.append(("text", text[pos:]))
    return out


def _mid_cut(text: str, cap: int) -> str:
    """Recorta a <= ``cap`` chars conservando inicio y final, marcando el hueco."""
    if len(text) <= cap:
        return text
    marker = _cut_marker(len(text))
    keep = cap - len(marker)
    if keep <= 0:
        return text[:cap]
    omitted = len(text) - keep
    marker = _cut_marker(omitted)
    keep = cap - len(marker)
    omitted = len(text) - keep
    a = keep - keep // 4
    return text[:a] + marker + text[len(text) - (keep - a) :]


def _piece(content: str, cap: int) -> tuple[str, int]:
    """Devuelve (pieza, chars_omitidos): entera, recortada al medio u omitida."""
    if cap <= 0 or (len(content) > cap and cap < _MIN_BLOCK_KEEP):
        return "", len(content)
    if len(content) <= cap:
        return content, 0
    return _mid_cut(content, cap), 0


def build_excerpt(html: str, budget: int = DEFAULT_BUDGET) -> str:
    """Muestra representativa de ``html`` dentro de ``budget`` caracteres.

    Si el HTML limpio (sin base64 ni bloques inyectados) cabe entero, se
    devuelve completo y sin marcas. Si no: head con techo 2400, ~2/3 del resto
    para los ``<script>`` (interactividad) y lo demás para el cuerpo; cada
    bloque que no quepa se recorta por el medio con marcador de omisión.
    """
    if budget <= 0:
        return ""
    cleaned = _strip_injected(_strip_data_uris(html))
    if len(cleaned) <= budget:
        return cleaned
    if budget < 2 * _MIN_BLOCK_KEEP:
        return _mid_cut(cleaned, budget)

    h_end = cleaned.find("</head>")
    if h_end != -1:
        head, rest = cleaned[: h_end + 7], cleaned[h_end + 7 :]
    else:
        head, rest = "", cleaned
    head_cap = min(_MAX_HEAD, budget - _MIN_BLOCK_KEEP)
    head_piece = head if len(head) <= head_cap else _mid_cut(head, head_cap)
    remaining = budget - len(head_piece)

    blocks = _blocks(rest)
    scripts = [c for k, c in blocks if k == "script"]
    texts = [c for k, c in blocks if k == "text"]

    if scripts and texts:
        script_budget = remaining * 2 // 3
        text_budget = remaining - script_budget
    elif scripts:
        script_budget, text_budget = remaining, 0
    else:
        script_budget, text_budget = 0, remaining

    script_cap = script_budget // len(scripts) if scripts else 0
    text_cap = text_budget // len(texts) if texts else 0

    pieces: list[str] = [head_piece] if head_piece else []
    omitted_total = 0
    for kind, content in blocks:
        piece, skipped = _piece(content, script_cap if kind == "script" else text_cap)
        if piece:
            pieces.append(piece)
        omitted_total += skipped
    if omitted_total:
        pieces.append(_cut_marker(omitted_total))
    return "".join(pieces)
