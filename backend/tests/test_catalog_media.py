"""Catálogo de modelos de imagen y video de OpenRouter y sus precios (sin red).

Los datos de ejemplo son los que devuelven `/api/v1/images/models/{id}/endpoints`
y `/api/v1/videos/models` (septiembre de 2026).
"""

from __future__ import annotations

import httpx
import pytest

from llm.catalog import catalog_media
from llm.catalog.catalog_media import build_media_entries, media_rows_of, merge_media_entries
from llm.catalog.catalog_media_pricing import (
    format_usd,
    image_media_pricing,
    pricing_label,
    video_media_pricing,
    video_price_per_second,
    video_skus,
)

# ── Precios de imagen ──────────────────────────────────────────────────────────


def _endpoint(*skus):
    return {"pricing": [{"billable": "output_image", **sku} for sku in skus]}


def test_por_imagen_la_variante_mas_barata_con_desde():
    pricing = image_media_pricing(
        [
            _endpoint(
                {"unit": "image", "cost_usd": 0.04},
                {"unit": "image", "cost_usd": 0.08, "variant": "hd"},
            )
        ]
    )
    assert pricing == {"unit": "image", "usd": 0.04, "from": True, "estimate_usd": 0.04}
    assert pricing_label(pricing) == "desde $0.04/imagen"


def test_por_megapixel_estima_una_imagen_de_un_megapixel():
    pricing = image_media_pricing([_endpoint({"unit": "megapixel", "cost_usd": "0.015"})])
    assert pricing == {"unit": "megapixel", "usd": 0.015, "from": False, "estimate_usd": 0.015}
    assert pricing_label(pricing) == "$0.015/megapíxel"


def test_por_token_estima_los_tokens_de_una_imagen():
    pricing = image_media_pricing([_endpoint({"unit": "token", "cost_usd": 0.00003})])
    assert pricing["unit"] == "token"
    assert pricing["estimate_usd"] == pytest.approx(0.00003 * 1290)
    assert pricing_label(pricing) == "$30.00/1M tokens de imagen"


def test_elige_el_endpoint_mas_barato_e_ignora_lo_que_no_es_salida():
    caro = _endpoint({"unit": "image", "cost_usd": 0.06})
    barato = _endpoint({"unit": "megapixel", "cost_usd": 0.02})
    entrada = {"pricing": [{"billable": "input_image", "unit": "image", "cost_usd": 0.001}]}
    assert image_media_pricing([caro, entrada, barato])["usd"] == 0.02
    assert image_media_pricing([entrada]) is None
    assert image_media_pricing(None) is None


def test_gratis():
    pricing = image_media_pricing([_endpoint({"unit": "image", "cost_usd": 0})])
    assert pricing_label(pricing) == "Gratuito"


@pytest.mark.parametrize(
    ("valor", "texto"),
    [(0, "$0"), (0.035, "$0.035"), (0.1, "$0.10"), (0.12, "$0.12"), (1.5, "$1.50"), (0.0042, "$0.0042")],
)
def test_formato_usd(valor, texto):
    assert format_usd(valor) == texto


# ── SKUs de video ──────────────────────────────────────────────────────────────

VEO_LITE = {
    "duration_seconds_with_audio": "0.08",
    "duration_seconds_without_audio": "0.05",
    "duration_seconds_with_audio_720p": "0.05",
    "duration_seconds_without_audio_720p": "0.03",
}
WAN = {"duration_seconds_480p": "0.05", "duration_seconds_720p": "0.1", "duration_seconds_1080p": "0.2"}
GROK = {
    "cents_per_image_input": "0.2",
    "cents_per_video_output_second_480p": "5",
    "cents_per_video_output_second_720p": "7",
}
FLUX_VIDEO = {
    "cents_per_second_output": "17",
    "cents_per_second_output_720p": "17",
    "cents_per_second_output_1080p": "29",
    "cents_per_second_video_continuation_720p": "41",
}
WAN_26 = {
    "text_to_video_duration_seconds_480p": "0.04",
    "text_to_video_duration_seconds_720p": "0.08",
    "image_to_video_duration_seconds_720p": "0.10",
}
SEEDANCE = {
    "video_tokens": "0.000007",
    "video_tokens_1080p": "0.0000077",
    "video_tokens_with_video_input": "0.0000043",
}


def test_sin_audio_manda_sobre_con_audio():
    assert sorted(video_skus(VEO_LITE)) == [("second", 0.03, "720p", False), ("second", 0.05, None, False)]
    assert video_price_per_second(VEO_LITE, "720p") == 0.03
    assert video_price_per_second(VEO_LITE, "1080p") == 0.05  # sin precio propio: el genérico


def test_por_segundo_y_resolucion():
    assert video_price_per_second(WAN, "480p") == 0.05
    assert video_price_per_second(WAN, "1080p") == 0.2
    pricing = video_media_pricing(WAN, ["480p", "720p", "1080p"])
    assert pricing == {"unit": "second", "usd": 0.05, "from": True, "estimate_usd": 0.05}
    assert pricing_label(pricing) == "desde $0.05/s"


def test_centimos_por_segundo_sin_entradas_ni_continuaciones():
    assert video_price_per_second(GROK, "480p") == pytest.approx(0.05)
    assert video_price_per_second(FLUX_VIDEO, "1080p") == pytest.approx(0.29)
    assert {sku[1] for sku in video_skus(FLUX_VIDEO)} == {0.17, 0.29}


def test_solo_texto_a_video_cuenta():
    assert {sku[1] for sku in video_skus(WAN_26)} == {0.04, 0.08}


def test_resoluciones_que_el_modelo_ya_no_sirve_no_bajan_el_precio():
    # Wan 2.6 publica 480p pero solo admite 720p y 1080p.
    assert video_media_pricing(WAN_26, ["720p", "1080p"])["usd"] == 0.08
    assert video_media_pricing(WAN_26)["usd"] == 0.04


def test_tokens_de_video_sin_estimacion_por_segundo():
    pricing = video_media_pricing(SEEDANCE, ["480p", "720p", "1080p"])
    assert pricing == {"unit": "video_token", "usd": 0.000007, "from": True, "estimate_usd": None}
    assert pricing_label(pricing) == "desde $7.00/1M tokens de video"
    assert video_price_per_second(SEEDANCE, "720p") is None


def test_claves_con_guiones_como_en_la_documentacion():
    skus = {"per-video-second": "0.50", "per-video-second-1080p": "0.75"}
    assert video_price_per_second(skus, "1080p") == 0.75
    assert video_price_per_second(skus, "720p") == 0.50


def test_sku_ilegible_o_negativo_no_cuenta():
    assert video_media_pricing({"duration_seconds": "n/a", "cents_per_second_output": "-1"}) is None
    assert video_media_pricing(None) is None
    assert pricing_label(None) is None


# ── Filas del catálogo ─────────────────────────────────────────────────────────

RAW = {
    "images": [
        {
            "id": "black-forest-labs/flux.2-klein-4b",
            "name": "Flux 2 Klein",
            "description": " Rápido ",
            "supported_parameters": {"aspect_ratio": {"values": ["1:1", "16:9"]}},
            "_endpoints": [_endpoint({"unit": "megapixel", "cost_usd": 0.014})],
        },
        {
            "id": "vendor/edita-imagen",
            "supported_parameters": {"input_references": {"min": 1}},
            "_endpoints": [_endpoint({"unit": "image", "cost_usd": 0.03})],
        },
        {"id": "vendor/sin-proveedor", "_endpoints": []},
        {"id": "vendor/sin-precio", "_endpoints": None},
    ],
    "videos": [
        {
            "id": "google/veo-3.1-lite",
            "name": "Google: Veo 3.1 Lite",
            "supported_durations": [8, 4, 6],
            "supported_resolutions": ["720p", "1080p"],
            "supported_aspect_ratios": ["16:9", "9:16"],
            "generate_audio": True,
            "pricing_skus": VEO_LITE,
        },
        {
            "id": "black-forest-labs/flux-video-edit",
            "supported_durations": None,
            "pricing_skus": {"cents_per_second_output": "3"},
        },
    ],
}


def test_filas_de_imagen():
    rows = {r["model_id"]: r for r in build_media_entries(RAW)["image"]}
    klein = rows["black-forest-labs/flux.2-klein-4b"]
    assert klein["category"] == "imagen" and klein["aptitudes"] == ["imagen"]
    assert klein["curated"] is True
    assert klein["description"] == "Rápido"
    assert klein["media"] == {"kind": "image", "aspect_ratios": ["1:1", "16:9"], "requires_input": False}
    assert klein["pricing"] == "$0.014/megapíxel"
    # Necesita imagen de entrada: sigue en el catálogo, sin aptitud.
    assert rows["vendor/edita-imagen"]["aptitudes"] == []
    # Nadie lo sirve: fuera. Sin datos de endpoints: dentro, sin precio.
    assert "vendor/sin-proveedor" not in rows
    assert rows["vendor/sin-precio"]["media_pricing"] is None


def test_filas_de_video():
    rows = {r["model_id"]: r for r in build_media_entries(RAW)["video"]}
    veo = rows["google/veo-3.1-lite"]
    assert veo["aptitudes"] == ["video"] and veo["modality"] == "text->video"
    assert veo["media"]["durations"] == [4, 6, 8]
    assert veo["media"]["audio"] is True
    assert veo["media"]["pricing_skus"] == VEO_LITE
    assert veo["media_pricing"]["usd"] == 0.03
    assert veo["pricing"] == "desde $0.03/s"
    edit = rows["black-forest-labs/flux-video-edit"]
    assert edit["media"]["requires_input"] is True and edit["aptitudes"] == []


def test_un_listado_caido_queda_en_none():
    assert build_media_entries({"images": None, "videos": []}) == {"image": None, "video": []}
    assert build_media_entries(None) == {"image": None, "video": None}


def test_la_fusion_conserva_aptitudes_y_contexto_del_chat():
    chat = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "modality": "text+image->text+image",
        "aptitudes": ["texto", "vision"],
        "context_length": 32768,
        "curated": True,
        "pricing_detail": {"image_output": 30.0},
    }
    otro = {"provider": "groq", "model_id": "llama", "aptitudes": ["texto"]}
    media = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "aptitudes": ["imagen"],
        "curated": False,
        "media": {"kind": "image"},
        "media_pricing": {"unit": "token", "usd": 0.000015},
    }
    nuevo = {"provider": "openrouter", "model_id": "google/veo-3.1-lite", "aptitudes": ["video"], "media": {"kind": "video"}}

    merged = merge_media_entries([chat, otro], [media, nuevo])

    fused = merged[0]
    assert fused["aptitudes"] == ["imagen", "texto", "vision"]
    assert fused["context_length"] == 32768 and fused["curated"] is True
    assert fused["via_chat"] is True
    # El precio que se cobra por chat (image_output), no el del listado de /images.
    assert fused["media_pricing"]["usd"] == pytest.approx(0.00003)
    assert merged[1] == otro and merged[2] == nuevo
    assert [r["model_id"] for r in media_rows_of(merged, "video")] == ["google/veo-3.1-lite"]


# ── Descarga de los listados ──────────────────────────────────────────────────


def test_pide_los_listados_y_los_endpoints_de_cada_imagen(monkeypatch):
    pedidas = []

    def get(url, timeout):
        pedidas.append(url)
        if url.endswith("/images/models"):
            body = {"data": [{"id": "a/img", "endpoints": "/api/v1/images/models/a/img/endpoints"}, {"sin": "id"}]}
        elif url.endswith("/videos/models"):
            return httpx.Response(503, request=httpx.Request("GET", url))
        else:
            body = {"endpoints": [_endpoint({"unit": "image", "cost_usd": 0.02})]}
        return httpx.Response(200, json=body, request=httpx.Request("GET", url))

    monkeypatch.setattr(catalog_media.httpx, "get", get)
    raw = catalog_media.fetch_openrouter_media()

    assert raw["videos"] is None  # listado caído: se conserva el anterior
    assert [m["id"] for m in raw["images"]] == ["a/img"]
    assert raw["images"][0]["_endpoints"][0]["pricing"][0]["cost_usd"] == 0.02
    assert "https://openrouter.ai/api/v1/images/models/a/img/endpoints" in pedidas


def test_sin_ningun_listado_devuelve_none(monkeypatch):
    def caido(url, timeout):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(catalog_media.httpx, "get", caido)
    assert catalog_media.fetch_openrouter_media() is None
