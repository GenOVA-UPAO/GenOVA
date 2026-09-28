"""Las elecciones de modelo del usuario solo cuentan si las paga su clave."""

from llm.utils.user_overrides import honored_overrides, own_key_providers

ELECCION = {
    "texto": {
        "provider": "openrouter",
        "model_id": "qwen/qwen3-coder",
        "timeout_s": 90,
        "fallbacks": [
            {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
            {"provider": "groq", "model_id": "llama-3.3-70b"},
        ],
    },
    "codigo": {"provider": "groq", "model_id": "llama-3.3-70b", "timeout_s": 120},
}


def test_sin_clave_propia_se_ignoran_todas_las_elecciones():
    assert honored_overrides(ELECCION, {}, is_admin=False) == {}
    assert honored_overrides(ELECCION, {"openrouter": "  "}, is_admin=False) == {}


def test_con_clave_solo_cuentan_los_proveedores_que_la_tienen():
    honored = honored_overrides(ELECCION, {"openrouter": "sk-or-x"}, is_admin=False)
    assert set(honored) == {"texto"}
    assert [f["provider"] for f in honored["texto"]["fallbacks"]] == ["openrouter"]
    assert honored["texto"]["timeout_s"] == 90


def test_el_administrador_conserva_sus_elecciones():
    assert honored_overrides(ELECCION, {}, is_admin=True) == ELECCION


def test_ajustes_vacios_o_malformados_no_revientan():
    assert honored_overrides(None, None, is_admin=False) == {}
    assert honored_overrides({"texto": "roto"}, {"openrouter": "k"}, is_admin=False) == {}
    assert own_key_providers({"groq": None, "openrouter": "k"}) == {"openrouter"}
