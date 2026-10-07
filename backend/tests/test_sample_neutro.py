"""Los datos de ejemplo del modo fake no mencionan Oracle en un OVA de otro tema."""

from __future__ import annotations

import json

import pytest

from ova_engine.domain_context import area_scope, is_oracle_text
from ova_engine.pipeline import generate_with_template
from ova_engine.registry import all_specs
from ova_engine.sample_data import neutral_sample, neutralize_text

SPECS = sorted(all_specs().items())


@pytest.mark.parametrize("key,spec", SPECS, ids=[k for k, _ in SPECS])
def test_sample_neutro_sin_oracle(key, spec):
    params = spec.resolve_params({})
    data = neutral_sample(spec, "Árboles B", params)
    blob = json.dumps(data, ensure_ascii=False)
    assert not is_oracle_text(blob), key
    assert not any(t in blob.lower() for t in ("lgwr", "dbwn", "smon")), key


@pytest.mark.parametrize("key,spec", SPECS, ids=[k for k, _ in SPECS])
def test_modo_fake_renderiza_sin_oracle(key, spec):
    html, _ = generate_with_template(spec, "Seguridad en bases de datos", fake=True)
    assert not is_oracle_text(html), key


def test_con_oracle_en_el_tema_o_el_area_se_conserva():
    spec = all_specs()["explain:2"] if "explain:2" in all_specs() else SPECS[0][1]
    params = spec.resolve_params({})
    assert neutral_sample(spec, "Tablespaces en Oracle", params) == spec.sample("Tablespaces en Oracle", params)
    with area_scope("Administración de Oracle"):
        assert neutral_sample(spec, "Índices", params) == spec.sample("Índices", params)


def test_neutralize_text_casos():
    assert neutralize_text("Tablespace de X") == "Espacio de almacenamiento de X"
    assert neutralize_text("error ORA-01555: snapshot") == "error del motor: snapshot"
    assert neutralize_text("Buffer Cache de SGA") == "Caché de datos"
    assert neutralize_text("pga") == "pga"  # identificador corto
    assert neutralize_text("Texto sin nada") == "Texto sin nada"
    assert neutralize_text("Una base de datos Oracle de ventas") == "Una base de datos relacional de ventas"
