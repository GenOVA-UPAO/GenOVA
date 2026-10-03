"""Valoración 👍/👎 del docente: reglas del caso de uso (con repositorios en memoria)."""

import pytest

from ova.application.use_cases import FeedbackInput, ResourceFeedbackUseCase
from ova.domain.editor import EditorOva, EditorPhase, EditorVersion
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound
from ova.domain.feedback import ResourceFeedback
from ova.domain.model import OvaActor

OWNER = OvaActor(id="u1", is_admin=False)
OTHER = OvaActor(id="u2", is_admin=False)
ADMIN = OvaActor(id="u3", is_admin=True)


class FakeEditor:
    def get_ova(self, ova_id):
        return EditorOva(id="o1", owner_id="u1", title="t", description=None, status="ready") if ova_id == "o1" else None

    def get_or_create_active_version(self, ova):
        return EditorVersion(id="v1", version_number=1, prompt="", is_active=True, created_at=None)

    def get_phase(self, phase_id, version_id):
        if phase_id != "p1":
            return None
        return EditorPhase(
            id="p1", phase_type="engage", phase_order=1, content="<html>", regenerated=False,
            resource_type_id=1, title="x",
        )


class FakeFeedback:
    def __init__(self):
        self.rows = {}

    def upsert(self, d):
        fb = ResourceFeedback(d.phase_id, d.phase, d.resource_type, d.template_key, d.params, d.rating, d.reason, d.comment, None)
        self.rows[(d.user_id, d.phase_id)] = fb
        return fb

    def list_for_ova(self, user_id, ova_id):
        return tuple(v for (u, _), v in self.rows.items() if u == user_id)

    def delete(self, user_id, phase_id):
        return self.rows.pop((user_id, phase_id), None) is not None


@pytest.fixture
def uc():
    return ResourceFeedbackUseCase(
        FakeEditor(), FakeFeedback(), lambda html: {"key": "engage_01", "params": {"num_panels": 5}}
    )


def _in(**kw):
    base = {"ova_id": "o1", "phase_id": "p1", "actor": OWNER, "rating": "down", "reason": "fuera_de_tema"}
    return FeedbackInput(**{**base, **kw})


def test_down_guarda_plantilla_y_params_decididos(uc):
    fb = uc.put(_in(comment="  habla de otro tema  "))
    assert (fb.template_key, fb.params, fb.phase, fb.resource_type) == ("engage_01", {"num_panels": 5}, "engage", "1")
    assert fb.comment == "habla de otro tema"


def test_idempotente_actualiza_la_misma_fila(uc):
    uc.put(_in())
    uc.put(_in(reason="muy_largo"))
    rows = uc.list(_in())
    assert len(rows) == 1 and rows[0].reason == "muy_largo"


def test_up_ignora_motivo_y_comentario(uc):
    fb = uc.put(_in(rating="up", reason="otro", comment="x"))
    assert (fb.reason, fb.comment) == (None, None)


@pytest.mark.parametrize(
    ("kw", "code"),
    [
        ({"rating": "meh"}, "invalid_rating"),
        ({"reason": "no_existe"}, "invalid_reason"),
        ({"comment": "x" * 501}, "comment_too_long"),
        ({"phase_id": "otro"}, "phase_not_found"),
    ],
)
def test_validaciones(uc, kw, code):
    with pytest.raises(OvaEditError) as e:
        uc.put(_in(**kw))
    assert e.value.error == code


def test_solo_el_dueno_valora(uc):
    with pytest.raises(OvaForbidden):
        uc.put(_in(actor=OTHER))
    with pytest.raises(OvaForbidden):
        uc.put(_in(actor=ADMIN))
    with pytest.raises(OvaNotFound):
        uc.put(_in(ova_id="nope"))


def test_quitar_valoracion(uc):
    uc.put(_in())
    uc.delete(_in())
    assert uc.list(_in()) == ()
    with pytest.raises(OvaEditError):
        uc.delete(_in())
