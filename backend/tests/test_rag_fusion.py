"""Tests puros de Reciprocal Rank Fusion (rag.domain.fusion) — sin red ni BD."""

import pytest

from rag.domain.fusion import RRF_K, reciprocal_rank_fusion, sanitize_websearch_query


def test_consenso_vence_al_lider_de_una_sola_rama():
    # Un doc solo en la rama 1 (rank 1) no debe ganar sobre uno que ambas
    # ramas ponen en sus puestos 2-3: manda el consenso.
    doc_lider = "solo_vectorial"
    doc_consenso = "ambas"
    a = [doc_lider, doc_consenso, "x"]
    b = ["y", doc_consenso, "z"]
    out = reciprocal_rank_fusion([a, b])
    assert out[0] == doc_consenso
    assert doc_lider in out and "x" in out and "y" in out and "z" in out


def test_doc_en_puesto_1_de_ambas_listas_primero():
    out = reciprocal_rank_fusion([["a", "b"], ["a", "c"]])
    assert out[0] == "a"


def test_listas_vacias_devuelven_vacio():
    assert reciprocal_rank_fusion([]) == []
    assert reciprocal_rank_fusion([[], []]) == []


def test_una_sola_rama_conserva_orden():
    assert reciprocal_rank_fusion([["a", "b", "c"]]) == ["a", "b", "c"]


def test_k_invalido_lanza_valueerror():
    with pytest.raises(ValueError):
        reciprocal_rank_fusion([["a"]], k=0)


def test_duplicado_dentro_de_la_misma_lista_cuenta_una_vez():
    # "b" repetido: su rank sigue siendo 2, no sube por repetirse.
    out = reciprocal_rank_fusion([["a", "b", "b", "b", "c"]])
    assert out == ["a", "b", "c"]


def test_desempate_estable_por_primera_aparicion():
    # "x" y "y" obtienen el mismo score (rank 1 en una rama distinta cada uno);
    # el desempate es determinista por orden global de aparición.
    out = reciprocal_rank_fusion([["x"], ["y"]])
    assert out == ["x", "y"]
    out2 = reciprocal_rank_fusion([["y"], ["x"]])
    assert out2 == ["y", "x"]


def test_k_alto_hace_mandar_el_consenso_sobre_la_posicion_exacta():
    # Con k=60 (RRF_K), el consenso (dos ramas, puestos 5 y 6) supera al
    # lider de una rama (puesto 1): 2/(60+~5.5) > 1/(60+1).
    lider = "lider"
    consenso = "consenso"
    a = [lider] + [f"f{i}" for i in range(4)] + [consenso]
    b = [f"g{i}" for i in range(4)] + [consenso]
    out = reciprocal_rank_fusion([a, b], k=RRF_K)
    assert out.index(consenso) < out.index(lider)


def test_elementos_no_hashables_aceptados_como_strings():
    out = reciprocal_rank_fusion([[("a", 1), ("b", 2)], [("b", 2), ("c", 3)]])
    assert out == [("b", 2), ("a", 1), ("c", 3)]


# ---------------------------------------------------------------------------
# sanitize_websearch_query
# ---------------------------------------------------------------------------


def test_sanitize_colapsa_espacios_y_saltos():
    assert sanitize_websearch_query("  ReLU\ny\tsoftmax  ") == "ReLU y softmax"


def test_sanitize_recorta_al_tope():
    q = "a" * 1000
    out = sanitize_websearch_query(q, max_chars=256)
    assert len(out) == 256


def test_sanitize_vacio():
    assert sanitize_websearch_query("") == ""
    assert sanitize_websearch_query("   \n ") == ""
