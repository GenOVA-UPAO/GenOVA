"""LLM_FAKE=1 — generación determinista sin proveedores LLM (CI, e2e, carga).

Sustituye a ``invoke_ova_generation`` cuando ``settings.llm_fake`` está activo:
lee los OvaJobResource del job y devuelve HTML fijo por recurso, con la misma
forma de estado final (``results``/``errors``) que produce el grafo real, para
que ``_persist_results`` materialice el job como ``done`` en segundos.
Nunca activar en producción.
"""

import uuid

from sqlalchemy import select


def fake_invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None) -> dict:
    from core.database import SessionLocal
    from models import OvaJobResource

    only_ids = initial_state.get("only_resource_ids")
    concept = (initial_state.get("prompt") or "").strip() or "OVA"
    db = SessionLocal()
    try:
        resources = (
            db.execute(select(OvaJobResource).where(OvaJobResource.job_id == uuid.UUID(thread_id)))
            .scalars()
            .all()
        )
        results = []
        for res in resources:
            if only_ids is not None and str(res.id) not in only_ids:
                continue
            results.append(
                {
                    "phase": res.phase_type,
                    "html": _stub_html(concept, res.phase_type, res.resource_type),
                    "resource_type": res.resource_type,
                    "title": res.resource_type,
                }
            )
        return {"results": results, "errors": []}
    finally:
        db.close()


def _stub_html(concept: str, phase: str, resource_type: str) -> str:
    return (
        "<html><body>"
        f"<h1>{concept}</h1>"
        f"<p>Recurso de prueba ({phase} / {resource_type}) generado con LLM_FAKE=1.</p>"
        "</body></html>"
    )
