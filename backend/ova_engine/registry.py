"""Descubre las plantillas de `ova_engine.templates` (una por recurso)."""

from __future__ import annotations

import functools
import importlib
import pkgutil

import structlog

from ova_engine import templates
from ova_engine.contract import TemplateSpec

logger = structlog.get_logger(__name__)


_LOAD_ERRORS: dict[str, str] = {}


def load_errors() -> dict[str, str]:
    """Plantillas que no cargaron (nombre → error). Los tests exigen que esté vacío."""
    all_specs()
    return dict(_LOAD_ERRORS)


@functools.cache
def all_specs() -> dict[str, TemplateSpec]:
    specs: dict[str, TemplateSpec] = {}
    for mod in pkgutil.iter_modules(templates.__path__):
        if mod.name.startswith("_"):
            continue
        try:
            module = importlib.import_module(f"{templates.__name__}.{mod.name}")
        except Exception as exc:  # una plantilla rota no tumba el motor: ese recurso usa el plan clásico
            _LOAD_ERRORS[mod.name] = f"{type(exc).__name__}: {exc}"
            logger.exception("ova engine template failed to load", template=mod.name)
            continue
        spec = getattr(module, "SPEC", None)
        if isinstance(spec, TemplateSpec):
            specs[spec.key] = spec
    return specs


def get_spec(phase: str, rt) -> TemplateSpec | None:
    return all_specs().get(f"{phase}:{int(rt)}")
