"""Registra (o actualiza) en GenOVA la plataforma Moodle que imprime `provision_lti.php`.

Uso: python tests/moodle/lti_register_platform.py '<json de provision_lti.php>'
Equivale a «Administración → LTI → Registrar plataforma» de la app.
"""

import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy.orm import Session  # noqa: E402

importlib.import_module("models")  # registra todas las tablas (FKs del ORM)  # noqa: E402
from core.database import engine  # noqa: E402
from lti.infrastructure.orm import LtiPlatform  # noqa: E402


def main() -> None:
    data = json.loads(sys.argv[1])
    with Session(engine) as db:
        platform = db.query(LtiPlatform).filter(LtiPlatform.issuer == data["issuer"]).one_or_none()
        if platform is None:
            platform = LtiPlatform(issuer=data["issuer"])
            db.add(platform)
        platform.name = "Moodle CI"
        platform.client_id = data["client_id"]
        platform.deployment_ids = [data["deployment_id"]]
        platform.auth_login_url = data["auth_login_url"]
        platform.auth_token_url = data["auth_token_url"]
        platform.jwks_url = data["jwks_url"]
        platform.is_active = True
        db.commit()
        print(json.dumps({"platform_id": str(platform.id)}))


if __name__ == "__main__":
    main()
