"""Estado compartido entre procesos en Postgres (migración 042).

Subidas temporales, ventana deslizante de «Probar un modelo», reclamo de videos
tardíos y tickets del login con 2FA. Dos «procesos» se simulan con dos
instancias (cada `LateVideoClaims` tiene su propio dueño); lo que comparten es
la base de datos, igual que dos workers de uvicorn.

Solo corre con un Postgres alcanzable en DATABASE_URL y la migración 042
aplicada; si no, se salta (sin red: nada sale de la máquina).
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
            return (
                conn.execute(text("SELECT to_regclass('late_video_claims')")).scalar() is not None
            )
    except Exception:  # noqa: BLE001 — sin Postgres: se salta
        return False


pytestmark = pytest.mark.skipif(not _pg_ready(), reason="requiere Postgres con la migración 042")


@pytest.fixture
def user_id():
    uid = uuid.uuid4()
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO users (id, email, password_hash) VALUES (:id, :e, 'x')"),
            {"id": uid, "e": f"shared-state-{uid.hex[:12]}@test.local"},
        )
    yield str(uid)
    with engine.begin() as conn:  # CASCADE: subidas y tickets del usuario
        conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": uid})


# ── Subidas temporales ─────────────────────────────────────────────────────────


def test_una_subida_la_ve_cualquier_proceso(user_id, tmp_path, monkeypatch):
    from uploads.infrastructure.sql_temp_upload_repository import SqlTempUploadRepository

    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    web_a, web_b = SqlTempUploadRepository(), SqlTempUploadRepository()
    up = web_a.create(user_id, "apunte.pdf", "application/pdf", b"%PDF-1.4")
    web_a.set_rag_status(up.upload_id, {"status": "processing", "chunks": 0})

    # El otro proceso la lista y ve el estado que escribe quien indexa.
    (seen,) = web_b.list_active(user_id)
    assert seen.upload_id == up.upload_id and seen.rag_status["status"] == "processing"
    web_b.set_rag_status(up.upload_id, {"status": "indexed", "chunks": 3})
    assert web_a.get(up.upload_id, user_id).rag_status == {"status": "indexed", "chunks": 3}
    assert web_a.get_storage_path(up.upload_id, user_id).endswith("apunte.pdf")
    assert web_a.count_active(user_id) == 1

    # Reclamada al crear el OVA: sale de la lista, sigue siendo del usuario.
    ova = str(uuid.uuid4())
    (claimed,) = web_b.claim(user_id, [up.upload_id, "no-es-uuid"], ova)
    assert claimed.ova_id == ova and claimed.confirmed_at is not None
    assert web_a.list_active(user_id) == [] and web_a.get(up.upload_id, user_id) is not None
    assert web_a.claim(str(uuid.uuid4()), [up.upload_id], ova) == []  # ajena

    assert web_a.delete(up.upload_id, user_id) is True
    assert web_b.delete(up.upload_id, user_id) is False
    assert not (tmp_path / user_id / f"{up.upload_id}_apunte.pdf").exists()


def test_cada_lista_es_de_su_contexto_y_caduca(user_id, tmp_path, monkeypatch):
    from uploads.infrastructure import sql_temp_upload_repository as sql

    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    repo = sql.SqlTempUploadRepository()
    ova = str(uuid.uuid4())
    crear = repo.create(user_id, "a.pdf", "application/pdf", b"%PDF")
    chat = repo.create(user_id, "b.pdf", "application/pdf", b"%PDF", ova_id=ova)
    assert [u.upload_id for u in repo.list_active(user_id)] == [crear.upload_id]
    assert [u.upload_id for u in repo.list_active(user_id, ova)] == [chat.upload_id]

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE temp_uploads SET expires_at = now() - interval '1 second' WHERE upload_id = :id"
            ),
            {"id": crear.upload_id},
        )
    assert repo.get(crear.upload_id, user_id) is None
    assert repo.count_active(user_id) == 0  # purga la fila y el archivo
    assert not (tmp_path / user_id / f"{crear.upload_id}_a.pdf").exists()


# ── Ventana deslizante compartida ──────────────────────────────────────────────


def test_el_limite_de_probar_se_comparte_entre_procesos():
    from core.shared_throttle import PostgresWindow

    bucket, who = f"test-{uuid.uuid4().hex[:8]}", "persona-1"
    proceso_a, proceso_b = PostgresWindow(), PostgresWindow()
    try:
        assert proceso_a.hit(bucket, who, 3, 60) == 0
        assert proceso_b.hit(bucket, who, 3, 60) == 0
        assert proceso_a.hit(bucket, who, 3, 60) == 0
        wait = proceso_b.hit(bucket, who, 3, 60)
        assert 1 <= wait <= 61
        assert proceso_a.hit(bucket, "persona-2", 3, 60) == 0  # por persona
    finally:
        proceso_a.reset(bucket)
    assert proceso_b.hit(bucket, who, 3, 60) == 0
    proceso_b.reset(bucket)


# ── Reclamo de videos tardíos ──────────────────────────────────────────────────


def test_solo_un_proceso_espera_cada_video():
    from generation.infrastructure.late_video_claims import LateVideoClaims

    job = f"test-job-{uuid.uuid4().hex[:10]}"
    web, worker = LateVideoClaims(), LateVideoClaims()
    try:
        assert web.acquire(job) is True
        assert worker.acquire(job) is False
        assert web.acquire(job) is True  # el propio dueño puede repetir
        assert job in worker.held_elsewhere([job])
        assert web.held_elsewhere([job]) == {}

        # Terminado: sigue bloqueado un rato (no re-descargar lo ya entregado).
        web.release(job)
        assert worker.acquire(job) is False

        # Caducado (proceso muerto o espera ya cerrada): otro lo toma.
        with engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE late_video_claims SET expires_at = now() - interval '1 second' WHERE job_id = :j"
                ),
                {"j": job},
            )
        assert worker.acquire(job) is True
        assert web.acquire(job) is False
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM late_video_claims WHERE job_id = :j"), {"j": job})


# ── Tickets del login con 2FA ──────────────────────────────────────────────────


def test_el_ticket_2fa_sirve_en_cualquier_proceso_y_una_sola_vez(user_id):
    from auth.infrastructure import totp_tickets

    ticket = totp_tickets._issue_ticket(user_id, remember_me=True)
    assert ticket not in totp_tickets._TOTP_TICKETS  # no en memoria: en la BD
    with engine.connect() as conn:
        stored = conn.execute(
            text("SELECT ticket_hash FROM totp_login_tickets WHERE user_id = :u"), {"u": user_id}
        ).scalar()
    assert stored and stored != ticket  # solo el hash
    assert totp_tickets._consume_ticket(ticket) == (user_id, True)
    assert totp_tickets._consume_ticket(ticket) is None
