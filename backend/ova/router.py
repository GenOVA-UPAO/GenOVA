import logging
import os
import threading
import time
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from models import User
from ova.uploads_service import claim_user_uploads, max_files_per_request


router = APIRouter()
logger = logging.getLogger(__name__)

LLM_CATALOG = [
    {
        "id": "openai",
        "label": "OpenAI",
        "provider": "OpenAI",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "gemini",
        "label": "Gemini",
        "provider": "Google",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "claude",
        "label": "Claude",
        "provider": "Anthropic",
        "quality_tier": "high",
        "cost_tier": "high",
    },
]

PROGRESS_STAGES = [
    (5, "Validando solicitud"),
    (20, "Preparando contexto educativo"),
    (45, "Generando contenido base"),
    (70, "Estructurando actividades"),
    (90, "Ajustando evaluación"),
    (100, "Finalizando OVA"),
]

OVA_MOCK_CONTENT = {
    "phases": [
        {
            "id": "enganche",
            "label": "Enganche",
            "order": 1,
            "sections": [
                {"type": "heading", "content": "¿Por qué importa este tema?"},
                {
                    "type": "paragraph",
                    "content": (
                        "Los árboles de decisión son uno de los algoritmos más intuitivos del "
                        "aprendizaje automático. Permiten visualizar cómo una máquina toma "
                        "decisiones basándose en características de los datos."
                    ),
                },
                {
                    "type": "list",
                    "ordered": False,
                    "items": [
                        "Comprenderás la intuición detrás de los árboles de decisión",
                        "Verás cómo se aplican en problemas reales de clasificación",
                        "Explorarás sus ventajas y limitaciones frente a otros algoritmos",
                    ],
                },
                {
                    "type": "paragraph",
                    "content": (
                        "Reflexiona: ¿cómo tomarías la decisión de aprobar o rechazar un crédito "
                        "bancario basándote en datos del solicitante?"
                    ),
                },
            ],
        },
        {
            "id": "exploracion",
            "label": "Exploración",
            "order": 2,
            "sections": [
                {"type": "heading", "content": "Descubriendo el algoritmo"},
                {
                    "type": "paragraph",
                    "content": (
                        "Antes de ver el código, explora cómo un árbol divide el espacio de datos. "
                        "Cada nodo representa una pregunta sobre una característica; cada rama, "
                        "una respuesta posible."
                    ),
                },
                {
                    "type": "code",
                    "language": "python",
                    "content": (
                        "import pandas as pd\n"
                        "from sklearn.datasets import load_iris\n\n"
                        "iris = load_iris(as_frame=True)\n"
                        "df = iris.frame\n"
                        "print(df.head())\n"
                        "print(df['target'].value_counts())"
                    ),
                },
                {
                    "type": "paragraph",
                    "content": (
                        "Actividad: Carga el dataset Iris e identifica cuántas clases hay y qué "
                        "características lo definen. ¿Qué columna crees que es más útil para "
                        "separar las clases?"
                    ),
                },
            ],
        },
        {
            "id": "explicacion",
            "label": "Explicación",
            "order": 3,
            "sections": [
                {"type": "heading", "content": "Conceptos fundamentales"},
                {
                    "type": "paragraph",
                    "content": (
                        "Un árbol de decisión divide recursivamente el conjunto de entrenamiento "
                        "usando la característica que maximiza la ganancia de información o "
                        "minimiza la impureza Gini."
                    ),
                },
                {
                    "type": "list",
                    "ordered": True,
                    "items": [
                        "Impureza Gini: mide la probabilidad de clasificar incorrectamente un ejemplo al azar.",
                        "Ganancia de información: diferencia de entropía antes y después de una división.",
                        "Poda (Pruning): técnica para evitar sobreajuste limitando la profundidad del árbol.",
                        "Criterio de parada: profundidad máxima, mínimo de muestras por hoja, etc.",
                    ],
                },
                {
                    "type": "code",
                    "language": "python",
                    "content": (
                        "from sklearn.tree import DecisionTreeClassifier\n"
                        "from sklearn.model_selection import train_test_split\n"
                        "from sklearn.metrics import accuracy_score\n\n"
                        "X, y = iris.data, iris.target\n"
                        "X_train, X_test, y_train, y_test = train_test_split(\n"
                        "    X, y, test_size=0.2, random_state=42\n"
                        ")\n\n"
                        "clf = DecisionTreeClassifier(max_depth=3, criterion='gini')\n"
                        "clf.fit(X_train, y_train)\n"
                        "print(f'Accuracy: {accuracy_score(y_test, clf.predict(X_test)):.2%}')"
                    ),
                },
                {
                    "type": "paragraph",
                    "content": (
                        "El parámetro max_depth=3 limita la profundidad del árbol, controlando "
                        "la complejidad del modelo y previniendo el sobreajuste."
                    ),
                },
            ],
        },
        {
            "id": "elaboracion",
            "label": "Elaboración",
            "order": 4,
            "sections": [
                {"type": "heading", "content": "Aplicando el conocimiento"},
                {
                    "type": "paragraph",
                    "content": (
                        "Es momento de poner en práctica lo aprendido. Realiza los siguientes "
                        "ejercicios para profundizar tu comprensión."
                    ),
                },
                {
                    "type": "list",
                    "ordered": True,
                    "items": [
                        "Experimenta con diferentes valores de max_depth (1, 3, 5, 10) y compara el accuracy en train vs test.",
                        "Cambia el criterio de 'gini' a 'entropy'. ¿Cambia el resultado?",
                        "Visualiza el árbol usando sklearn.tree.plot_tree e interpreta sus decisiones.",
                        "Prueba con el dataset breast_cancer de sklearn y reporta los resultados.",
                    ],
                },
                {
                    "type": "code",
                    "language": "python",
                    "content": (
                        "import matplotlib.pyplot as plt\n"
                        "from sklearn.tree import plot_tree\n\n"
                        "fig, ax = plt.subplots(figsize=(12, 6))\n"
                        "plot_tree(\n"
                        "    clf,\n"
                        "    feature_names=iris.feature_names,\n"
                        "    class_names=iris.target_names,\n"
                        "    filled=True,\n"
                        "    ax=ax,\n"
                        ")\n"
                        "plt.tight_layout()\n"
                        "plt.show()"
                    ),
                },
            ],
        },
        {
            "id": "evaluacion",
            "label": "Evaluación",
            "order": 5,
            "sections": [
                {"type": "heading", "content": "Verificando el aprendizaje"},
                {
                    "type": "paragraph",
                    "content": (
                        "Responde las siguientes preguntas para consolidar tu comprensión del tema."
                    ),
                },
                {
                    "type": "list",
                    "ordered": True,
                    "items": [
                        "¿Qué es la impureza Gini y cómo influye en la construcción del árbol?",
                        "¿Por qué un árbol demasiado profundo puede perjudicar el rendimiento en datos nuevos?",
                        "Dado un árbol con max_depth=2 entrenado sobre Iris, ¿cuántos nodos hoja puede tener como máximo?",
                        "¿En qué situaciones preferirías un árbol de decisión sobre una regresión logística?",
                    ],
                },
                {
                    "type": "paragraph",
                    "content": (
                        "Entrega: Sube un notebook Jupyter (.ipynb) con el código de los ejercicios "
                        "de elaboración y las respuestas argumentadas a las preguntas anteriores."
                    ),
                },
            ],
        },
    ]
}

_generation_jobs: dict[str, dict] = {}
_generation_jobs_lock = threading.Lock()


class GenerateOvaRequest(BaseModel):
    prompt: str
    llm_id: str
    upload_ids: list[str] = Field(default_factory=list)


def _parse_int_env(name: str, fallback: int) -> int:
    try:
        return int(os.getenv(name, str(fallback)))
    except (TypeError, ValueError):
        return fallback


def _min_prompt_chars() -> int:
    return max(1, _parse_int_env("MIN_PROMPT_CHARS", 10))


def _job_duration_seconds() -> int:
    return max(1, _parse_int_env("OVA_GENERATION_DURATION_SECONDS", 14))


def _job_ttl_seconds() -> int:
    default_ttl = max(60, _job_duration_seconds() * 10)
    configured_ttl = _parse_int_env("OVA_GENERATION_JOB_TTL_SECONDS", default_ttl)
    min_ttl = max(60, _job_duration_seconds())
    return max(min_ttl, configured_ttl)


def _enabled_llm_ids() -> set[str]:
    raw_ids = os.getenv("OVA_ENABLED_LLMS", "openai,gemini")
    return {item.strip().lower() for item in raw_ids.split(",") if item.strip()}


def _enabled_llm_options() -> list[dict]:
    allowed_ids = _enabled_llm_ids()
    return [item for item in LLM_CATALOG if item["id"] in allowed_ids]


def _resolve_stage(percentage: int) -> str:
    for threshold, stage in PROGRESS_STAGES:
        if percentage <= threshold:
            return stage
    return PROGRESS_STAGES[-1][1]


def _current_progress(job: dict) -> tuple[int, str, str]:
    elapsed_seconds = max(0.0, time.time() - float(job["started_at"]))
    percentage = min(100, int((elapsed_seconds / _job_duration_seconds()) * 100))
    stage = _resolve_stage(percentage)
    status_label = "success" if percentage >= 100 else "running"
    return percentage, stage, status_label


def _prune_generation_jobs() -> None:
    now = time.time()
    ttl_seconds = _job_ttl_seconds()

    expired_job_ids = []
    for job_id, job in _generation_jobs.items():
        completed_at = job.get("completed_at")
        reference_timestamp = (
            completed_at if completed_at is not None else job["started_at"]
        )
        expires_at = float(reference_timestamp) + ttl_seconds

        if now >= expires_at:
            expired_job_ids.append(job_id)

    for job_id in expired_job_ids:
        _generation_jobs.pop(job_id, None)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    return {"items": _enabled_llm_options()}


@router.post("/generate")
def start_ova_generation(
    payload: GenerateOvaRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = payload.prompt.strip()
    llm_id = payload.llm_id.strip().lower()

    if not prompt:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "prompt_required",
                "message": "El prompt es obligatorio.",
            },
        )

    min_chars = _min_prompt_chars()
    if len(prompt) < min_chars:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "prompt_too_short",
                "message": f"El prompt debe tener al menos {min_chars} caracteres.",
            },
        )

    enabled_options = _enabled_llm_options()
    if not enabled_options:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "llm_unavailable",
                "message": "No hay modelos LLM habilitados actualmente.",
            },
        )

    enabled_ids = {item["id"] for item in enabled_options}
    if llm_id not in enabled_ids:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "llm_invalid",
                "message": "Debes seleccionar un LLM válido.",
            },
        )

    upload_ids = [
        (item or "").strip() for item in payload.upload_ids if (item or "").strip()
    ]
    upload_limit = max_files_per_request()
    if len(upload_ids) > upload_limit:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "files_limit_exceeded",
                "message": f"Solo se permiten hasta {upload_limit} archivos.",
            },
        )

    uploads, upload_error = claim_user_uploads(str(current_user.id), upload_ids)
    if upload_error == "duplicate_upload_ids":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "duplicate_upload_ids",
                "message": "La lista de archivos contiene IDs duplicados.",
            },
        )

    if upload_error == "upload_not_found":
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "upload_not_found",
                "message": "Uno o más archivos temporales no fueron encontrados o expiraron.",
            },
        )

    job_id = str(uuid.uuid4())

    with _generation_jobs_lock:
        _prune_generation_jobs()
        _generation_jobs[job_id] = {
            "job_id": job_id,
            "llm_id": llm_id,
            "prompt": prompt,
            "uploads": uploads,
            "started_at": time.time(),
            "status": "running",
        }

    return {
        "job_id": job_id,
        "status": "running",
        "message": "Generación de OVA iniciada.",
        "uploads_count": len(uploads),
    }


@router.get("/generate/{job_id}/progress")
def get_generation_progress(job_id: str):
    with _generation_jobs_lock:
        _prune_generation_jobs()
        job = _generation_jobs.get(job_id)

    if not job:
        logger.warning(
            "OVA generation job not found: job_id=%s pid=%s (state is process-local in memory)",
            job_id,
            os.getpid(),
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": "No se encontró el proceso solicitado. Es posible que haya expirado.",
            },
        )

    percentage, stage, current_status = _current_progress(job)

    with _generation_jobs_lock:
        job["status"] = current_status
        if current_status == "success":
            job["completed_at"] = time.time()

    payload = {
        "job_id": job_id,
        "status": current_status,
        "percentage": percentage,
        "stage": stage,
        "message": "OVA generado correctamente." if current_status == "success" else "",
    }

    if current_status == "success":
        payload["ova_content"] = {
            **OVA_MOCK_CONTENT,
            "title": job.get("prompt", "OVA generado")[:80],
        }

    return payload
