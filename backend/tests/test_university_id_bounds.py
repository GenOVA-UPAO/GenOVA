"""El código universitario no supera el rango de users.university_id (INTEGER).

Un código de 11 dígitos pasaba la validación y el UPDATE fallaba en Postgres
con «integer out of range», que llegaba al cliente como un 500 genérico.
"""

import pytest
from pydantic import ValidationError

from users.interface.http.admin_profile_router import UserProfileAdminUpdate
from users.interface.http.settings_profile_router import UserProfileUpdate

BASE = {"full_name": "Ana Torres", "email": "ana@upao.edu.pe"}


@pytest.mark.parametrize("model", [UserProfileAdminUpdate, UserProfileUpdate])
def test_codigo_fuera_del_rango_int4_se_rechaza_con_422(model):
    with pytest.raises(ValidationError):
        model(**BASE, university_id=12345678901)


@pytest.mark.parametrize("model", [UserProfileAdminUpdate, UserProfileUpdate])
def test_codigo_de_nueve_digitos_es_valido(model):
    assert model(**BASE, university_id=123456789).university_id == 123456789
