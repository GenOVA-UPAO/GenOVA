"""Pruebas unitarias de la normalización canónica de correos electrónicos."""

import pytest

from auth.domain.email import normalize_email


def test_normalize_email_convierte_a_minusculas_y_elimina_espacios():
    assert normalize_email("   Alumno.GenOVA@UPAO.edu.pe   ") == "alumno.genova@upao.edu.pe"


def test_normalize_email_maneja_valores_vacios_y_nulos():
    assert normalize_email("") == ""
    assert normalize_email("   ") == ""
    assert normalize_email(None) == ""  # type: ignore[arg-type]


def test_normalize_email_preserva_cadenas_sin_arroba():
    assert normalize_email("usuario_sin_arroba") == "usuario_sin_arroba"
    assert normalize_email("   MALFORMADO   ") == "malformado"


def test_normalize_email_elimina_etiqueta_mas_rfc_5233():
    assert normalize_email("usuario+spam@upao.edu") == "usuario@upao.edu"
    assert normalize_email("usuario+etiqueta1+etiqueta2@dominio.com") == "usuario@dominio.com"


@pytest.mark.parametrize(
    ("dominio_gmail",),
    [
        ("gmail.com",),
        ("googlemail.com",),
    ],
)
def test_normalize_email_elimina_puntos_solo_en_dominios_gmail(dominio_gmail: str):
    email = f"j.o.h.n.doe+reportes@{dominio_gmail}"
    esperado = f"johndoe@{dominio_gmail}"
    assert normalize_email(email) == esperado


@pytest.mark.parametrize(
    ("email_no_gmail", "esperado"),
    [
        ("juan.perez@upao.edu", "juan.perez@upao.edu"),
        ("maria.elena.rodriguez@outlook.com", "maria.elena.rodriguez@outlook.com"),
        ("a.b.c+tag@empresa.com", "a.b.c@empresa.com"),
        ("profesor.titular@unmsm.edu.pe", "profesor.titular@unmsm.edu.pe"),
    ],
)
def test_normalize_email_preserva_puntos_en_dominios_que_no_son_gmail(
    email_no_gmail: str, esperado: str
):
    assert normalize_email(email_no_gmail) == esperado


def test_normalize_email_colision_de_duplicados_en_gmail():
    forma1 = normalize_email("Juan.Perez+notas@gmail.com")
    forma2 = normalize_email("  juanperez@gmail.com  ")
    assert forma1 == forma2


def test_normalize_email_local_part_vacio_tras_split_mantiene_fallback():
    # Si la dirección empieza con + antes del @, local queda vacío tras split
    assert normalize_email("+etiqueta@gmail.com") == "+etiqueta@gmail.com"
