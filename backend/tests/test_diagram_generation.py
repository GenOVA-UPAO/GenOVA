"""Real protocol shapes with mocked HTTP; expired credentials must fall back."""

import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from llm.images.sources import diagram_generation as generation
from scripts import evaluate_diagrams

DATA = {"tipo": "flujo", "titulo": "Entrada", "nodos": [{"id": "a", "etiqueta": "Entrada"}]}


@pytest.mark.parametrize(
    "status,content,expected",
    [
        (200, json.dumps(DATA), "vendor/strong"),
        (401, "", "local-test"),
        (200, "{}", "local-test"),
        (200, "no json", "local-test"),
        (0, "", "local-test"),
    ],
)
def test_openrouter_and_expired_or_invalid_fallback(monkeypatch, status, content, expected):
    monkeypatch.setenv("OVA_DIAGRAM_MODEL", "vendor/strong")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-only")
    monkeypatch.setenv("OVA_LOCAL_LLM_MODEL", "local-test")
    calls = []

    def post(url, **kwargs):
        calls.append((url, kwargs))
        remote = "openrouter.ai" in url
        if remote and status == 0:
            raise httpx.ReadTimeout("simulated timeout")
        body = (
            {"choices": [{"message": {"content": content}}]}
            if remote
            else {"message": {"content": json.dumps(DATA)}}
        )
        return httpx.Response(
            status if remote else 200, json=body, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(generation.httpx, "post", post)
    raw, actual = generation.generate_diagram_json("prompt")
    assert json.loads(raw) == DATA and actual == expected
    assert calls[0][1]["json"]["response_format"]["type"] == "json_schema"
    assert len(calls) == (1 if expected == "vendor/strong" else 2)


def test_local_override_and_custom_evaluation_cases(monkeypatch, tmp_path):
    calls = []

    def generate(prompt, *, model):
        calls.append((prompt, model))
        return json.dumps(DATA), model

    monkeypatch.setattr(evaluate_diagrams, "generate_diagram_json", generate)
    cases = [["flujo", "Mi concepto", "Mi detalle"]]
    evaluate_diagrams.evaluate(tmp_path, cases=cases, model="local-override")
    records = json.loads((tmp_path / "resultados.json").read_text())
    assert len(records) == 1 and records[0]["model"] == "local-override"
    assert "Mi concepto" in calls[0][0] and "Mi detalle" in calls[0][0]
    evaluate_diagrams.evaluate(tmp_path, cases=cases, model="local-override", resume=True)
    assert len(calls) == 1


def test_no_key_uses_local_without_remote_call(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.setenv("OVA_LOCAL_LLM_MODEL", "local-only")
    monkeypatch.setitem(
        sys.modules, "llm.clients.clients", SimpleNamespace(_get_provider_key=lambda provider: None)
    )
    calls = []

    def post(url, **kwargs):
        calls.append(url)
        return httpx.Response(
            200, json={"message": {"content": json.dumps(DATA)}}, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(generation.httpx, "post", post)
    assert generation.generate_diagram_json("prompt", model="vendor/strong")[1] == "local-only"
    assert len(calls) == 1 and "openrouter" not in calls[0]


def test_cli_cases_and_model(tmp_path):
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            requests.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": {"content": json.dumps(DATA)}}).encode())

        def log_message(self, *args):
            pass

    cases = tmp_path / "cases.json"
    cases.write_text(json.dumps([["flujo", "Caso externo", "Detalle externo"]]))
    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        command = [
            sys.executable,
            str(Path(evaluate_diagrams.__file__)),
            "--out",
            str(tmp_path / "out"),
            "--cases",
            str(cases),
            "--model",
            "cli-test-model",
        ]
        subprocess.run(
            command,
            env={**os.environ, "OVA_LOCAL_LLM_URL": f"http://127.0.0.1:{server.server_port}"},
            check=True,
            capture_output=True,
            timeout=15,
        )
        assert requests[0]["model"] == "cli-test-model"
        assert "Caso externo" in requests[0]["messages"][0]["content"]
        records = json.loads((tmp_path / "out" / "resultados.json").read_text())
        assert len(records) == 1 and records[0]["concepto"] == "Caso externo"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
