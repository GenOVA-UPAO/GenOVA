"""El nivel elegido al crear va a su campo, no a la descripción visible (M10)."""

import uuid
from unittest.mock import MagicMock

import pytest

from core.text import split_education_level
from generation.jobs.jobs_service import create_job
from models import Ova


def test_separa_la_linea_de_nivel_del_final_del_prompt():
    prompt = "Derivadas como razón de cambio.\n\nNivel educativo: universitario (ciclos iniciales)."
    assert split_education_level(prompt) == (
        "Derivadas como razón de cambio.",
        "Universitario (ciclos iniciales)",
    )


@pytest.mark.parametrize(
    "prompt", ["Solo un tema", "Tema. Nivel educativo en el aula importa mucho", ""]
)
def test_sin_linea_de_nivel_no_cambia_nada(prompt):
    assert split_education_level(prompt) == (prompt, "")


def test_un_prompt_que_solo_trae_el_nivel_no_se_vacia():
    prompt = "Nivel educativo: posgrado."
    assert split_education_level(prompt) == (prompt, "")


def test_la_descripcion_queda_limpia_pero_el_job_conserva_el_nivel_para_el_motor():
    db = MagicMock()
    prompt = "La fotosíntesis.\n\nNivel educativo: secundaria."
    job = create_job(
        db,
        user_id=uuid.uuid4(),
        prompt=prompt,
        params={},
        resources=[{"phase_type": "engage", "phase_order": 1, "resource_type": "1"}],
    )
    ova = next(c.args[0] for c in db.add.call_args_list if isinstance(c.args[0], Ova))
    assert ova.description == "La fotosíntesis."
    assert ova.educational_level == "Secundaria"
    assert job.prompt == prompt  # el motor sigue recibiendo el nivel
