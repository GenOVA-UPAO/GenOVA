"""HF Inference Providers image routing (post hf-inference 410 for FLUX)."""

from __future__ import annotations

import json

import llm.images.images as images


class _Resp:
    def __init__(self, status=200, content=b"", headers=None, json_data=None):
        self.status_code = status
        self.content = content if json_data is None else json.dumps(json_data).encode()
        self.headers = headers or {"content-type": "application/json"}
        self._json = json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json


def test_fetch_uses_fal_router_not_hf_inference(monkeypatch):
    images._cache.clear()
    monkeypatch.setenv("HF_TOKEN", "hf_test_token_xxxxxxxx")
    monkeypatch.setenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell")
    monkeypatch.setenv("HF_IMAGE_PROVIDER", "fal-ai")
    monkeypatch.delenv("HF_INFERENCE_BASE", raising=False)
    monkeypatch.delenv("HF_IMAGE_PROVIDER_ID", raising=False)

    posts: list[str] = []

    def fake_post(url, **kwargs):
        posts.append(url)
        return _Resp(json_data={"images": [{"url": "https://cdn.example/img.png"}]})

    def fake_get(url, **kwargs):
        if "huggingface.co/api/models" in url:
            return _Resp(
                json_data={
                    "inferenceProviderMapping": {
                        "fal-ai": {"status": "live", "providerId": "fal-ai/flux/schnell"}
                    }
                }
            )
        return _Resp(
            content=b"\x89PNG\r\n",
            headers={"content-type": "image/png"},
        )

    monkeypatch.setattr(images.httpx, "post", fake_post)
    monkeypatch.setattr(images.httpx, "get", fake_get)

    uri = images.fetch_image_data_uri("a red apple", width=512, height=512)
    assert uri is not None
    assert uri.startswith("data:image/png;base64,")
    assert posts == ["https://router.huggingface.co/fal-ai/fal-ai/flux/schnell"]
    assert "hf-inference" not in posts[0]


def test_fetch_401_returns_none(monkeypatch):
    images._cache.clear()
    monkeypatch.setenv("HF_TOKEN", "hf_bad")
    monkeypatch.setenv("HF_IMAGE_PROVIDER_ID", "fal-ai/flux/schnell")
    monkeypatch.delenv("HF_INFERENCE_BASE", raising=False)

    monkeypatch.setattr(
        images.httpx,
        "post",
        lambda *a, **k: _Resp(status=401, json_data={"error": "Invalid"}),
    )
    assert images.fetch_image_data_uri("x") is None
