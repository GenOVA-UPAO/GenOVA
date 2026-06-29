"""ORM model registry.

Domain models live co-located in their domain packages (screaming
architecture). This module re-exports every model so that importing it
populates ``Base.metadata`` in full for ``create_all()`` and the migration
runner, and so legacy ``from models import X`` call sites keep working.
"""

from auth.models import (  # noqa: F401
    EmailVerificationToken,
    PasswordResetToken,
    RevokedToken,
    Session,
)
from generation.errors.error_log_model import (
    OvaErrorLog,  # noqa: F401  — registers ova_error_logs table
)
from generation.jobs.jobs_model import (  # noqa: F401  — registers ova_jobs tables
    OvaJob,
    OvaJobResource,
)
from llm.catalog.models import CatalogCache  # noqa: F401
from ova.models import Ova, OvaPhase, OvaPhaseVersion, OvaVersion  # noqa: F401
from rag.models import RagChunk  # noqa: F401
from roles.models import Role, UserRole  # noqa: F401
from users.admin.models import PlatformConfig  # noqa: F401
from users.models import User, UserLink  # noqa: F401

__all__ = [
    "CatalogCache",
    "EmailVerificationToken",
    "Ova",
    "OvaErrorLog",
    "OvaJob",
    "OvaJobResource",
    "OvaPhase",
    "OvaPhaseVersion",
    "OvaVersion",
    "PasswordResetToken",
    "PlatformConfig",
    "RagChunk",
    "RevokedToken",
    "Role",
    "Session",
    "User",
    "UserLink",
    "UserRole",
]
