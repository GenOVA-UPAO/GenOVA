"""Validador de la configuración de recursos: debe aceptar todo el catálogo."""

import pytest

from ova_engine.registry import all_specs
from users.domain.errors import InvalidResourceConfigs
from users.domain.resource_configs import validate_resource_configs


def test_acepta_todas_las_claves_del_catalogo_en_un_solo_lote():
    # El QA (2026-10-06) vio rechazado el lote entero por `evaluate:11`.
    configs = {key: {"n": 1} for key in all_specs()} | {"engage:3": {"word_count": 90}}
    assert validate_resource_configs(configs) == configs


@pytest.mark.parametrize("key", ["explore:11", "evaluate:11", "engage:99"])
def test_acepta_ids_de_dos_cifras(key):
    assert validate_resource_configs({key: {"num_questions": 5}}) == {key: {"num_questions": 5}}


@pytest.mark.parametrize("key", ["evaluate:0", "evaluate:100", "evaluar:1", "evaluate:07"])
def test_rechaza_claves_mal_formadas(key):
    with pytest.raises(InvalidResourceConfigs):
        validate_resource_configs({key: {"n": 1}})
