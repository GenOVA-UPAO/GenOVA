from generation.domain.eta import EtaItem, estimate_remaining


def test_sin_pendientes_no_hay_estimacion():
    assert estimate_remaining([EtaItem("a:1", "done")], {}, 4) is None


def test_reparte_en_carriles_con_historial():
    items = [EtaItem(f"a:{i}", "pending") for i in range(4)] + [EtaItem("a:9", "running", 10)]
    medians = {"a:0": 20, "a:1": 20, "a:2": 20, "a:3": 20, "a:9": 30}
    eta = estimate_remaining(items, medians, 2)
    # 100 s de trabajo en 2 carriles, con el en curso ocupando uno -> 60 s
    assert eta is not None
    assert eta.seconds == 60
    assert eta.basis == "historial"


def test_sin_historial_es_estimado():
    eta = estimate_remaining([EtaItem("x:1", "pending")], {}, 4)
    assert eta is not None
    assert eta.basis == "estimado"
    assert eta.seconds == 45


def test_running_pasado_de_su_mediana_no_llega_a_cero():
    eta = estimate_remaining([EtaItem("a:1", "running", 100)], {"a:1": 10}, 4)
    assert eta is not None
    assert eta.seconds == 10
    assert eta.basis == "estimado"  # se pasó de lo habitual: la cifra ya no es fiable
