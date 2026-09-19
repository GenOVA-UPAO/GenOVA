"""Pruebas unitarias de la máquina de estados de bloqueo temporal de cuentas."""

from datetime import UTC, datetime, timedelta, timezone

from auth.domain.lockout import (
    LOCK_DURATION,
    MAX_FAILED_ATTEMPTS,
    as_utc,
    is_locked,
    minutes_remaining,
    next_failure_state,
)


def test_as_utc_asigna_zona_horaria_utc_a_datetime_naive():
    fecha_naive = datetime(2026, 9, 7, 12, 0, 0)
    resultado = as_utc(fecha_naive)
    assert resultado.tzinfo == UTC
    assert resultado.year == 2026 and resultado.hour == 12


def test_as_utc_preserva_zona_horaria_si_ya_es_aware():
    zona_personalizada = timezone(timedelta(hours=-5))
    fecha_aware = datetime(2026, 9, 7, 12, 0, 0, tzinfo=zona_personalizada)
    resultado = as_utc(fecha_aware)
    assert resultado.tzinfo == zona_personalizada


def test_is_locked_retorna_false_cuando_locked_until_es_none():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    assert is_locked(None, ahora) is False


def test_is_locked_retorna_true_cuando_bloqueo_esta_en_el_futuro():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_hasta = ahora + timedelta(minutes=15)
    assert is_locked(bloqueado_hasta, ahora) is True


def test_is_locked_retorna_false_cuando_bloqueo_ya_expiro():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_hasta = ahora - timedelta(seconds=1)
    assert is_locked(bloqueado_hasta, ahora) is False


def test_is_locked_retorna_false_en_el_segundo_exacto_de_expiracion():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    assert is_locked(ahora, ahora) is False


def test_is_locked_normaliza_correctamente_fechas_naive_de_sqlite():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_naive = datetime(2026, 9, 7, 12, 10, 0)  # 10 min en el futuro pero naive
    assert is_locked(bloqueado_naive, ahora) is True


def test_minutes_remaining_calcula_minutos_completos():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_hasta = ahora + timedelta(minutes=14, seconds=45)
    assert minutes_remaining(bloqueado_hasta, ahora) == 14


def test_minutes_remaining_devuelve_al_menos_un_minuto_si_falta_menos_de_60_segundos():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_hasta = ahora + timedelta(seconds=30)
    assert minutes_remaining(bloqueado_hasta, ahora) == 1


def test_minutes_remaining_devuelve_al_menos_un_minuto_si_ya_expiraron_los_segundos():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_hasta = ahora - timedelta(seconds=10)
    assert minutes_remaining(bloqueado_hasta, ahora) == 1


def test_minutes_remaining_soporta_fechas_naive_de_sqlite():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    bloqueado_naive = datetime(2026, 9, 7, 12, 15, 0)
    assert minutes_remaining(bloqueado_naive, ahora) == 15


def test_next_failure_state_incrementa_intentos_por_debajo_del_umbral():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    intentos, bloqueo = next_failure_state(0, ahora)
    assert intentos == 1
    assert bloqueo is None

    intentos_3, bloqueo_3 = next_failure_state(MAX_FAILED_ATTEMPTS - 2, ahora)
    assert intentos_3 == MAX_FAILED_ATTEMPTS - 1
    assert bloqueo_3 is None


def test_next_failure_state_alcanza_umbral_de_5_fallos_y_bloquea_15_minutos():
    ahora = datetime(2026, 9, 7, 12, 0, 0, tzinfo=UTC)
    intentos, bloqueo = next_failure_state(MAX_FAILED_ATTEMPTS - 1, ahora)
    assert intentos == 0
    assert bloqueo == ahora + LOCK_DURATION
