"""Regeneraciones compartidas entre procesos en Postgres (migración 044).

Como test_shared_state_pg.py: dos «procesos» son dos valores de `OWNER` sobre la
misma base de datos, igual que dos workers de uvicorn. Aquí se prueba con el
reloj y el SQL reales de Postgres (now(), RETURNING, el UPDATE con NOT EXISTS
correlacionado). Solo corre con un Postgres alcanzable en DATABASE_URL y la
migración 044 aplicada; si no, se salta. La recuperación se acota a su OVA:
la base puede ser la de QA compartida y no debe tocar OVAs ajenos.
"""

import os
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

from sqlalchemy import text  # noqa: E402

from core.database import engine  # noqa: E402


def _pg_ready() -> bool:
    if engine.dialect.name != "postgresql":
        return False
    try:
        with engine.connect() as conn:
            return conn.execute(text("SELECT to_regclass('regen_jobs')")).scalar() is not None
    except Exception:  # noqa: BLE001 — sin Postgres: se salta
        return False


pytestmark = pytest.mark.skipif(not _pg_ready(), reason="requiere Postgres con la migración 044")

OTHER = "otra-maquina:4242:deadbeef"


@pytest.fixture
def ova_id():
    uid, oid, vid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO users (id, email, password_hash) VALUES (:id, :e, 'x')"),
            {"id": uid, "e": f"regen-state-{uid.hex[:12]}@test.local"},
        )
        conn.execute(
            text("INSERT INTO ovas (id, user_id, title, status) VALUES (:o, :u, 'Ohm', 'listo')"),
            {"o": oid, "u": uid},
        )
        conn.execute(
            text(
                "INSERT INTO ova_versions (id, ova_id, version_number, prompt)"
                " VALUES (:v, :o, 1, 'Ohm')"
            ),
            {"v": vid, "o": oid},
        )
        conn.execute(
            text("UPDATE ovas SET current_version_id = :v WHERE id = :o"), {"v": vid, "o": oid}
        )
    yield oid
    with engine.begin() as conn:  # CASCADE: OVA, versiones y regeneraciones
        conn.execute(text("DELETE FROM ovas WHERE id = :o"), {"o": oid})
        conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": uid})


def _start(oid) -> str:
    from core.database import SessionLocal
    from generation.regen import regen_jobs
    from models import Ova

    db = SessionLocal()
    try:
        return regen_jobs.start_regen(db, db.get(Ova, oid), "Ohm", [], 1, lambda *_: None)
    finally:
        db.close()


def _status(oid) -> str:
    with engine.connect() as conn:
        return conn.execute(text("SELECT status FROM ovas WHERE id = :o"), {"o": oid}).scalar()


def _age_heartbeat(job_id: str, seconds: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE regen_jobs SET heartbeat_at = now() - make_interval(secs => :s)"
                " WHERE id = :j"
            ),
            {"s": seconds, "j": uuid.UUID(job_id)},
        )


def test_otro_proceso_ve_el_progreso_y_no_libera_una_regeneracion_viva(ova_id, monkeypatch):
    from generation.regen import regen_jobs

    job_id = _start(ova_id)
    assert regen_jobs.claim_regen(job_id)["ova_id"] == ova_id  # «proceso A» la ejecuta

    monkeypatch.setattr(regen_jobs, "OWNER", OTHER)  # «proceso B» arranca y sondea
    assert regen_jobs.recover_orphan_regen(ova_id=ova_id) == 0
    assert _status(ova_id) == "generando"
    assert regen_jobs.regen_progress_dto(job_id, str(ova_id))["status"] == "generating"
    assert regen_jobs.claim_regen(job_id) is None


def test_al_caducar_el_latido_se_interrumpe_y_se_libera(ova_id, monkeypatch):
    from generation.regen import regen_jobs

    job_id = _start(ova_id)
    regen_jobs.claim_regen(job_id)
    _age_heartbeat(job_id, regen_jobs.TTL_S + 30)  # «proceso A» murió (kill -9)

    monkeypatch.setattr(regen_jobs, "OWNER", OTHER)
    assert regen_jobs.recover_orphan_regen(ova_id=ova_id) == 1
    assert _status(ova_id) == "listo"
    dto = regen_jobs.regen_progress_dto(job_id, str(ova_id))
    assert dto["status"] == "error" and dto["percentage"] == 100
