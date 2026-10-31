"""Las claves de imagen no se guardan en los params del job: se resuelven al usarlas."""

import json
import uuid
from types import SimpleNamespace

from generation.application.dto import CreateJobInput
from generation.application.use_cases.create_job import CreateJob
from llm.images import image_settings_resolve as resolve
from llm.utils import llm_config_store as store

_CHAIN = {
    "generation_enabled": {"imagen": True, "video": False},
    "defaults": {"imagen": {"provider": "openrouter", "model_id": "img/model"}},
    "fallbacks": {"imagen": [{"provider": "runware", "model_id": "runware:100@1"}]},
}


class _Resolver:
    def resolve(self, *, ova_settings, user_api_keys, user_id):
        return resolve.build_image_settings(
            ova_settings=ova_settings, user_api_keys=user_api_keys, db=None, user_id=user_id
        )


class _Repo:
    def __init__(self):
        self.created = {}

    def create(self, **kwargs):
        self.created = kwargs
        return SimpleNamespace(id=uuid.uuid4(), ova_id=None)


class _Allow:
    def assert_allowed(self, prompt, user_id):
        return None


class _Launcher:
    def launch(self, job_id, only=None):
        return None


def test_create_job_no_guarda_claves_de_imagen(monkeypatch):
    monkeypatch.setattr(store, "stored_cached", lambda: _CHAIN)
    monkeypatch.setattr("llm.clients.key_resolver.resolve_key", lambda *a, **k: "sk-plat")
    repo = _Repo()
    user_id = uuid.uuid4()
    uc = CreateJob(repo=repo, images=_Resolver(), launcher=_Launcher(), guardrail=_Allow())
    uc.execute(
        CreateJobInput(
            user_id=user_id,
            prompt="fotosíntesis",
            resource_plan=[],
            user_api_keys={"openrouter": "sk-user"},
        )
    )
    dumped = json.dumps(repo.created["params"])
    assert "sk-user" not in dumped
    assert "sk-plat" not in dumped
    assert repo.created["params"]["image_settings"]["owner_id"] == str(user_id)


def test_strip_image_keys_limpia_jobs_antiguos():
    owner = uuid.uuid4()
    old = {
        "enabled": True,
        "provider": "openrouter",
        "api_key": "sk-old",
        "chain": [{"provider": "openrouter", "model_id": "m", "api_key": "sk-old"}],
    }
    clean = resolve.strip_image_keys(old, owner)
    assert "sk-old" not in json.dumps(clean)
    assert clean["owner_id"] == str(owner)
    assert clean["chain"] == [{"provider": "openrouter", "model_id": "m"}]


def test_with_resolved_keys_resuelve_por_el_autor_al_usar(monkeypatch):
    owner = uuid.uuid4()
    seen = []

    def fake_resolve(provider, keys, db, user_id):
        seen.append((provider, keys, user_id))
        return f"{provider}-key"

    monkeypatch.setattr("llm.clients.key_resolver.resolve_key", fake_resolve)
    monkeypatch.setattr("llm.clients.clients.get_user_keys", lambda uid: {"openrouter": "sk-now"})
    settings = {
        "enabled": True,
        "provider": "openrouter",
        "chain": [{"provider": "openrouter", "model_id": "m"}],
        "owner_id": str(owner),
    }
    out = resolve.with_resolved_keys(settings)
    assert out["api_key"] == "openrouter-key"
    assert out["chain"][0]["api_key"] == "openrouter-key"
    assert seen == [("openrouter", {"openrouter": "sk-now"}, owner)]
    assert "api_key" not in settings  # la copia guardada no cambia


def test_load_for_run_quita_claves_de_params(monkeypatch):
    from generation.jobs import jobs_runner

    job = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        status="queued",
        prompt="p",
        params={
            "image_settings": {
                "enabled": True,
                "provider": "openrouter",
                "api_key": "sk-old",
                "chain": [{"provider": "openrouter", "model_id": "m", "api_key": "sk-old"}],
            }
        },
    )

    class _Db:
        commits = 0

        def execute(self, _stmt):
            return SimpleNamespace(scalar_one_or_none=lambda: job)

        def commit(self):
            _Db.commits += 1

        def close(self):
            return None

    monkeypatch.setattr(jobs_runner, "SessionLocal", _Db)
    monkeypatch.setattr(jobs_runner, "_start_job", lambda db, j: None)
    _, params = jobs_runner._load_for_run(job.id)
    assert "sk-old" not in json.dumps(params)
    assert "sk-old" not in json.dumps(job.params)
    assert params["image_settings"]["owner_id"] == str(job.user_id)
