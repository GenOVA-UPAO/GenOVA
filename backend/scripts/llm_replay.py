"""Arnés compartido de record/replay del pipeline de generación (llm.cassette).

Lo usan `scripts/record_llm_cassettes.py` (graba contra el proveedor real) y
`tests/test_resource_generation_replay.py` (reproduce sin red): los dos corren
EXACTAMENTE el mismo pipeline para que las claves de los prompts coincidan.

Pipeline por recurso: `generate_resource` real (texto→JSON con reintento, HTML,
validate_and_repair, refinado con sus rondas, runtime UPAO) + una pasada del
crítico (`critique_resource`). OVA completo: el grafo work-pool entero
(concierge → workers → collect → critic → repair → editor → assemble).

Todo el texto va a openrouter / deepseek/deepseek-v4-flash (primario y único
respaldo). Los medios NO se graban: sin imágenes (image_settings vacío), sin
video (tarea Video apagada) y el podcast queda en solo texto (sin TTS).
"""

from __future__ import annotations

import contextlib
import os
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from unittest import mock

BACKEND = Path(__file__).resolve().parent.parent
CASSETTE_DIR = BACKEND / "tests" / "fixtures" / "llm_cassettes"

CONCEPT = (
    "La fotosíntesis: cómo las plantas transforman la energía luminosa en energía "
    "química (fase luminosa y ciclo de Calvin), para estudiantes de primer ciclo universitario"
)
PROVIDER, MODEL = "openrouter", "deepseek/deepseek-v4-flash"
TASKS = ("texto", "codigo", "orquestador", "razonamiento")
PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")

# Nodos del grafo: refinado, crítico (1 pasada, sin reescritura) y editor encendidos.
NODE_FLAGS = {"ova_refine": "1", "ova_critic": "1", "ova_reflection_rounds": 0, "ova_editor": "1"}

# Presupuesto de reloj por recurso: holgado para grabar (el proveedor real tarda);
# no cambia ningún prompt, así que el replay coincide igual.
RESOURCE_BUDGET_S = 900.0

# OVA completo de los tests: recursos con cassette propio (reutilizados) + el editor.
OVA_RESOURCES = (("engage", 3), ("explain", 2), ("evaluate", 1))
OVA_CASSETTE = "ova_full.json"


def llm_config() -> dict:
    """Todas las tareas de texto a deepseek-v4-flash por OpenRouter."""
    entry = {"provider": PROVIDER, "model_id": MODEL}
    return {t: {**entry, "fallbacks": [dict(entry)]} for t in TASKS}


def all_resources() -> list[tuple[str, int]]:
    """Todos los (fase, tipo de recurso) del catálogo 5E (RECURSOS_META)."""
    from prometheus.plans.generate import _prompts

    return [(ph, n) for ph in PHASES for n in sorted(_prompts(ph).RECURSOS_META)]


def cassette_path(phase: str, rt: int, root: Path = CASSETTE_DIR) -> Path:
    return root / f"{phase}_{int(rt):02d}.json"


def _env_key(provider: str) -> str | None:
    """Solo la variable de entorno: nunca la BD (ni la clave guardada por un admin)."""
    from llm.providers import ENV_VARS

    return os.getenv(ENV_VARS.get(provider, ""), "").strip() or None


@contextlib.contextmanager
def offline_env() -> Iterator[None]:
    """Aísla el pipeline de la BD y de los medios: config admin vacía, nodos
    fijos, claves solo del entorno, sin TTS, sin video y sin tracing."""
    from core.config import settings

    patches = [
        mock.patch("llm.utils.llm_config_store.stored_cached", lambda: {}),
        mock.patch("prometheus.config.nodes_config.stored_cached", lambda: dict(NODE_FLAGS)),
        mock.patch("llm.router._get_provider_key", _env_key),
        mock.patch("llm.clients.clients._get_provider_key", _env_key),
        mock.patch("llm.clients.clients.get_user_keys", lambda _uid: {}),
        mock.patch("llm.podcast.podcast.podcast_audio", lambda _text: None),
        mock.patch.object(settings, "llm_fake", False),
        mock.patch.object(settings, "langsmith_tracing", False),
    ]
    with contextlib.ExitStack() as stack:
        for p in patches:
            stack.enter_context(p)
        yield


@dataclass
class ResourceRun:
    phase: str
    rt: int
    html: str
    defects: list[str]
    raw_json: object
    critic: dict
    seconds: float


def run_resource(phase: str, rt: int) -> ResourceRun:
    """Pipeline real de UN recurso (dentro de `offline_env` y un cassette activo)."""
    from prometheus.critic.critic import critique_resource
    from prometheus.plans.generate import generate_resource

    started = time.monotonic()
    cfg = llm_config()
    result = generate_resource(
        phase,
        rt,
        CONCEPT,
        llm_config=cfg,
        enabled_models=[],
        theme={},
        image_settings={},
        refine=True,
        deadline=started + RESOURCE_BUDGET_S,
    )
    critic = critique_resource(result.html, phase, rt, CONCEPT, cfg, [], {})
    return ResourceRun(
        phase,
        rt,
        result.html,
        list(result.defects),
        result.raw_json,
        critic,
        round(time.monotonic() - started, 1),
    )


def ova_state(resources=OVA_RESOURCES) -> dict:
    """Estado inicial del grafo con el plan sembrado (sin descomposición LLM)."""
    phases: dict[str, list[dict]] = {}
    for phase, rt in resources:
        phases.setdefault(phase, []).append(
            {"resource_type": rt, "resource_order": len(phases[phase]) + 1}
        )
    return {
        "prompt": CONCEPT,
        "upload_ids": [],
        "llm_config": llm_config(),
        "enabled_models": [],
        "theme": {},
        "image_settings": {},
        "resource_configs": {},
        "phases": phases,
        "phase_order": [p for p in PHASES if p in phases],
        "rag_context": "",
    }


def run_ova(resources=OVA_RESOURCES) -> dict:
    """Grafo work-pool completo (dentro de `offline_env` y un cassette activo)."""
    from prometheus.engine.workpool import build_workpool_graph

    graph = build_workpool_graph().compile()
    return graph.invoke(ova_state(resources), config={"max_concurrency": 4})
