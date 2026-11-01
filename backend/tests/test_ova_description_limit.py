"""La descripción que nace del prompt cabe en la edición de metadatos.

El prompt admite 4000 caracteres pero la descripción editable, 2000: un OVA
creado con un prompt largo no dejaba guardar ni siquiera un cambio de título.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

from core.text import OVA_DESCRIPTION_MAX, ova_description
from generation.jobs.jobs_materialize import _build_ova
from generation.jobs.jobs_service import create_job
from models import Ova
from ova.interface.http._shared import UpdateOvaMetadataRequest

LONG_PROMPT = ("Fotosíntesis en plantas C4 y CAM con ejemplos de campo. " * 60).strip()


def _added_ova(db: MagicMock) -> Ova:
    return next(c.args[0] for c in db.add.call_args_list if isinstance(c.args[0], Ova))


def test_descripcion_corta_queda_igual():
    assert ova_description("Ley de Ohm.") == "Ley de Ohm."


def test_create_job_recorta_la_descripcion_y_conserva_el_prompt():
    assert len(LONG_PROMPT) > OVA_DESCRIPTION_MAX
    db = MagicMock()
    job = create_job(
        db,
        user_id=uuid.uuid4(),
        prompt=LONG_PROMPT,
        params={},
        resources=[{"phase_type": "engage", "phase_order": 1, "resource_type": "1"}],
    )
    ova = _added_ova(db)
    assert len(ova.description) <= OVA_DESCRIPTION_MAX
    assert job.prompt == LONG_PROMPT  # el motor sigue recibiendo el prompt entero
    # Guardar solo un título nuevo reenvía la descripción tal cual: debe validar.
    UpdateOvaMetadataRequest(title="Otro título", description=ova.description)


def test_materializar_sin_ova_previo_recorta_la_descripcion():
    db = MagicMock()
    job = SimpleNamespace(prompt=LONG_PROMPT, user_id=uuid.uuid4(), ova_id=None, params={})
    _build_ova(db, job, [])
    assert len(_added_ova(db).description) <= OVA_DESCRIPTION_MAX
