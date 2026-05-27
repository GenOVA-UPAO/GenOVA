import os

import pytest
import requests
from pytest_bdd import when

BASE = os.getenv("BASE", "http://localhost:8000")


@when("envío el formulario")
def envio_formulario_global():
    pass  # shared across auth and roles scenarios


@pytest.fixture(scope="session")
def base_url():
    return BASE


@pytest.fixture(scope="session")
def admin_token(base_url):
    r = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@genova.ai", "password": "admin1234password"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def user_token(base_url):
    r = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "user@genova.ai", "password": "user1234password"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]
