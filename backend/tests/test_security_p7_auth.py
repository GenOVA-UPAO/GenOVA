"""Claims, credential interleaving and linked analytics regressions."""

import os
import sys
from datetime import UTC, datetime, timedelta
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.security import HTTPAuthorizationCredentials  # noqa: E402
from sqlalchemy.dialects import postgresql  # noqa: E402
from starlette.requests import Request  # noqa: E402

from auth.application.dto import ResetPasswordInput  # noqa: E402
from auth.application.use_cases.reset_password import ResetPassword  # noqa: E402
from auth.domain.errors import InvalidPasswordResetToken  # noqa: E402
from auth.infrastructure.jwt import build_token  # noqa: E402
from auth.infrastructure.reset_adapters import SqlAlchemyPasswordResetTokenRepository  # noqa: E402
from auth.infrastructure.session_adapters import JwtSessionTokenDecoder  # noqa: E402
from auth.interface.http.dependencies import get_current_user  # noqa: E402
from core.security import JWT_ALGORITHM, JWT_SECRET  # noqa: E402
from models import PasswordResetToken, RevokedToken, Role, User, UserLink, UserRole  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402
from users.infrastructure.sqlalchemy_account_repository import (  # noqa: E402
    SqlAlchemyUserAccountRepository,
)
from users.infrastructure.sqlalchemy_analytics_repository import (  # noqa: E402
    SqlAlchemyAnalyticsRepository,
)

pytestmark = pytest.mark.usefixtures("accept_bearer")


@pytest.fixture
def db():
    session = make_session(User.__table__, PasswordResetToken.__table__, Role.__table__,
                           UserRole.__table__, RevokedToken.__table__, UserLink.__table__)
    session.expire_on_commit = False
    yield session
    session.close()


def user(db):
    row = User(id=uuid4(), email="test@example.org", email_normalized="test@example.org",
               password_hash="old", full_name="Test")
    db.add(row)
    db.commit()
    return row


def payload(row):
    now = datetime.now(UTC)
    return {"sub": str(row.id), "email": row.email, "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()), "iss": "genova",
            "aud": "genova-api", "jti": str(uuid4())}


def authenticate(db, claims):
    token = jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)
    request = Request({"type": "http", "method": "GET", "headers": []})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return get_current_user(request, creds, None, db)


@pytest.mark.parametrize("missing", ["exp", "iss", "iat", "jti", "sub"])
def test_missing_required_claims_are_rejected(db, missing):
    claims = payload(user(db))
    claims.pop("aud")  # Legacy form avoids an unrelated InvalidAudienceError.
    claims.pop(missing)
    with pytest.raises(HTTPException) as exc:
        authenticate(db, claims)
    assert exc.value.status_code == 401


def test_wrong_issuer_and_audience_are_rejected_and_valid_claims_work(db):
    row = user(db)
    assert authenticate(db, payload(row)).id == row.id
    for key, value in (("iss", "another-service"), ("aud", "another-api")):
        claims = {**payload(row), key: value}
        with pytest.raises(HTTPException):
            authenticate(db, claims)


def test_new_sessions_have_audience():
    claims = jwt.decode(build_token(str(uuid4()), "a@example.org"), JWT_SECRET,
                        algorithms=[JWT_ALGORITHM], options={"verify_aud": False})
    assert claims["aud"] == "genova-api"


@pytest.mark.parametrize("audience", [None, "", [], ["genova-api", "another-api"]])
def test_empty_or_nonexact_audience_does_not_enter_legacy_fallback(db, audience):
    claims = {**payload(user(db)), "aud": audience}
    with pytest.raises(HTTPException):
        authenticate(db, claims)


def test_legacy_token_is_accepted_only_in_bounded_rollout_window(db, monkeypatch):
    from core.config import settings

    now = int(datetime.now(UTC).timestamp())
    monkeypatch.setitem(settings.__dict__, "jwt_legacy_issued_before", now)
    claims = payload(user(db))
    claims.pop("aud")
    assert authenticate(db, claims).id
    monkeypatch.setitem(settings.__dict__, "jwt_legacy_issued_before", now - 1)
    with pytest.raises(HTTPException):
        authenticate(db, claims)

    # Even a still-unexpired signed legacy token cannot outlive the old
    # application's maximum session duration.
    monkeypatch.setitem(settings.__dict__, "jwt_legacy_issued_before", now)
    claims["exp"] = now + 31 * 24 * 60 * 60
    with pytest.raises(HTTPException):
        authenticate(db, claims)


def test_revocation_decoder_accepts_new_sessions_and_rejects_foreign_issuer():
    token = build_token(str(uuid4()), "a@example.org")
    assert JwtSessionTokenDecoder().decode_for_revocation(token) is not None
    claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_aud": False})
    claims["iss"] = "another-service"
    assert JwtSessionTokenDecoder().decode_for_revocation(
        jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)
    ) is None


def test_reset_locks_user_before_token_and_change_locks_before_password_read(db, monkeypatch):
    row = user(db)
    db.add(PasswordResetToken(user_id=row.id, token="reset",
                             expires_at=datetime.now(UTC) + timedelta(hours=1)))
    db.commit()
    statements = []
    original = db.execute

    def capture(stmt, *args, **kwargs):
        statements.append(str(stmt.compile(dialect=postgresql.dialect())))
        return original(stmt, *args, **kwargs)

    monkeypatch.setattr(db, "execute", capture)
    repo = SqlAlchemyPasswordResetTokenRepository(db)
    assert repo.find_by_token("reset") is not None
    locked = [sql for sql in statements if "FOR UPDATE" in sql]
    assert len(locked) >= 2
    assert "FROM users" in locked[0]
    assert "FROM password_reset_tokens" in locked[1]
    statements.clear()
    SqlAlchemyUserAccountRepository(db).get(row.id)
    assert any("FOR UPDATE" in sql and "FROM users" in sql for sql in statements)


def test_reset_rechecks_token_after_interleaved_password_change(db, monkeypatch):
    row = user(db)
    db.add(PasswordResetToken(user_id=row.id, token="reset",
                             expires_at=datetime.now(UTC) + timedelta(hours=1)))
    db.commit()
    original = db.execute
    interleaved = False

    def execute(stmt, *args, **kwargs):
        nonlocal interleaved
        result = original(stmt, *args, **kwargs)
        sql = str(stmt.compile(dialect=postgresql.dialect()))
        if not interleaved and sql.startswith("SELECT") and "FROM password_reset_tokens" in sql:
            # Materialize the stale first lookup, then simulate the concurrent
            # change winning before the reset acquires the user row lock.
            frozen = result.freeze()
            interleaved = True
            SqlAlchemyUserAccountRepository(db).update_password(row.id, "changed")
            return frozen()
        return result

    monkeypatch.setattr(db, "execute", execute)

    class Passwords:
        def accepts(self, value):
            return True

        def hash(self, value):
            return "reset-hash"

    use_case = ResetPassword(SqlAlchemyPasswordResetTokenRepository(db), Passwords(), Passwords())
    with pytest.raises(InvalidPasswordResetToken):
        use_case.execute(ResetPasswordInput(token="reset", new_password="Password123"))
    assert row.password_hash == "changed"


def test_analytics_includes_active_links_only_for_this_professor(db):
    professor, student, other = uuid4(), uuid4(), uuid4()
    for owner, linked, state in ((professor, student, "active"), (professor, other, "pending"),
                                  (other, uuid4(), "active"), (professor, uuid4(), "revoked")):
        db.add(UserLink(id=uuid4(), owner_user_id=owner, linked_user_id=linked, status=state,
                        code_hash="hash", expires_at=datetime.now(UTC) + timedelta(hours=1)))
    db.commit()
    assert SqlAlchemyAnalyticsRepository(db).linked_student_ids(professor) == [student]
