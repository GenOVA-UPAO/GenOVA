"""render.yaml confía en el proxy de Render para que el límite por IP sea por cliente.

Sin FORWARDED_ALLOW_IPS, uvicorn solo confía en 127.0.0.1: detrás del balanceador
todas las peticiones llegan con la IP del proxy y comparten el bucket de SlowAPI.
"""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import yaml
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

RENDER_YAML = Path(__file__).resolve().parents[2] / "render.yaml"
PROXY_PEER = ("10.20.0.5", 1234)


def _forwarded_allow_ips() -> str | None:
    blueprint = yaml.safe_load(RENDER_YAML.read_text(encoding="utf-8"))
    web = next(
        s for s in blueprint["services"] if s.get("dockerfilePath") == "./backend/Dockerfile.prod"
    )
    values = {v["key"]: v.get("value") for v in web.get("envVars", []) if "key" in v}
    return values.get("FORWARDED_ALLOW_IPS")


def test_render_confia_solo_en_la_red_del_proxy():
    value = _forwarded_allow_ips()
    assert value, "falta FORWARDED_ALLOW_IPS en el servicio web de render.yaml"
    assert value.strip() not in ("*", "127.0.0.1", "127.0.0.1,::1")


def _app() -> ProxyHeadersMiddleware:
    limiter = Limiter(key_func=get_remote_address)

    @limiter.limit("2/minute")
    async def ping(request: Request) -> PlainTextResponse:
        return PlainTextResponse(get_remote_address(request))

    app = Starlette(routes=[Route("/ping", ping)])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    return ProxyHeadersMiddleware(app, trusted_hosts=_forwarded_allow_ips() or "127.0.0.1")


@pytest.mark.anyio
async def test_cada_cliente_tras_el_proxy_tiene_su_propio_limite():
    transport = httpx.ASGITransport(app=_app(), client=PROXY_PEER)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:

        async def hit(xff: str) -> httpx.Response:
            return await client.get("/ping", headers={"x-forwarded-for": xff})

        first = [await hit("1.1.1.1") for _ in range(3)]
        other = [await hit("2.2.2.2") for _ in range(2)]
        spoofed = await hit("9.9.9.9, 3.3.3.3")

    assert [r.status_code for r in first] == [200, 200, 429]
    assert [r.status_code for r in other] == [200, 200]
    # El cliente no elige su IP: cuenta la que añadió el proxy (la de más a la derecha).
    assert spoofed.text == "3.3.3.3"
