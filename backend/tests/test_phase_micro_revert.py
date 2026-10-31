"""Revertir una micro-versión de fase reconstruye el SCORM y respeta «generando».

Regresión: el revert cambiaba la fase en sitio sin reconstruir el zip guardado
(la descarga SCORM y el LMS seguían con el contenido previo) y no comprobaba que
el OVA estuviera generando, así que competía con regen_persist.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime

import pytest

from ova.application.dto import PhaseVersionInput
from ova.application.use_cases.phase_versions import PhaseVersions
from ova.domain.editor import EditorMicroVersion, EditorOva, EditorPhase, EditorVersion
from ova.domain.errors import OvaGenerating
from ova.domain.model import OvaActor


@dataclass
class _Repo:
    status: str = "completado"
    calls: list = field(default_factory=list)

    def get_ova(self, ova_id):
        return EditorOva(id=ova_id, owner_id="u1", title="T", description=None, status=self.status)

    def get_micro_version(self, micro_id, phase_id):
        return EditorMicroVersion(id=micro_id, minor_number=1, content="<p>v1</p>",
                                  created_at=datetime.now(UTC))

    def get_or_create_active_version(self, ova):
        return EditorVersion(id="v2", version_number=2, prompt="p", is_active=True,
                             created_at=datetime.now(UTC))

    def get_phase(self, phase_id, version_id):
        return EditorPhase(id=phase_id, phase_type="explain", phase_order=1, content="<p>v2</p>",
                           regenerated=False, resource_type_id=None, title=None)

    def set_phase_content(self, phase_id, content):
        self.calls.append(("set", phase_id, content))

    def record_micro_version(self, phase_id, ova_id, content):
        self.calls.append(("micro", phase_id))

    def rebuild_scorm(self, ova_id, version_id, user_id):
        self.calls.append(("scorm", ova_id, version_id, user_id))

    def commit(self, operation):
        self.calls.append(("commit", operation))


def _input():
    return PhaseVersionInput(ova_id="o1", phase_id="p1", actor=OvaActor(id="u1", is_admin=False),
                             micro_version_id="m1")


def test_revert_reconstruye_el_scorm_antes_del_commit():
    repo = _Repo()
    PhaseVersions(repo).revert(_input())
    ops = [c[0] for c in repo.calls]
    assert ops == ["set", "micro", "scorm", "commit"]
    assert repo.calls[2] == ("scorm", "o1", "v2", "u1")


def test_revert_rechazado_mientras_genera():
    repo = _Repo(status="generando")
    with pytest.raises(OvaGenerating):
        PhaseVersions(repo).revert(_input())
    assert repo.calls == []
