"""UpdateRole: el rol del modo tesis se edita, pero no se renombra."""

from __future__ import annotations

from dataclasses import replace
from uuid import uuid4

import pytest

from roles.application.dto import UpdateRoleInput
from roles.application.use_cases.update_role import UpdateRole
from roles.domain.errors import RoleNameLocked
from roles.domain.model import Role


class _FakeRepo:
    def __init__(self, *roles: Role) -> None:
        self.roles = {r.id: r for r in roles}

    def get(self, role_id):
        return self.roles.get(role_id)

    def get_by_name(self, name):
        return next((r for r in self.roles.values() if r.name == name), None)

    def update(self, role_id, *, name=None, description=None, permissions=None):
        role = self.roles[role_id]
        role = replace(
            role,
            name=name if name is not None else role.name,
            description=description if description is not None else role.description,
            permissions=permissions if permissions is not None else role.permissions,
        )
        self.roles[role_id] = role
        return role


def _tesis_role() -> Role:
    return Role(id=uuid4(), name="usuarios_prueba", description="Tesis", permissions=[])


def test_renombrar_el_rol_de_tesis_se_rechaza():
    role = _tesis_role()
    use_case = UpdateRole(repo=_FakeRepo(role))
    with pytest.raises(RoleNameLocked):
        use_case.execute(UpdateRoleInput(role_id=role.id, name="alumnos"))


def test_el_rol_de_tesis_admite_cambiar_permisos_con_el_mismo_nombre():
    role = _tesis_role()
    use_case = UpdateRole(repo=_FakeRepo(role))
    view = use_case.execute(
        UpdateRoleInput(role_id=role.id, name="usuarios_prueba", permissions=["ova:create"])
    )
    assert view.name == "usuarios_prueba"


def test_otros_roles_se_pueden_renombrar():
    role = Role(id=uuid4(), name="profesor", description="", permissions=[])
    use_case = UpdateRole(repo=_FakeRepo(role))
    assert use_case.execute(UpdateRoleInput(role_id=role.id, name="docente")).name == "docente"


def test_eliminar_el_rol_de_tesis_se_rechaza():
    """Sin él, el registro en modo tesis crearía cuentas sin ningún rol."""
    from roles.application.dto import DeleteRoleInput
    from roles.application.use_cases.delete_role import DeleteRole
    from roles.domain.errors import RoleDeletionLocked

    role = _tesis_role()
    other = Role(id=uuid4(), name="usuario", description="", permissions=[])
    with pytest.raises(RoleDeletionLocked):
        DeleteRole(repo=_FakeRepo(role, other)).execute(
            DeleteRoleInput(role_id=role.id, reassign_to_id=other.id)
        )
