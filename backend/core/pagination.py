"""Shared pagination envelope fields.

Three routers grew three slightly different implementations of the same
`total_pages` math (`math.ceil`, `(n + l - 1) // l`, …). This is the single
source: an empty result still reports 1 page so clients never divide by zero.
"""

import math


def page_meta(total_items: int, page: int, limit: int) -> dict:
    return {
        "total_items": total_items,
        "total_pages": max(1, math.ceil(total_items / limit)),
        "page": page,
        "limit": limit,
    }
