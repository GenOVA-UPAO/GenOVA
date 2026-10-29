"""Los permisos create_ova / export_ova (definidos en seed y en /admin/roles) se aplican en backend.

Un rol «estudiante» (solo view_ova) no debe poder crear, duplicar, generar ni exportar OVAs.
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from generation.jobs.jobs_router import router as jobs_router  # noqa: E402
from llm.phases.elaborate_router import router as elaborate_router  # noqa: E402
from llm.phases.engage_router import router as engage_router  # noqa: E402
from llm.phases.evaluate_router import router as evaluate_router  # noqa: E402
from llm.phases.explain_router import router as explain_router  # noqa: E402
from llm.phases.explore_router import router as explore_router  # noqa: E402
from ova.interface.http.duplicate_router import router as duplicate_router  # noqa: E402
from ova.interface.http.export_router import router as export_router  # noqa: E402
from ova.interface.http.history_router import router as history_router  # noqa: E402
from ova.interface.http.router import router as ova_router  # noqa: E402


def _required(router, method: str, path: str) -> set[str]:
    for route in router.routes:
        if getattr(route, "path", None) == path and method in getattr(route, "methods", set()):
            return {
                dep.call.required_permission
                for dep in route.dependant.dependencies
                if hasattr(dep.call, "required_permission")
            }
    raise AssertionError(f"ruta no encontrada: {method} {path}")


CASES = [
    (ova_router, "POST", "/save", "create_ova"),
    (duplicate_router, "POST", "/{ova_id}/duplicar", "create_ova"),
    (jobs_router, "POST", "", "create_ova"),
    (engage_router, "POST", "/generate", "create_ova"),
    (explore_router, "POST", "/generate", "create_ova"),
    (explain_router, "POST", "/generate", "create_ova"),
    (elaborate_router, "POST", "/generate", "create_ova"),
    (evaluate_router, "POST", "/generate", "create_ova"),
    (export_router, "GET", "/{ova_id}/export-scorm", "export_ova"),
    (export_router, "GET", "/{ova_id}/export", "export_ova"),
    (history_router, "GET", "/{ova_id}/download", "export_ova"),
]


@pytest.mark.parametrize(("router", "method", "path", "perm"), CASES)
def test_ruta_exige_permiso(router, method, path, perm):
    assert perm in _required(router, method, path)
