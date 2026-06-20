"""Concierge node — BDI agent that decomposes the user prompt into intentions.

Implements the full Prometheus/BDI cycle (Rao & Georgeff):
  1. Perceive → read prompt, RAG context, model config
  2. form_beliefs  → build belief base from perception
  3. generate_desires → enumerate candidate resources
  4. deliberar (liberador BDI) → filter desires into committed intentions
  5. Convert intentions → execution plan (phases + phase_order)

Falls back to a deterministic plan (4 resources per phase) on any LLM failure;
the BDI cycle runs regardless so beliefs/desires/intentions are always populated.
"""

import logging

from llm.router import generar_texto
from llm.utils.utils import parse_json
from prometheus.engine.bdi import deliberar, form_beliefs, generate_desires
from prometheus.engine.state import OvaGenerationState

logger = logging.getLogger(__name__)

_PHASE_ORDER = ["engage", "explore", "explain", "elaborate", "evaluate"]

_FALLBACK_PLAN = {
    "engage": [1, 5, 7, 10],
    "explore": [1, 4, 7, 9],
    "explain": [2, 3, 6, 8],
    "elaborate": [1, 4, 7, 9],
    "evaluate": [1, 4, 6, 8],
}

_RESOURCE_CATALOG = """Engage: 1=Cómic,2=Storyboard,3=Micro-Podcast,4=JuegoGamificación,5=DilemaÉtico,6=NoticiaImpacto,7=JuegoRoles,8=Timeline,9=EscapeRoom,10=SimuladorIntuitivo
Explore: 1=SimuladorLab,2=AgenteSocrático,3=Drag&Drop,4=VideoPausaActiva,5=LecturaInteractiva,6=SimuladorSlider,7=ExperimentoGuiado,8=JuegoRoles,9=MapaMental,10=LabHipótesis
Explain: 1=VideoTeórico,2=LecturaGuiada,3=MapaConceptual,4=FAQ,5=DemoAnimada,6=GlosarioVisual,7=LíneaTiempo,8=DiagramaFramework,9=TablaComparativa,10=Infografía
Elaborate: 1=EstudioCaso,2=EjercicioGuiado,3=MiniProyecto,4=SimulaciónAplicada,5=AnálisisDatos,6=EscenarioRamificado,7=LabCódigo,8=MapaProblemas,9=JuegoEstrategia,10=RetoDiseño
Evaluate: 1=Quiz,2=RúbricaAutoeval,3=DesafíoContrarreloj,4=ExamenOpciónMúltiple,5=CompletarEspacios,6=RelacionarConceptos,7=Crucigrama,8=PreguntasDesarrollo,9=SimulaciónEval,10=DiplomaLogro"""


def concierge_node(state: OvaGenerationState) -> dict:
    prompt = state.get("prompt", "")
    rag_context = state.get("rag_context", "")
    enabled_models = state.get("enabled_models", [])
    upload_ids = state.get("upload_ids", [])

    # --- BDI: 1. Percibir → Creencias ---
    beliefs = form_beliefs(prompt, rag_context, enabled_models, upload_ids)

    if state.get("phases") and state.get("phase_order"):
        # Client seeded the plan — run BDI over it for traceability
        desires = generate_desires(state["phases"])
        intentions = deliberar(desires, beliefs)
        return {
            "beliefs": beliefs,
            "desires": desires,
            "intentions": intentions,
            "current_phase_idx": state.get("current_phase_idx", 0),
            "current_resource_idx": 0,
        }

    # --- BDI: 2. Deseos → Generar plan candidato ---
    raw_plan = _llm_decompose(prompt) or _FALLBACK_PLAN
    phases_data, phase_order, total = _plan_to_phases(raw_plan)

    # --- BDI: 3. Generar deseos desde el plan ---
    desires = generate_desires(phases_data)

    # --- BDI: 4. Deliberar → Intenciones (liberador BDI) ---
    intentions = deliberar(desires, beliefs)

    # Reconstruct phases preserving original order (deliberation only scores, not reorders phases)
    phases_data, phase_order, total = _intentions_to_phases(intentions)

    logger.info("Concierge BDI: %d intentions across %d phases", total, len(phase_order))
    return {
        "beliefs": beliefs,
        "desires": desires,
        "intentions": intentions,
        "phases": phases_data,
        "phase_order": phase_order,
        "current_phase_idx": 0,
        "current_resource_idx": 0,
        "total_resources": total,
        "progress": 0,
        "results": [],
        "errors": [],
    }


def _plan_to_phases(plan: dict) -> tuple[dict, list[str], int]:
    phase_order = [p for p in _PHASE_ORDER if p in plan and plan[p]]
    phases_data: dict = {}
    total = 0
    for p in phase_order:
        items = [{"resource_type": rt, "resource_order": i} for i, rt in enumerate(plan[p])]
        phases_data[p] = items
        total += len(items)
    return phases_data, phase_order, total


def _intentions_to_phases(intentions: list[dict]) -> tuple[dict, list[str], int]:
    """Rebuild phases dict from committed intentions, preserving 5E phase order."""
    phases_data: dict = {}
    for intent in intentions:
        phase = intent["phase"]
        phases_data.setdefault(phase, []).append(
            {"resource_type": intent["resource_type"], "resource_order": intent["resource_order"]}
        )
    # Sort items within each phase by resource_order
    for items in phases_data.values():
        items.sort(key=lambda x: x["resource_order"])
    phase_order = [p for p in _PHASE_ORDER if p in phases_data]
    total = sum(len(v) for v in phases_data.values())
    return phases_data, phase_order, total


def _llm_decompose(prompt: str) -> dict | None:
    sys_prompt = f"""[ROL] Orquestador pedagógico de OVAs (metodología constructivista 5E) para un curso universitario de Machine Learning.
[TAREA] Diseña la secuencia 5E para el concepto del usuario. Selecciona entre 2 y 4 recursos por fase (IDs numéricos del catálogo) que mejor enseñen ESE concepto concreto.

Catálogo de recursos disponibles:
{_RESOURCE_CATALOG}

Objetivo pedagógico de cada fase (elige recursos que lo cumplan):
- ENGAGE: despertar curiosidad y activar ideas previas, sin tecnicismos (cómic, juego, dilema, noticia, simulador intuitivo...).
- EXPLORE: que el estudiante manipule y descubra patrones antes de la teoría (lab, experimento, mapa mental, drag&drop...).
- EXPLAIN: formalizar la teoría con claridad (video, lectura guiada, FAQ, diagrama, infografía...).
- ELABORATE: aplicar a problemas reales y transferir (estudio de caso, mini-proyecto, simulación aplicada, reto...).
- EVALUATE: comprobar el logro del aprendizaje (quiz, examen, desafío, rúbrica, crucigrama...).

Reglas de selección:
- Fidelidad: cada recurso debe encajar con la naturaleza del concepto (no genérico).
- Variedad: NO repitas el mismo ID dentro de una fase; mezcla formatos (interactivo + lectura).
- Progresión: ordena los IDs de cada fase de menor a mayor exigencia cognitiva.

[SALIDA] JSON puro sin markdown: {{"engage": [ids], "explore": [ids], "explain": [ids], "elaborate": [ids], "evaluate": [ids]}}"""

    full = f"{sys_prompt}\n\nConcepto del usuario: {prompt}"
    try:
        raw = generar_texto(full, "orquestador", max_tokens=800)
        data = parse_json(raw)
        if not isinstance(data, dict):
            return None
        plan = {}
        for phase in _PHASE_ORDER:
            ids = data.get(phase, [])
            if isinstance(ids, list):
                valid = [
                    int(i)
                    for i in ids
                    if isinstance(i, (int, str)) and str(i).isdigit() and 1 <= int(i) <= 10
                ]
                plan[phase] = list(dict.fromkeys(valid))[:4]  # dedup, keep order
            else:
                plan[phase] = []
        return plan
    except Exception:
        logger.warning("LLM concierge failed, using fallback plan")
        return None
