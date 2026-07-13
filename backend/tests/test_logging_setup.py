"""Tests for structlog setup + event-dict redaction."""

import json
import logging

from core.log_redaction import redact_event_dict
from core.logging_setup import build_invoke_config, configure_logging


def test_redact_event_dict_masks_email_and_key():
    out = redact_event_dict(
        None,
        "info",
        {"event": "reset a admin@genova.ai", "key": "gsk_ABCDEFGHIJKL12345"},
    )
    assert "[email]" in out["event"]
    assert out["key"] == "[key]"


def test_configure_logging_json_in_production(capsys):
    configure_logging(log_level="INFO", env="production")
    logging.getLogger("test.structlog").info("hello production")
    captured = capsys.readouterr().err or capsys.readouterr().out
    # StreamHandler writes to stderr by default
    text = captured if captured else ""
    if not text:
        # re-log to ensure capture
        logging.getLogger("test.structlog").info("hello production again")
        text = capsys.readouterr().err
    assert "hello production" in text or "hello production again" in text
    # Prefer JSON line when present
    for line in text.splitlines():
        if "hello production" in line:
            parsed = json.loads(line)
            assert parsed.get("event") or "hello" in line
            break


def test_build_invoke_config_has_langsmith_friendly_metadata():
    cfg = build_invoke_config(thread_id="t-1", max_concurrency=4, env="dev")
    assert cfg["configurable"]["thread_id"] == "t-1"
    assert cfg["max_concurrency"] == 4
    assert "prometheus" in cfg["tags"]
    assert cfg["metadata"]["thread_id"] == "t-1"
    assert "email" not in cfg["metadata"]
