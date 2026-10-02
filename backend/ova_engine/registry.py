"""Descubre las plantillas de `ova_engine.templates` (una por recurso)."""

from __future__ import annotations

import functools
import importlib
import pkgutil

from ova_engine import templates
from ova_engine.contract import TemplateSpec


@functools.cache
def all_specs() -> dict[str, TemplateSpec]:
    specs: dict[str, TemplateSpec] = {}
    for mod in pkgutil.iter_modules(templates.__path__):
        if mod.name.startswith("_"):
            continue
        spec = getattr(importlib.import_module(f"{templates.__name__}.{mod.name}"), "SPEC", None)
        if isinstance(spec, TemplateSpec):
            specs[spec.key] = spec
    return specs


def get_spec(phase: str, rt) -> TemplateSpec | None:
    return all_specs().get(f"{phase}:{int(rt)}")
