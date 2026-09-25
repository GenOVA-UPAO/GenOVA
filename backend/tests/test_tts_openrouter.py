"""TTS del micro-podcast: voz en español por OpenRouter, MP3 y respaldo Groq."""

from __future__ import annotations

from array import array

import pytest

from llm.podcast import podcast, tts_openrouter
from llm.podcast.tts_openrouter import encode_mp3, max_audio_tokens, synthesize_mp3, trim_silence


def _pcm(values: list[int]) -> bytes:
    return array("h", values).tobytes()


def test_el_tope_de_tokens_crece_con_el_texto_pero_no_se_desboca():
    corto, largo = max_audio_tokens("Hola."), max_audio_tokens("palabra " * 300)
    assert corto >= 200
    assert largo > corto
    # 2400 caracteres ≈ 170 s de voz: el tope no deja pasar de ~6 minutos.
    assert largo < 20 * 60 * 6


def test_recorta_el_silencio_del_final():
    silencio = [0] * 24_000 * 5
    voz = [3000, -3000] * 12_000
    recortado = trim_silence(_pcm(silencio + voz + silencio))
    segundos = len(recortado) / 2 / 24_000
    assert 1.0 <= segundos <= 2.0


def test_audio_sin_voz_queda_vacio():
    assert trim_silence(_pcm([0] * 1000)) == b""


def test_codifica_a_mp3():
    mp3 = encode_mp3(_pcm([1000, -1000] * 24_000))
    assert mp3[:3] == b"ID3" or mp3[0] == 0xFF
    assert len(mp3) < 96_000


def test_sin_clave_no_sintetiza():
    assert synthesize_mp3("hola", None) is None


def test_si_la_sintesis_falla_devuelve_none(monkeypatch):
    def falla(text, key):
        raise RuntimeError("OpenRouter TTS 402: sin crédito")

    monkeypatch.setattr(tts_openrouter, "_stream_pcm", falla)
    assert synthesize_mp3("hola", "sk-or-x") is None


@pytest.fixture
def sin_claves(monkeypatch):
    monkeypatch.setattr("llm.clients.clients._get_provider_key", lambda provider: "clave")


def test_podcast_usa_mp3_de_openrouter(monkeypatch, sin_claves):
    monkeypatch.setattr(tts_openrouter, "synthesize_mp3", lambda text, key: b"\xff\xfbmp3")
    b64, mime = podcast.podcast_audio("Hola")
    assert mime == "audio/mpeg" and b64


def test_podcast_cae_a_groq_si_openrouter_falla(monkeypatch, sin_claves):
    monkeypatch.setattr(tts_openrouter, "synthesize_mp3", lambda text, key: None)
    monkeypatch.setattr(podcast, "generar_audio_tts", lambda text: b"RIFFwav")
    assert podcast.podcast_audio("Hola")[1] == "audio/wav"


def test_podcast_sin_audio_si_todo_falla(monkeypatch, sin_claves):
    monkeypatch.setattr(tts_openrouter, "synthesize_mp3", lambda text, key: None)

    def groq_falla(text):
        raise RuntimeError("sin clave")

    monkeypatch.setattr(podcast, "generar_audio_tts", groq_falla)
    assert podcast.podcast_audio("Hola") is None


def test_el_reproductor_usa_el_tipo_y_un_titulo_corto():
    html = podcast.build_podcast_html(
        "Regresión logística para café. Objetivo: evaluar la exactitud. Nivel educativo: universitario.",
        "Monólogo",
        "QUJD",
        "audio/mpeg",
    )
    assert 'src="data:audio/mpeg;base64,QUJD"' in html
    assert "<h2>Regresión logística para café</h2>" in html
    assert "Nivel educativo" not in html.split("<h2>")[1].split("</h2>")[0]
