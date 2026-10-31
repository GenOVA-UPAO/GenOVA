"""«Añadir recurso» solo acepta fases 5E y respeta el tope por tipo.

Regresión: cualquier phase_type se insertaba (uno desconocido creaba un recurso
que nunca podía regenerarse; uno de más de 30 caracteres daba un 500 en el
INSERT) y el tope por tipo contaba con el valor sin recortar, así que
« engage» se saltaba MAX_PHASES_PER_TYPE.
"""

from dataclasses import dataclass, field

import pytest

from ova.application.dto import AddPhaseInput
from ova.application.use_cases.add_phase import AddPhase
from ova.domain.editor import MAX_PHASES_PER_TYPE, EditorOva, EditorPhase, EditorVersion
from ova.domain.errors import OvaEditError
from ova.domain.model import OvaActor


@dataclass
class _Repo:
    counts: dict = field(default_factory=dict)
    added: list = field(default_factory=list)

    def get_ova(self, ova_id):
        return EditorOva(id=ova_id, owner_id="u1", title="T", description=None, status="completado")

    def get_or_create_active_version(self, ova):
        return EditorVersion(id="v1", version_number=1, prompt="p", is_active=True, created_at=None)

    def count_phases(self, version_id, phase_type):
        return self.counts.get(phase_type, 0)

    def next_phase_order(self, version_id, phase_type):
        return 1

    def add_phase(self, version_id, phase_type, phase_order, content):
        self.added.append(phase_type)
        return EditorPhase(id="p1", phase_type=phase_type, phase_order=phase_order,
                           content=content, regenerated=False, resource_type_id=None, title=None)

    def record_micro_version(self, phase_id, ova_id, content):
        pass

    def commit(self, operation):
        pass


def _input(phase_type):
    return AddPhaseInput(ova_id="o1", actor=OvaActor(id="u1", is_admin=False),
                         phase_type=phase_type, prompt="Un caso práctico")


@pytest.mark.parametrize("phase_type", ["foo", "Engage", "x" * 31])
def test_tipo_de_fase_fuera_de_5e_se_rechaza(phase_type):
    repo = _Repo()
    with pytest.raises(OvaEditError) as err:
        AddPhase(repo).execute(_input(phase_type))
    assert err.value.status_code == 400
    assert repo.added == []


def test_tipo_con_espacios_se_guarda_recortado():
    repo = _Repo()
    AddPhase(repo).execute(_input("  explain "))
    assert repo.added == ["explain"]


def test_tope_por_tipo_cuenta_con_el_valor_recortado():
    repo = _Repo(counts={"engage": MAX_PHASES_PER_TYPE})
    with pytest.raises(OvaEditError) as err:
        AddPhase(repo).execute(_input(" engage"))
    assert err.value.status_code == 422
    assert repo.added == []
