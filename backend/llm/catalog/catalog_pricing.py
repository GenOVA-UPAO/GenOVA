"""Pricing helpers: convert raw OpenRouter USD-per-token values to human-friendly
$/1M-token strings and structured dicts for frontend display."""


def _per_m(val) -> float | None:
    """USD-per-token → USD-per-million-tokens. None for non-numeric/zero."""
    try:
        v = float(val)
        return round(v * 1_000_000, 4)
    except (TypeError, ValueError):
        return None


def format_pricing(pricing: dict | None) -> str | None:
    """Return human-readable pricing string, e.g. '$0.50/$1.00 por 1M tokens'."""
    if not pricing:
        return None
    prompt = pricing.get("prompt")
    completion = pricing.get("completion")
    if prompt is None and completion is None:
        return None
    pi = _per_m(prompt)
    co = _per_m(completion)
    if pi is not None and co is not None:
        if pi == 0 and co == 0:
            return "Gratuito"
        if pi == 0:
            return f"Free in · ${co:.2f}/1M out"
        return f"${pi:.2f}/${co:.2f} por 1M tokens"
    return None


def format_pricing_detail(pricing: dict | None) -> dict | None:
    """Return structured breakdown for tooltip: {input, output, cache_read, cache_write} in $/1M."""
    if not pricing:
        return None
    result = {
        "input":       _per_m(pricing.get("prompt")),
        "output":      _per_m(pricing.get("completion")),
        "cache_read":  _per_m(pricing.get("cache_read")),
        "cache_write": _per_m(pricing.get("cache_write")),
    }
    return result if any(v is not None for v in result.values()) else None
