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
from ova.application.dto import SaveOvaInput
from ova.application.use_cases.save_ova import SaveOva
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


def test_guardar_ova_recorta_la_descripcion_y_conserva_el_prompt_de_la_version():
    repo = MagicMock()
    repo.create_ova.return_value = "ova-1"
    repo.create_version.return_value = "v-1"
    SaveOva(
        repo=repo,
        build_scorm_zip=lambda **_: b"PK",
        persist_scorm_zip=lambda *_: ("key", None),
    ).execute(
        SaveOvaInput(
            actor_id="u1", author="Ana", title="T", prompt=LONG_PROMPT, phases=(), upload_ids=()
        )
    )
    description = repo.create_ova.call_args.args[2]
    assert len(description) <= OVA_DESCRIPTION_MAX
    assert repo.create_version.call_args.args[2] == LONG_PROMPT
