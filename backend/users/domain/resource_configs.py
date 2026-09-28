"""Reglas puras de la configuración de recursos por usuario.

`{"phase:id": {"key": value, ...}}` — mismas validaciones y mismos mensajes
que el validador que vivía en el router de ajustes.
"""

from __future__ import annotations

import re

from users.domain.errors import InvalidResourceConfigs

_VALID_KEY = re.compile(r"^(engage|explore|explain|elaborate|evaluate):([1-9]|10)$")

MAX_CONFIG_ENTRIES = 50


def validate_resource_configs(configs: dict) -> dict:
    if not isinstance(configs, dict):
        raise InvalidResourceConfigs("configs debe ser un objeto")
    if len(configs) > MAX_CONFIG_ENTRIES:
        raise InvalidResourceConfigs("Máximo 50 entradas de configuración")
    clean: dict = {}
    for k, v in configs.items():
        if not _VALID_KEY.match(k):
            raise InvalidResourceConfigs(f"Clave inválida: {k!r}")
        if not isinstance(v, dict):
            raise InvalidResourceConfigs(f"El valor de {k!r} debe ser un objeto")
        entry: dict = {}
        for fk, fv in v.items():
            if not isinstance(fk, str):
                raise InvalidResourceConfigs(f"Subclave inválida en {k!r}")
            if not isinstance(fv, (int, float)):
                raise InvalidResourceConfigs(f"Valor de {k!r}.{fk!r} debe ser numérico")
            entry[fk] = fv
        clean[k] = entry
    return clean
