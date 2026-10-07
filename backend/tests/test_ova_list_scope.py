"""«Mis OVAs» son los propios, también para el administrador (M9)."""

from ova.application.dto import OvaListQuery
from ova.application.use_cases.list_ovas import ListOvas
from ova.domain.model import OvaActor


class _Catalog:
    def __init__(self):
        self.filters = None

    def list_page(self, filters):
        self.filters = filters
        return (), 0

    def list_generating_ids(self, filters):
        self.filters = filters
        return ()


def _filters(actor, all_users):
    catalog = _Catalog()
    ListOvas(catalog).execute(
        OvaListQuery(actor=actor, page=1, limit=10, search="", status="", all_users=all_users)
    )
    return catalog.filters


def test_el_admin_ve_solo_los_suyos_por_defecto():
    f = _filters(OvaActor(id="admin-1", is_admin=True), all_users=False)
    assert f.owner_id == "admin-1" and f.include_owner is False


def test_el_admin_puede_pedir_los_de_todos_los_usuarios():
    f = _filters(OvaActor(id="admin-1", is_admin=True), all_users=True)
    assert f.owner_id is None and f.include_owner is True


def test_un_usuario_normal_nunca_ve_los_de_otros():
    f = _filters(OvaActor(id="user-1", is_admin=False), all_users=True)
    assert f.owner_id == "user-1" and f.include_owner is False
