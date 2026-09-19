"""Guardrails de entrada: lista, normalización y decisión (sin red ni LLM)."""

from uuid import uuid4

import pytest

from generation.application.dto import CreateJobInput
from generation.application.use_cases.create_job import CreateJob
from generation.domain.errors import PromptInappropriateLanguage, PromptOffTopic
from generation.domain.guardrails import (
    CODE_LANGUAGE,
    CODE_OFF_TOPIC,
    DEFAULT_TERMS,
    LlmVerdict,
    effective_terms,
    evaluate_input,
    find_blocked_term,
    fold_text,
    parse_classifier_response,
    parse_moderation_model,
    parse_terms,
    raise_if_blocked,
    validate_guardrail_updates,
)


def test_fold_text_minusculas_sin_tildes():
    assert fold_text("  IMÉCIL  ") == "  imecil  "
    assert fold_text("Ñandú") == "nandu"


def test_parse_terms_recorta_vacias_y_duplicados():
    raw = "puta\n\nPUTA\n  idiota  \n"
    assert parse_terms(raw) == ("puta", "idiota")


def test_effective_terms_usa_default_si_vacio():
    assert effective_terms("") == DEFAULT_TERMS
    assert effective_terms("   \n  ") == DEFAULT_TERMS
    assert effective_terms("nudo") == ("nudo",)


def test_lista_bloquea_insulto_claro():
    assert find_blocked_term("Eres un idiota de verdad", DEFAULT_TERMS) == "idiota"
    assert find_blocked_term("Esto es una mierda", DEFAULT_TERMS) == "mierda"
    assert find_blocked_term("fuck this assignment", DEFAULT_TERMS) == "fuck"


def test_lista_no_bloquea_subcadena_esclavitud():
    """Palabra completa: 'esclavo' no debe bloquear 'esclavitud'."""
    terms = ("esclavo", *DEFAULT_TERMS)
    assert find_blocked_term("OVA sobre la esclavitud en el siglo XIX", terms) is None
    assert find_blocked_term("el esclavo en la colonia", terms) == "esclavo"


def test_lista_no_bloquea_guerra_civil_ni_temas_historicos():
    prompt = "OVA sobre la Guerra Civil española y la esclavitud"
    assert find_blocked_term(prompt, DEFAULT_TERMS) is None


def test_lista_respeta_acentos_al_normalizar():
    assert find_blocked_term("qué imbecil", DEFAULT_TERMS) == "imbécil"
    assert find_blocked_term("Eres un cabron", DEFAULT_TERMS) == "cabrón"


def test_lista_frase_completa_no_subcadena():
    assert find_blocked_term("hijo de puta el enunciado", DEFAULT_TERMS) is not None
    assert find_blocked_term("la puta teoría", DEFAULT_TERMS) is not None
    # Frase multi-palabra: bordes a ambos lados, no subcadena suelta.
    assert find_blocked_term("hijo de puta", ("hijo de puta",)) == "hijo de puta"
    assert find_blocked_term("hijoputa", ("hijo de puta",)) is None


def test_evaluate_bloquea_por_lista_sin_llm():
    v = evaluate_input(
        "Eres un idiota",
        topic_enabled=False,
        topic_area="",
        moderation_enabled=True,
        terms=DEFAULT_TERMS,
        llm=None,
    )
    assert v.allowed is False
    assert v.code == CODE_LANGUAGE


def test_evaluate_permite_prompt_limpio_sin_llm():
    v = evaluate_input(
        "Redes neuronales convolucionales para clasificación de imágenes",
        topic_enabled=False,
        topic_area="",
        moderation_enabled=True,
        terms=DEFAULT_TERMS,
        llm=None,
    )
    assert v.allowed is True


def test_evaluate_modelo_bloquea_lenguaje_aunque_la_lista_no():
    v = evaluate_input(
        "un insulto inventado xyzzy",
        topic_enabled=False,
        topic_area="",
        moderation_enabled=True,
        terms=DEFAULT_TERMS,
        llm=LlmVerdict(language_ok=False, topic_ok=True),
    )
    assert v.allowed is False
    assert v.code == CODE_LANGUAGE


def test_evaluate_modelo_caido_cae_a_la_lista():
    """llm=None (fallo/timeout): manda la lista. Limpio → permite."""
    v = evaluate_input(
        "Backpropagation en redes neuronales",
        topic_enabled=False,
        topic_area="",
        moderation_enabled=True,
        terms=DEFAULT_TERMS,
        llm=None,
    )
    assert v.allowed is True


def test_evaluate_tema_bloquea_solo_con_veredicto_del_modelo():
    v = evaluate_input(
        "Explica la fotosíntesis de las plantas",
        topic_enabled=True,
        topic_area="machine learning",
        moderation_enabled=False,
        terms=DEFAULT_TERMS,
        llm=LlmVerdict(language_ok=True, topic_ok=False),
    )
    assert v.allowed is False
    assert v.code == CODE_OFF_TOPIC
    assert "machine learning" in (v.message or "")


def test_evaluate_tema_fail_open_si_el_modelo_falla():
    """Sin veredicto LLM y área activa → se permite (fail-open documentado)."""
    v = evaluate_input(
        "Explica la fotosíntesis de las plantas",
        topic_enabled=True,
        topic_area="machine learning",
        moderation_enabled=False,
        terms=DEFAULT_TERMS,
        llm=None,
    )
    assert v.allowed is True


def test_evaluate_tema_desactivado_o_vacio_no_restringe():
    prompt = "Fotosíntesis"
    for kwargs in (
        dict(topic_enabled=False, topic_area="machine learning"),
        dict(topic_enabled=True, topic_area=""),
        dict(topic_enabled=True, topic_area="   "),
    ):
        v = evaluate_input(
            prompt,
            moderation_enabled=False,
            terms=DEFAULT_TERMS,
            llm=LlmVerdict(topic_ok=False),
            **kwargs,
        )
        assert v.allowed is True


def test_evaluate_moderacion_desactivada_no_usa_lista():
    v = evaluate_input(
        "Eres un idiota",
        topic_enabled=False,
        topic_area="",
        moderation_enabled=False,
        terms=DEFAULT_TERMS,
        llm=None,
    )
    assert v.allowed is True


def test_parse_classifier_response_json_y_cerca():
    got = parse_classifier_response('{"language":"block","topic":"ok"}')
    assert got == LlmVerdict(language_ok=False, topic_ok=True)
    wrapped = parse_classifier_response('Claro:\n```json\n{"language":"ok","topic":"block"}\n```')
    assert wrapped == LlmVerdict(language_ok=True, topic_ok=False)
    assert parse_classifier_response("no es json") is None
    assert parse_classifier_response("") is None


def test_parse_moderation_model():
    assert parse_moderation_model("") is None
    assert parse_moderation_model("groq/llama-3.1-8b") == ("groq", "llama-3.1-8b")
    assert parse_moderation_model("openrouter/meta/llama") == ("openrouter", "meta/llama")
    assert parse_moderation_model("/solo") is None


def test_validate_guardrail_updates_flags_y_modelo():
    ok = validate_guardrail_updates(
        {
            "guardrail_topic_enabled": "1",
            "guardrail_topic_area": "machine learning",
            "guardrail_moderation_enabled": "0",
            "guardrail_moderation_terms": "idiota\nmierda",
            "guardrail_moderation_model": "",
            "ignored": "x",
        }
    )
    assert ok["guardrail_topic_enabled"] == "1"
    assert "ignored" not in ok
    with pytest.raises(ValueError, match="0' o '1"):
        validate_guardrail_updates({"guardrail_topic_enabled": "yes"})
    with pytest.raises(ValueError, match="provider"):
        validate_guardrail_updates({"guardrail_moderation_model": "sin-barra"})
    with pytest.raises(ValueError, match="vacío"):
        validate_guardrail_updates({"foo": "bar"})


def test_raise_if_blocked_usa_errores_distintos():
    raise_if_blocked(
        evaluate_input(
            "ok",
            topic_enabled=False,
            topic_area="",
            moderation_enabled=False,
            terms=(),
            llm=None,
        )
    )
    with pytest.raises(PromptInappropriateLanguage) as lang:
        raise_if_blocked(
            evaluate_input(
                "idiota",
                topic_enabled=False,
                topic_area="",
                moderation_enabled=True,
                terms=DEFAULT_TERMS,
                llm=None,
            )
        )
    assert lang.value.code == CODE_LANGUAGE
    with pytest.raises(PromptOffTopic) as topic:
        raise_if_blocked(
            evaluate_input(
                "fotosíntesis",
                topic_enabled=True,
                topic_area="machine learning",
                moderation_enabled=False,
                terms=(),
                llm=LlmVerdict(topic_ok=False),
            )
        )
    assert topic.value.code == CODE_OFF_TOPIC


class _Repo:
    def __init__(self):
        self.created = False

    def create(self, **_kwargs):
        self.created = True
        raise AssertionError("no se debe crear el job si el guardrail bloquea")


class _Images:
    def resolve(self, **_kwargs):
        return {}


class _Launcher:
    def launch(self, *_a, **_k):
        raise AssertionError("no se debe lanzar el job")


class _BlockLanguage:
    def assert_allowed(self, prompt, user_id):
        raise PromptInappropriateLanguage()


class _Allow:
    def assert_allowed(self, prompt, user_id):
        return None


def test_create_job_no_persiste_si_el_guardrail_bloquea():
    uc = CreateJob(repo=_Repo(), images=_Images(), launcher=_Launcher(), guardrail=_BlockLanguage())
    with pytest.raises(PromptInappropriateLanguage):
        uc.execute(
            CreateJobInput(user_id=uuid4(), prompt="idiota", resource_plan=[{"phase_type": "engage"}])
        )


def test_create_job_sigue_si_el_guardrail_permite():
    created = {}

    class OkRepo:
        def create(self, **kwargs):
            created.update(kwargs)

            class Job:
                id = uuid4()
                ova_id = uuid4()

            return Job()

    class OkLauncher:
        def __init__(self):
            self.launched = False

        def launch(self, job_id, only=None):
            self.launched = True

    launcher = OkLauncher()
    uc = CreateJob(repo=OkRepo(), images=_Images(), launcher=launcher, guardrail=_Allow())
    result = uc.execute(
        CreateJobInput(user_id=uuid4(), prompt="redes neuronales", resource_plan=[])
    )
    assert created["prompt"] == "redes neuronales"
    assert result.status == "queued"
    assert launcher.launched is True


def test_checker_lista_bloquea_sin_llamar_al_modelo(monkeypatch):
    from generation.infrastructure import guardrails_store
    from generation.infrastructure.input_guardrail import InputGuardrailChecker

    monkeypatch.setattr(
        guardrails_store,
        "runtime_settings",
        lambda: {
            "topic_enabled": False,
            "topic_area": "",
            "moderation_enabled": True,
            "terms": DEFAULT_TERMS,
            "moderation_model": "groq/llama",
        },
    )
    called = []
    monkeypatch.setattr(
        InputGuardrailChecker, "_call_llm", lambda *a, **k: called.append(True) or ""
    )
    with pytest.raises(PromptInappropriateLanguage):
        InputGuardrailChecker().assert_allowed("Eres un idiota", uuid4())
    assert called == []


def test_checker_tema_fail_open_si_el_llm_falla(monkeypatch):
    from generation.infrastructure import guardrails_store
    from generation.infrastructure.input_guardrail import InputGuardrailChecker

    monkeypatch.setattr(
        guardrails_store,
        "runtime_settings",
        lambda: {
            "topic_enabled": True,
            "topic_area": "machine learning",
            "moderation_enabled": False,
            "terms": DEFAULT_TERMS,
            "moderation_model": "",
        },
    )

    def boom(*_a, **_k):
        raise TimeoutError("provider down")

    monkeypatch.setattr(InputGuardrailChecker, "_call_llm", boom)
    InputGuardrailChecker().assert_allowed("Explica la fotosíntesis", uuid4())
