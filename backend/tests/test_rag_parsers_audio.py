"""Regresión: el audio subido se transcribe con Whisper (import correcto de audio_helpers)."""

import pytest

from llm.podcast import audio_helpers
from rag.infrastructure import parsers


@pytest.mark.parametrize("ext", [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"])
def test_extract_text_audio_uses_whisper_transcript(tmp_path, monkeypatch, ext):
    calls = []

    def fake_transcribir(path):
        calls.append(path)
        return "  transcripcion de la clase  "

    monkeypatch.setattr(audio_helpers, "transcribir_audio", fake_transcribir)
    audio = tmp_path / f"clase{ext}"
    audio.write_bytes(b"ID3fake")

    assert parsers.extract_text(str(audio)) == "transcripcion de la clase"
    assert calls == [str(audio)]
