"""Purgar una OVA borra los paquetes de todas sus versiones, en disco y en Storage."""

from __future__ import annotations

from ova.infrastructure import scorm_package_cleaner
from ova.infrastructure.scorm_package_cleaner import ProjectScormPackageCleaner
from storage.supabase import SupabaseFileStorage


def test_delete_versions_removes_every_version_on_disk_and_in_storage(tmp_path, monkeypatch):
    for version in (1, 2, 3):
        (tmp_path / f"ova-1_v{version}.zip").write_bytes(b"zip")
    (tmp_path / "ova-10_v1.zip").write_bytes(b"zip")  # otra OVA con prefijo parecido
    monkeypatch.setenv("OVA_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr(scorm_package_cleaner, "is_configured", lambda: True)
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        scorm_package_cleaner,
        "delete_prefix",
        lambda folder, prefix: calls.append((folder, prefix)),
    )

    ProjectScormPackageCleaner().delete_versions("user-1", "ova-1")

    assert sorted(p.name for p in tmp_path.iterdir()) == ["ova-10_v1.zip"]
    assert calls == [("user-1", "ova-1_v")]


class _FakeBucket:
    def __init__(self, names: list[str]) -> None:
        self.names = names
        self.removed: list[str] = []
        self.listed: tuple | None = None

    def list(self, folder, options):
        self.listed = (folder, options["search"])
        return [{"name": name} for name in self.names if options["search"] in name]

    def remove(self, keys):
        self.removed.extend(keys)


def test_supabase_delete_prefix_removes_only_matching_objects(monkeypatch):
    bucket = _FakeBucket(["ova-1_v1.zip", "ova-1_v2.zip", "ova-1_v3.zip", "x-ova-1_v1.zip"])

    class _Storage:
        def from_(self, _name):
            return bucket

    class _Client:
        storage = _Storage()

    adapter = SupabaseFileStorage()
    monkeypatch.setattr(adapter, "_get_client", lambda: _Client())

    adapter.delete_prefix("user-1", "ova-1_v")

    assert bucket.listed == ("user-1", "ova-1_v")
    assert bucket.removed == ["user-1/ova-1_v1.zip", "user-1/ova-1_v2.zip", "user-1/ova-1_v3.zip"]
