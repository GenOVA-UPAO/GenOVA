"""Compatibility shim — re-exports public Labs API from sub-modules.

Import from this module to avoid coupling to the internal file layout.
"""
# ruff: noqa: F401
from labs.catalog import AVAILABLE_MODELS, quality_check_html
from labs.prompt_utils import build_improve_prompt, get_base_prompt
from labs.generation import get_job_results, start_lab_job
