import logging
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova, OvaPhase, OvaVersion, User

logger = logging.getLogger(__name__)

REGEN_DURATION_SECONDS = int(os.getenv("OVA_GENERATION_DURATION_SECONDS", "14"))

SIMULATED_REGEN_CONTENT = {
    "motivacion": "Descubre por qué el aprendizaje automático está revolucionando múltiples industrias y cómo puedes aplicarlo en tu campo de estudio.",
    "contenido": "Explora los fundamentos teóricos y prácticos del tema. Analiza casos reales, datasets representativos y metodologías validadas en la industria.",
    "explicacion": "Comprende en profundidad los algoritmos clave, sus supuestos matemáticos y cuándo aplicar cada enfoque según el problema a resolver.",
    "actividad": "Diseña y ejecuta un mini-proyecto aplicando lo aprendido. Trabaja con datos reales y documenta tus decisiones de modelado.",
    "evaluacion": "Evalúa tu comprensión respondiendo preguntas sobre conceptos clave, selección de modelos y análisis de resultados obtenidos.",
}

PROGRESS_STAGES = [
    (10, "Iniciando regeneración"),
    (35, "Procesando contenido"),
    (65, "Generando fases seleccionadas"),
    (90, "Reconstruyendo paquete SCORM"),
    (100, "Finalizando"),
]


def _resolve_regen_stage(pct: int) -> str:
    for threshold, label in PROGRESS_STAGES:
        if pct <= threshold:
            return label
    return PROGRESS_STAGES[-1][1]


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR", default)


def _is_ova_owner(ova: Ova, user: User) -> bool:
    return str(ova.user_id) == str(user.id)


def _get_active_version(ova_id, db: Session) -> OvaVersion | None:
    return db.execute(
        select(OvaVersion).where(
            OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True)
        )
    ).scalar_one_or_none()


def _ensure_version_exists(ova: Ova, db: Session) -> OvaVersion:
    """Creates a v1 version for OVAs that pre-date the versioning feature."""
    from scorm.service import DEFAULT_PHASES

    version = OvaVersion(
        ova_id=ova.id,
        version_number=1,
        prompt=ova.description or ova.title,
        is_active=True,
    )
    db.add(version)
    db.flush()

    for phase_data in DEFAULT_PHASES:
        db.add(
            OvaPhase(
                version_id=version.id,
                phase_type=phase_data["type"],
                phase_order=phase_data["order"],
                content=phase_data["content"],
                regenerated=False,
            )
        )

    ova.current_version_id = version.id
    db.commit()
    db.refresh(version)
    return version


def _phase_to_dict(phase: OvaPhase) -> dict:
    return {
        "id": str(phase.id),
        "phase_type": phase.phase_type,
        "phase_order": phase.phase_order,
        "content": phase.content,
        "regenerated": phase.regenerated,
    }


def _version_to_dict(version: OvaVersion, include_phases: bool = False) -> dict:
    data = {
        "id": str(version.id),
        "version_number": version.version_number,
        "prompt": version.prompt,
        "is_active": version.is_active,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }
    if include_phases:
        data["phases"] = [_phase_to_dict(p) for p in version.phases]
    return data
