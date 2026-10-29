"""Siembra en la BD de GenOVA (smoke) el docente y una OVA lista para la prueba LTI en Moodle.

El docente usa el mismo correo que en Moodle: el selector de Deep Linking busca sus OVAs
por el correo del lanzador. La OVA se arma con el motor real de plantillas (fixtures
`engage_01` y `evaluate_01`), sin LLM. Idempotente: reutiliza usuario y OVA si existen.
Imprime un JSON con `user_id` y `ova_id`.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy.orm import Session  # noqa: E402

from core.security import hash_password  # noqa: E402
from core.database import engine  # noqa: E402
from models import Ova, OvaPhase, OvaVersion, Role, User, UserRole  # noqa: E402
from ova_engine.pipeline import render_resource  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402

EMAIL = "docente@example.invalid"
TITLE = "OVA LTI CI: índices B-tree"


def ensure_teacher_role(db: Session, user: User) -> None:
    role = db.query(Role).filter(Role.name == "profesor").one()
    assignment = db.get(UserRole, (user.id, role.id))
    if assignment is None:
        db.add(UserRole(user_id=user.id, role_id=role.id, is_primary=True))
    else:
        assignment.is_primary = True


def main() -> None:
    with Session(engine) as db:
        user = db.query(User).filter(User.email == EMAIL).one_or_none()
        if user is None:
            user = User(email=EMAIL, email_normalized=EMAIL, password_hash=hash_password("Genova-CI-2026!"),
                        full_name="Docente GenOVA", is_active=True, email_verified=True)
            db.add(user)
            db.flush()
        ensure_teacher_role(db, user)
        ova = db.query(Ova).filter(Ova.user_id == user.id, Ova.title == TITLE, Ova.deleted_at.is_(None)).one_or_none()
        if ova is None:
            ova = Ova(user_id=user.id, title=TITLE, status="listo", author="Docente GenOVA")
            db.add(ova)
            db.flush()
            version = OvaVersion(ova_id=ova.id, version_number=1, prompt="Fixture LTI CI", is_active=True)
            db.add(version)
            db.flush()
            for order, name in enumerate(["engage_01", "evaluate_01"], 1):
                phase, rt = name.split("_")
                spec = all_specs()[f"{phase}:{int(rt)}"]
                fixture = json.loads((ROOT / "backend/tests/fixtures/ova_engine" / f"{name}.json").read_text())
                html = render_resource(spec, fixture["data"], fixture["concept"], fixture["params"])
                db.add(OvaPhase(version_id=version.id, phase_type=phase, phase_order=order,
                                content=html, title=spec.title, resource_type_id=int(rt)))
            ova.current_version_id = version.id
        db.commit()
        print(json.dumps({"user_id": str(user.id), "ova_id": str(ova.id)}))


if __name__ == "__main__":
    main()
