"""LLM catalog and OVA output-directory helpers shared by the OVA routers.

The LLM catalog is now sourced from agents/catalog_refresh (in-memory merged
catalog, refreshed at startup from provider APIs). The legacy LLM_CATALOG and
_enabled_llm_options()/ids() have been removed — use `get_catalog_entries()`
from llm.catalog.catalog_refresh directly, or consume the filtered catalog returned
by GET /api/users/me/llm-settings on the frontend.
"""

import os

from llm.catalog.catalog_refresh import get_catalog_entries


def _enabled_llm_options() -> list[dict]:
    """Return the full catalog of active models (for backward compat with
    any remaining internal consumers). New code should use
    `get_catalog_entries()` directly."""
    entries = get_catalog_entries()
    return [e for e in entries if e.get("active")]


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR") or default
