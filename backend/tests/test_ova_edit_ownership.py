"""Un OVA solo lo modifica quien lo creó; el admin lo ve en solo lectura."""

from __future__ import annotations

import pytest

from ova.application.dto import (
    ChatAccessInput,
    ChatCreateInput,
    PhaseContentInput,
    VersionInput,
)
from ova.application.use_cases.edit_phases import EditPhases
from ova.application.use_cases.edit_view import EditView
from ova.application.use_cases.editor_chat import EditorChat
from ova.domain.editor import EditorOva, EditorVersion
from ova.domain.errors import OvaForbidden
from ova.domain.model import EDIT_FORBIDDEN, OvaActor

OWNER = OvaActor(id="docente-1", is_admin=False)
ADMIN = OvaActor(id="admin-1", is_admin=True)
STRANGER = OvaActor(id="alumno-2", is_admin=False)


class _FakeEditorRepo:
    def __init__(self) -> None:
        self.ova = EditorOva(
            id="ova-1", owner_id=OWNER.id, title="Ley de Ohm", description=None, status="listo"
        )
        self.version = EditorVersion(
            id="v1", version_number=1, prompt="", is_active=True, created_at=None
        )

    def get_ova(self, ova_id: str) -> EditorOva | None:
        return self.ova if ova_id == self.ova.id else None

    def get_or_create_active_version(self, ova: EditorOva) -> EditorVersion:
        return self.version

    def list_versions(self, ova_id: str) -> list[EditorVersion]:
        return [self.version]


class _FakeChatRepo:
    def list_messages(self, ova_id: str) -> tuple:
        return ()


def test_el_editor_dice_si_se_puede_editar():
    view = EditView(repo=_FakeEditorRepo())
    assert view.editor(VersionInput(ova_id="ova-1", version_id="", actor=OWNER))["can_edit"]
    assert not view.editor(VersionInput(ova_id="ova-1", version_id="", actor=ADMIN))["can_edit"]


def test_el_admin_no_restaura_versiones_de_otro():
    view = EditView(repo=_FakeEditorRepo())
    with pytest.raises(OvaForbidden, match=EDIT_FORBIDDEN):
        view.revert(VersionInput(ova_id="ova-1", version_id="v1", actor=ADMIN))


@pytest.mark.parametrize("actor", [ADMIN, STRANGER])
def test_solo_el_autor_guarda_recursos(actor):
    edit = EditPhases(repo=_FakeEditorRepo())
    with pytest.raises(OvaForbidden, match=EDIT_FORBIDDEN):
        edit.save(PhaseContentInput(ova_id="ova-1", phase_id="p1", actor=actor, content="<p/>"))


def test_el_admin_lee_el_chat_pero_no_escribe_en_el():
    chat = EditorChat(editor=_FakeEditorRepo(), chat=_FakeChatRepo())
    assert chat.list(ChatAccessInput(ova_id="ova-1", actor=ADMIN)) == ()
    with pytest.raises(OvaForbidden, match=EDIT_FORBIDDEN):
        chat.create(
            ChatCreateInput(
                ova_id="ova-1",
                actor=ADMIN,
                role="user",
                kind="message",
                text="Hola",
                status=None,
                percentage=None,
                resource_labels=(),
                message_id=None,
            )
        )


def test_un_tercero_no_lee_el_chat():
    chat = EditorChat(editor=_FakeEditorRepo(), chat=_FakeChatRepo())
    with pytest.raises(OvaForbidden):
        chat.list(ChatAccessInput(ova_id="ova-1", actor=STRANGER))
