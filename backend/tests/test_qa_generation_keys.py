"""Regresiones C1/M1/M2/M3/A7/A8/A9: SQLite y proveedores simulados, sin red."""

import uuid
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker

from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion, PlatformConfig
from tests._sqlite_db import make_session


@pytest.fixture
def db(monkeypatch, tmp_path):
    import ova
    from generation.jobs import jobs_runner

    session = make_session(*(m.__table__ for m in (
        Ova, OvaVersion, OvaPhase, OvaJob, OvaJobResource, PlatformConfig
    )))
    session.execute(text("DROP INDEX uq_one_active_version_per_ova"))
    session.execute(text("CREATE UNIQUE INDEX uq_one_active_version_per_ova ON ova_versions (ova_id) WHERE is_active"))
    session.commit()
    monkeypatch.setattr(jobs_runner, "SessionLocal", sessionmaker(bind=session.bind))

    def persist(zip_bytes, *args, **kwargs):
        path = tmp_path / "scorm.zip"
        path.write_bytes(zip_bytes)
        return None, str(path)

    monkeypatch.setattr(ova, "persist_scorm_zip", persist)
    yield session
    session.close()


def seed(db, status="running", ova_status="error"):
    ova = Ova(user_id=uuid.uuid4(), title="Fotosíntesis", author="Docente", status=ova_status)
    db.add(ova)
    db.flush()
    job = OvaJob(user_id=ova.user_id, ova_id=ova.id, status=status, prompt="Fotosíntesis", params={})
    db.add(job)
    db.flush()
    resource = OvaJobResource(job_id=job.id, phase_type="engage", phase_order=1,
                              resource_type="1", resource_order=0, status="pending")
    db.add(resource)
    db.commit()
    return ova, job, resource


@pytest.mark.parametrize("status", ["running", "canceled"])
def test_retry_and_late_cancel_create_real_version_and_scorm(db, status):
    from pathlib import Path
    from zipfile import ZipFile

    from generation.jobs.jobs_runner import _finalize

    ova, job, resource = seed(db, status=status)
    _finalize(job.id, [{"phase": "engage", "resource_type": "1", "html": "<html><body>conservado</body></html>"}], [], [resource.id])
    db.expire_all()
    assert ova.status == "listo"
    assert ova.current_version_id is not None
    version = db.get(OvaVersion, ova.current_version_id)
    assert version.version_number == 1
    assert "conservado" in version.phases[0].content
    assert job.status == ("canceled" if status == "canceled" else "done")
    assert Path(ova.file_path).exists()
    with ZipFile(ova.file_path) as package:
        assert "imsmanifest.xml" in package.namelist()


def test_cancel_materializes_completed_and_merges_late_only_once(db):
    from generation.jobs.jobs_runner import _finalize
    from generation.jobs.jobs_service import cancel_job

    ova, job, resource = seed(db, ova_status="generando")
    resource.status, resource.content = "done", "<p>primero</p>"
    late = OvaJobResource(job_id=job.id, phase_type="explore", phase_order=2,
                         resource_type="1", resource_order=0, status="running")
    db.add(late)
    db.commit()
    cancel_job(db, job)
    assert ova.status == "listo" and ova.current_version_id
    _finalize(job.id, [{"phase": "explore", "resource_type": "1", "html": "<p>tardío</p>"}], [])
    _finalize(job.id, [], [])
    db.expire_all()
    active = db.get(OvaVersion, ova.current_version_id)
    assert len(active.phases) == 2
    assert active.version_number == 2
    assert job.status == "canceled"


def test_cancel_snapshot_marks_unstarted_resources(db):
    from generation.jobs.jobs_helpers import job_to_dict
    ova, job, resource = seed(db, status="canceled")
    assert job_to_dict(job, [resource])["resources"][0]["status"] == "canceled"


def test_edit_without_version_does_not_create_phantom(db):
    from ova.application.use_cases.edit_view import EditView
    from ova.domain.errors import OvaEditError
    ova, job, resource = seed(db)
    data = SimpleNamespace(ova_id=str(ova.id), actor=SimpleNamespace(id=str(ova.user_id), is_admin=False))
    repo = Mock()
    repo.get_ova.return_value = SimpleNamespace(id=str(ova.id), owner_id=str(ova.user_id), status=ova.status)
    repo.get_active_version.return_value = None
    with pytest.raises(OvaEditError) as err:
        EditView(repo).editor(data)
    assert err.value.error == "generation_no_version"
    repo.get_or_create_active_version.assert_not_called()
    assert not db.execute(select(OvaVersion)).first()


def test_platform_auth_tries_environment_once_but_not_for_personal_key(monkeypatch):
    import llm.router as router
    from llm.auth_errors import ProviderAuthError
    from llm.catalog.provider_listing import ProviderListingError
    monkeypatch.setattr(router.cassette, "intercept_chat", lambda *args: args[-1]())
    monkeypatch.setattr(router, "_get_provider_key", lambda provider: "expired-platform")
    monkeypatch.setattr(router, "_key_cache", {})
    monkeypatch.setenv("OPENROUTER_API_KEY", "working-environment")
    call = Mock(side_effect=[ProviderListingError(401), ("ok", "stop")])
    monkeypatch.setattr(router, "_provider_chat_once", call)
    assert router._chat_once("openrouter", "model", [], 10, {}) == ("ok", "stop")
    assert [c.args[-1] for c in call.call_args_list] == ["expired-platform", "working-environment"]
    call.reset_mock(side_effect=True)
    call.side_effect = ProviderListingError(403)
    with pytest.raises(ProviderAuthError, match="provider_auth_personal"):
        router._chat_once("openrouter", "model", [], 10, {}, key="personal")
    assert call.call_count == 1


@pytest.mark.parametrize("source", ["platform", "own"])
def test_rejected_key_validation_blocks_write_and_network_failure_is_unverified(monkeypatch, source):
    from users.interface.http import key_validation
    monkeypatch.setattr(key_validation, "check_provider_key", lambda *a, **k: {"code": "invalid_key"})
    with pytest.raises(HTTPException) as err:
        key_validation.validate_key_updates({"openrouter": "rejected-long-key"}, ("openrouter",), source=source)
    assert err.value.status_code == 422
    monkeypatch.setattr(key_validation, "check_provider_key", lambda *a, **k: {"code": "unreachable"})
    assert key_validation.validate_key_updates({"openrouter": "new-long-key"}, ("openrouter",), source=source)["openrouter"]["code"] == "unchecked"


def test_last_check_is_bound_to_exact_key(db, monkeypatch):
    from llm.catalog.key_check_store import platform_checks, save_check
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    row = PlatformConfig(key="openrouter_api_key", value="old-key")
    db.add(row)
    db.commit()
    save_check(db, "openrouter", "old-key", {"code": "invalid_key"})
    assert platform_checks(db, ["openrouter"])["openrouter"]["code"] == "invalid_key"
    row.value = "new-key"
    db.commit()
    assert platform_checks(db, ["openrouter"])["openrouter"]["code"] == "unchecked"


def test_auth_failure_persists_immediately_and_stops_queued_workers(db, monkeypatch):
    import prometheus.engine.job_control as control
    import prometheus.engine.workpool as workpool
    import prometheus.plans.generate as gen
    from generation.jobs.jobs_service import mark_job_resuming
    from llm.auth_errors import ProviderAuthError
    ova, job, resource = seed(db)
    monkeypatch.setattr(control, "SessionLocal", sessionmaker(bind=db.bind))
    monkeypatch.setattr(workpool, "mark_running", lambda *a: None)
    generate = Mock(side_effect=ProviderAuthError("openrouter"))
    monkeypatch.setattr(gen, "generate_resource", generate)
    payload = {"job_id": str(job.id), "work_item": {"phase": "engage", "resource_type": 1}}
    first = workpool.resource_worker(payload)
    assert first["errors"][0]["exhausted"]
    db.expire_all()
    assert resource.status == "error" and resource.defect_reason == "provider_auth"
    assert workpool.resource_worker(payload) == {}
    assert generate.call_count == 1
    mark_job_resuming(db, job)
    assert not control.job_stopped(str(job.id))


def test_repair_does_not_retry_authentication_or_cancellation(monkeypatch):
    import prometheus.nodes.repair as repair
    import prometheus.plans.generate as gen
    generate = Mock()
    monkeypatch.setattr(gen, "generate_resource", generate)
    error = {"phase": "engage", "resource_type": 1, "error": "provider_auth", "code": "provider_auth"}
    out = repair.repair_node({"errors": [error]})
    assert out["errors"][0]["exhausted"]
    monkeypatch.setattr(repair, "job_stopped", lambda *a: True)
    repair.repair_node({"errors": [{**error, "code": "generation_failed"}]})
    generate.assert_not_called()


def test_template_schema_retries_do_not_swallow_authentication(monkeypatch):
    from llm.auth_errors import ProviderAuthError
    from ova_engine import text as engine_text
    invoke = Mock(side_effect=ProviderAuthError("openrouter"))
    monkeypatch.setattr(engine_text, "_invoke_backend", invoke)
    with pytest.raises(ProviderAuthError):
        engine_text._run_model_attempts(None, "p", {}, "router", 3, 10, None, None, None, None, None, None)
    assert invoke.call_count == 1


@pytest.mark.parametrize("source", ["platform", "own"])
def test_http_save_does_not_replace_previous_key_on_rejection(db, monkeypatch, source):
    import inspect

    from starlette.requests import Request

    from users.interface.http import admin_platform_settings_router as platform
    from users.interface.http import key_validation
    from users.interface.http import settings_api_keys_router as personal

    users = Mock()
    previous = "valid-previous-key"
    row = PlatformConfig(key="openrouter_api_key", value=previous)
    db.add(row)
    db.commit()
    user = SimpleNamespace(id=uuid.uuid4(), user_api_keys={"openrouter": previous})
    monkeypatch.setattr(key_validation, "check_provider_key", lambda *a, **k: {"code": "invalid_key"})
    request = Request({"type": "http", "method": "PUT", "path": "/", "headers": []})
    with pytest.raises(HTTPException) as err:
        if source == "platform":
            inspect.unwrap(platform.put_platform_config)(request=request, payload={"openrouter": "rejected-key"}, _admin=user, users=users, db=db)
        else:
            inspect.unwrap(personal.put_api_keys)(request=request, payload={"openrouter": "rejected-key"}, current_user=user, users=users)
    assert err.value.status_code == 422
    users.save_platform_keys.execute.assert_not_called()
    users.save_api_keys.execute.assert_not_called()
    assert db.get(PlatformConfig, row.key).value == previous
    assert user.user_api_keys["openrouter"] == previous


def test_seed_teacher_role_is_idempotent():
    import importlib.util
    from pathlib import Path

    from models import Role, UserRole
    spec = importlib.util.spec_from_file_location("lti_seed", Path(__file__).parents[2] / "tests/moodle/lti_seed_genova.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    db = make_session(Role.__table__, UserRole.__table__)
    role = Role(name="profesor", permissions=[])
    db.add(role)
    db.flush()
    user = SimpleNamespace(id=uuid.uuid4())
    module.ensure_teacher_role(db, user)
    db.commit()
    module.ensure_teacher_role(db, user)
    db.commit()
    assignments = db.execute(select(UserRole)).scalars().all()
    assert len(assignments) == 1 and assignments[0].is_primary
    assert assignments[0].role_id == role.id
    db.close()
