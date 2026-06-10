"""Concierge node — decomposes the user prompt into per-phase resource goals.

Uses the LLM 'orquestador' task to analyze the prompt and select which of the
50 available resource types to generate for each 5E phase. Falls back to a
deterministic plan (4 resources per phase) on any LLM failure.
"""

import json
import logging

from llm.router import generar_texto
from prometheus.state import OvaGenerationState

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
    if state.get("phases") and state.get("phase_order"):
        return {"current_phase_idx": state.get("current_phase_idx", 0), "current_resource_idx": 0}

    plan = _llm_decompose(prompt) or _FALLBACK_PLAN

    phase_order = [p for p in _PHASE_ORDER if p in plan and plan[p]]
    phases_data = {}
    total = 0
    for p in phase_order:
        items = []
        for order, rt in enumerate(plan[p]):
            items.append({"resource_type": rt, "resource_order": order})
        phases_data[p] = items
        total += len(items)

    logger.info("Concierge plan: %d resources across %d phases", total, len(phase_order))
    return {
        "phases": phases_data,
        "phase_order": phase_order,
        "current_phase_idx": 0,
        "current_resource_idx": 0,
        "total_resources": total,
        "progress": 0,
        "results": [],
        "errors": [],
    }


def _llm_decompose(prompt: str) -> dict | None:
    sys_prompt = f"""[ROL] Orquestador de generación de OVAs educativos (metodología 5E).
[TAREA] Analiza el prompt del usuario y selecciona entre 2 y 4 recursos por fase 5E que mejor se adapten al tema, nivel y énfasis solicitado. Elige los IDs numéricos.

Catálogo de recursos disponibles:
{_RESOURCE_CATALOG}

Reglas:
- ENGAGE: recursos que enganchen al estudiante (cómic, juego, dilema, simulador...)
- EXPLORE: recursos de exploración profunda (lab, experimento, mapa mental...)
- EXPLAIN: recursos que expliquen teoría (video, lectura, FAQ, diagrama...)
- ELABORATE: recursos de aplicación práctica (estudio de caso, proyecto, simulación...)
- EVALUATE: recursos de evaluación (quiz, examen, desafío, rúbrica...)

[SALIDA] JSON puro sin markdown: {{"engage": [ids], "explore": [ids], "explain": [ids], "elaborate": [ids], "evaluate": [ids]}}"""

    full = f"{sys_prompt}\n\nPrompt del usuario: {prompt}"
    try:
        raw = generar_texto(full, "orquestador", max_tokens=800)
        data = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
        plan = {}
        for phase in _PHASE_ORDER:
            ids = data.get(phase, [])
            if isinstance(ids, list):
                valid = [
                    int(i)
                    for i in ids
                    if isinstance(i, (int, str)) and str(i).isdigit() and 1 <= int(i) <= 10
                ]
                plan[phase] = valid[:4]
            else:
                plan[phase] = []
        return plan
    except Exception:
        logger.warning("LLM concierge failed, using fallback plan")
        return None
