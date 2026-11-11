"""La clave heredada de un vínculo solo vale si el dueño sigue activo.

Regresión: tras eliminar (desactivar) su cuenta, el dueño seguía pagando con sus
claves la generación de imágenes y vídeo de sus usuarios vinculados.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from llm.clients.key_resolver import resolve_key


def _db(owner_active: bool) -> MagicMock:
    db = MagicMock()
    link = SimpleNamespace(owner_user_id=uuid4(), linked_user_id=uuid4(), status="active")
    db.execute.return_value.scalars.return_value.first.return_value = link
    owner = SimpleNamespace(is_active=owner_active, user_api_keys={"falai": "owner-key"})
    # db.get(User, …) devuelve el dueño; db.get(PlatformConfig, …) no tiene fila.
    db.get.side_effect = lambda model, _key: owner if model.__name__ == "User" else None
    return db


@pytest.fixture(autouse=True)
def _sin_env(monkeypatch):
    monkeypatch.delenv("FALAI_API_KEY", raising=False)


def test_duenio_activo_hereda_su_clave():
    assert resolve_key("falai", {}, _db(owner_active=True), uuid4()) == "owner-key"


def test_duenio_desactivado_no_hereda_su_clave():
    assert resolve_key("falai", {}, _db(owner_active=False), uuid4()) != "owner-key"
