"""Purga de states OIDC y launches LTI caducados."""

import os
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from lti.infrastructure.cleanup import LAUNCH_RETENTION, purge_expired_lti  # noqa: E402
from lti.infrastructure.orm import LtiLaunch, LtiOidcState, LtiPlatform  # noqa: E402
from models import Ova, OvaPhase, OvaVersion, User  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402

NOW = datetime(2026, 10, 5, 12, tzinfo=UTC)


def _db():
    db = make_session(
        User.__table__, Ova.__table__, OvaVersion.__table__, OvaPhase.__table__,
        LtiPlatform.__table__, LtiOidcState.__table__, LtiLaunch.__table__,
    )
    platform = LtiPlatform(
        id=uuid.uuid4(), name="Moodle", issuer="https://lms.test", client_id="c",
        auth_login_url="https://lms.test/auth", auth_token_url="https://lms.test/token",
        jwks_url="https://lms.test/jwks", deployment_ids=["1"],
    )
    db.add(platform)
    db.flush()
    return db, platform


def _launch(platform, expires_at):
    return LtiLaunch(
        id=uuid.uuid4(), platform_id=platform.id, deployment_id="1",
        message_type="LtiResourceLinkRequest", subject="s", expires_at=expires_at,
    )


def test_purge_removes_expired_states_and_old_launches_only():
    db, platform = _db()
    db.add_all([
        LtiOidcState(state="old", nonce="n1", platform_id=platform.id, expires_at=NOW - timedelta(minutes=1)),
        LtiOidcState(state="live", nonce="n2", platform_id=platform.id, expires_at=NOW + timedelta(minutes=5)),
        _launch(platform, NOW - LAUNCH_RETENTION - timedelta(hours=1)),  # caducó hace más de una semana
        _launch(platform, NOW - timedelta(hours=1)),  # caducó hace poco: se conserva
        _launch(platform, NOW + timedelta(hours=1)),  # vigente
    ])
    db.commit()

    removed = purge_expired_lti(db, now=NOW)

    assert removed == {"lti_oidc_states": 1, "lti_launches": 1}
    assert [s.state for s in db.query(LtiOidcState).all()] == ["live"]
    assert db.query(LtiLaunch).count() == 2


def test_purge_is_idempotent():
    db, platform = _db()
    db.add(LtiOidcState(state="old", nonce="n", platform_id=platform.id, expires_at=NOW - timedelta(days=1)))
    db.commit()
    assert purge_expired_lti(db, now=NOW)["lti_oidc_states"] == 1
    assert purge_expired_lti(db, now=NOW) == {"lti_oidc_states": 0, "lti_launches": 0}
