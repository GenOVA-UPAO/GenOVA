"""LLM_FAKE=1 — generación determinista sin proveedores LLM (CI, e2e, carga).

Sustituye a ``invoke_ova_generation`` cuando ``settings.llm_fake`` está activo:
lee los OvaJobResource del job y devuelve HTML fijo por recurso, con la misma
forma de estado final (``results``/``errors``) que produce el grafo real, para
que ``_persist_results`` materialice el job como ``done`` en segundos.

``generate_resource`` (POST /api/agents/*/generate) reutiliza ``stub_resource_html``
vía ``fake_standalone_html`` para devolver el mismo contrato con runtime inyectado.
Nunca activar en producción.

El RAG sí corre en modo fake: recuperar fragmentos no es una llamada al LLM, así
que el fake ejecuta la misma recuperación que el concierge y cada recurso lleva
un resumen del contexto recibido (``data-llm-fake-rag``). Así se puede comprobar
de punta a punta, sin clave de LLM, que el material subido llega hasta el punto
donde se construye el prompt de cada recurso. Que además entra en el texto del
prompt lo cubren los tests con un LLM que captura los prompts
(tests/test_rag_prompt_flow.py).
"""

import html as html_lib
import re
import uuid

from sqlalchemy import select


def fake_invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None) -> dict:
    from core.database import SessionLocal
    from models import OvaJobResource

    only_ids = initial_state.get("only_resource_ids")
    concept = (initial_state.get("prompt") or "").strip() or "OVA"
    contexto = _fake_rag_context(initial_state, concept)
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
                    "html": stub_resource_html(
                        concept, res.phase_type, res.resource_type, contexto
                    ),
                    "resource_type": res.resource_type,
                    "title": res.resource_type,
                }
            )
        return {"results": results, "errors": []}
    finally:
        db.close()


def _fake_rag_context(initial_state: dict, concept: str) -> str:
    """Mismo contexto que el concierge recupera (y persiste) en el motor real."""
    from prometheus.engine.runtime import _persist_rag_context
    from prometheus.nodes.concierge import _retrieve_rag_context

    contexto = initial_state.get("rag_context") or _retrieve_rag_context(
        concept, initial_state.get("upload_ids") or []
    )
    if contexto:
        _persist_rag_context(initial_state.get("job_id"), contexto)
    return contexto


_FIRST_SNIPPET = re.compile(r"\[Fuente: [^\]]+\]\n(.+?)(?:\n---\n|\n<<<FIN_MATERIAL>>>|$)", re.S)


def fake_rag_summary(contexto: str) -> str:
    """Bloque HTML con lo que el recurso recibió del RAG ("" si nada)."""
    if not contexto or not contexto.strip():
        return ""
    from rag import sources_in_context

    sources = sources_in_context(contexto)
    total = sum(s["chunks"] for s in sources)
    files = ", ".join(f"{s['filename']} ({s['chunks']})" for s in sources)
    match = _FIRST_SNIPPET.search(contexto)
    snippet = " ".join(match.group(1).split())[:280] if match else ""
    return (
        '<section data-llm-fake-rag="1">'
        "<h2>Material de referencia recibido (LLM_FAKE)</h2>"
        f"<p>{total} fragmento{'s' if total != 1 else ''} de: {html_lib.escape(files)}</p>"
        f"<blockquote>{html_lib.escape(snippet)}</blockquote>"
        "</section>"
    )


def stub_resource_html(
    concept: str, phase: str, resource_type: str | int, contexto: str = ""
) -> str:
    """HTML autorado determinista (sin runtime). Lo reutilizan batch y HTTP."""
    return (
        "<html><body>"
        f"<h1>{concept}</h1>"
        f"<p>Recurso de prueba ({phase} / {resource_type}) generado con LLM_FAKE=1.</p>"
        f"{fake_rag_summary(contexto)}"
        "</body></html>"
    )


def fake_standalone_html(
    concept: str, phase: str, resource_type: str | int, contexto: str = ""
) -> str:
    """Mismo stub con runtime UPAO, equivalente a ``generate_resource`` real."""
    from llm.utils.ova_runtime import inject_runtime

    authored = stub_resource_html(concept, phase, resource_type, contexto)
    return inject_runtime(authored, css=True, components=True)


def fake_edited_html(base_html: str, instruction: str, contexto: str = "") -> str:
    """Edición determinista del chat del editor: el HTML actual más una nota con
    el cambio pedido y el material recibido. Sin esto, con LLM_FAKE=1 la edición
    llamaba al LLM real, fallaba sin clave y el recurso quedaba igual."""
    note = (
        '<aside data-llm-fake-edit="1">'
        f"<p>Cambio aplicado con LLM_FAKE=1: {html_lib.escape(instruction.strip())}</p>"
        f"{fake_rag_summary(contexto)}"
        "</aside>"
    )
    if "</body>" in base_html:
        head, _, tail = base_html.rpartition("</body>")
        return f"{head}{note}</body>{tail}"
    return base_html + note
