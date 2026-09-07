"""Reglas puras: no marcar `done` un recurso que no pasa el validador."""

from generation.domain.resource_outcome import (
    CONTENT_READY_STATUSES,
    RESOURCE_DEGRADED,
    defect_reason,
    is_content_ready,
    persist_status,
)


def test_html_sano_es_done():
    assert persist_status(html="<html>ok</html>", defects=[]) == "done"


def test_html_con_defectos_es_degraded_no_done():
    assert persist_status(html="<html>cascarón</html>", defects=["contenido escaso"]) == (
        RESOURCE_DEGRADED
    )


def test_sin_html_es_error():
    assert persist_status(html=None, defects=["contenido escaso"]) == "error"
    assert persist_status(html="", defects=[]) == "error"


def test_defect_reason_concatena_y_omite_vacios():
    assert defect_reason(["contenido escaso", " sin _scormComplete() "]) == (
        "contenido escaso; sin _scormComplete()"
    )
    assert defect_reason([]) is None
    assert defect_reason(None) is None


def test_contenido_degraded_es_consultable():
    assert is_content_ready("degraded", "<html>x</html>")
    assert is_content_ready("done", "<html>x</html>")
    assert not is_content_ready("degraded", "")
    assert not is_content_ready("error", "<html>x</html>")
    assert not is_content_ready("pending", "<html>x</html>")
    assert "degraded" in CONTENT_READY_STATUSES


def test_degraded_es_reanudable_y_done_no():
    from generation.jobs.jobs_service import _RESUMABLE_RESOURCE_STATUSES

    assert "degraded" in _RESUMABLE_RESOURCE_STATUSES
    assert "error" in _RESUMABLE_RESOURCE_STATUSES
    assert "pending" in _RESUMABLE_RESOURCE_STATUSES
    assert "done" not in _RESUMABLE_RESOURCE_STATUSES
