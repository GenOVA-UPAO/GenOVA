"""Reanudar un job es un claim atómico: dos «Reintentar» a la vez lanzan un run.

Antes ResumeJob solo rechazaba `running` según lo leído y luego ponía `running`
sin condición: un doble clic o dos pestañas lanzaban dos runs del mismo job
(doble coste LLM y recursos duplicados en el OVA). También aceptaba un job
`queued`, cuya entrada de arq sigue en Redis. SQLite en memoria.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from generation.application.dto import ResumeJobInput  # noqa: E402
from generation.application.use_cases.resume_job import ResumeJob  # noqa: E402
from generation.domain.errors import JobAlreadyRunning  # noqa: E402
from generation.infrastructure.sqlalchemy_job_repository import (  # noqa: E402
    SqlAlchemyJobRepository,
)
from generation.jobs.jobs_service import mark_job_resuming  # noqa: E402
from models import Ova, OvaJob, OvaJobResource  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402


class _LauncherEspia:
    def __init__(self) -> None:
        self.lanzados: list[tuple[uuid.UUID, list[uuid.UUID] | None]] = []

    def launch(self, job_id, only=None) -> None:
        self.lanzados.append((job_id, only))


class _RepoLeidoAntes(SqlAlchemyJobRepository):
    """Petición que leyó el job antes de que la otra lo reclamase."""

    def __init__(self, db, leido) -> None:
        super().__init__(db)
        self._leido = leido

    def get_owned(self, job_id, user_id):
        return self._leido


@pytest.fixture
def sesiones():
    a = make_session(Ova.__table__, OvaJob.__table__, OvaJobResource.__table__)
    b = sessionmaker(bind=a.bind)()
    yield a, b
    b.close()
    a.close()


def _job(db, status="interrupted") -> OvaJob:
    job = OvaJob(id=uuid.uuid4(), user_id=uuid.uuid4(), status=status, prompt="p", params={})
    db.add(job)
    db.add(
        OvaJobResource(
            id=uuid.uuid4(),
            job_id=job.id,
            phase_type="explore",
            phase_order=2,
            resource_type="5",
            resource_order=0,
            status="error",
        )
    )
    db.commit()
    return job


def test_dos_reanudaciones_simultaneas_lanzan_un_solo_run(sesiones):
    a, b = sesiones
    job = _job(a)
    launcher = _LauncherEspia()
    datos = ResumeJobInput(job_id=job.id, user_id=job.user_id)
    # Las dos peticiones leen el job `interrupted` antes de que ninguna lo reclame.
    leido = SqlAlchemyJobRepository(b).get_owned(job.id, job.user_id)
    primera = ResumeJob(SqlAlchemyJobRepository(a), launcher)
    segunda = ResumeJob(_RepoLeidoAntes(b, leido), launcher)

    assert primera.execute(datos).accepted is True
    with pytest.raises(JobAlreadyRunning):
        segunda.execute(datos)

    assert len(launcher.lanzados) == 1


def test_el_claim_falla_si_otro_ya_lo_reclamo(sesiones):
    a, b = sesiones
    job = _job(a)
    copia_vieja = b.get(OvaJob, job.id)

    assert mark_job_resuming(a, job) is True
    assert mark_job_resuming(b, copia_vieja) is False


def test_no_se_reanuda_un_job_que_sigue_en_cola(sesiones):
    a, _ = sesiones
    job = _job(a, status="queued")
    launcher = _LauncherEspia()

    with pytest.raises(JobAlreadyRunning):
        ResumeJob(SqlAlchemyJobRepository(a), launcher).execute(
            ResumeJobInput(job_id=job.id, user_id=job.user_id)
        )
    assert launcher.lanzados == []
