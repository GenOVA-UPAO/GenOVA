"""El mapa de errores solo expone el mensaje público fijado por el dominio."""

import json

import pytest

from generation.domain.errors import (
    GenerationError,
    JobNotFound,
    PromptOffTopic,
    ResourceNotReady,
)
from generation.interface.http.error_map import generation_error_to_response


@pytest.mark.parametrize(
    ("err", "status", "code", "message"),
    [
        (JobNotFound(), 404, "job_not_found", "Job no encontrado."),
        (
            JobNotFound("No hay generación para este OVA."),
            404,
            "job_not_found",
            "No hay generación para este OVA.",
        ),
        (ResourceNotReady(), 409, "resource_not_ready", "El recurso aún no está listo."),
        (
            PromptOffTopic("Fuera de tema: química"),
            400,
            "prompt_off_topic",
            "Fuera de tema: química",
        ),
        (GenerationError("x"), 400, "generation_error", "x"),
    ],
)
def test_response_uses_public_message(err, status, code, message):
    response = generation_error_to_response(err)
    assert response.status_code == status
    assert json.loads(response.body) == {"error": code, "message": message}


def test_public_message_is_not_the_traceback():
    try:
        raise JobNotFound()
    except GenerationError as err:
        body = generation_error_to_response(err).body.decode()
    assert "Traceback" not in body and 'File "' not in body
