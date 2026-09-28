"""El SQL de búsqueda admin usa translate/LIKE ligados, sin interpolar el término."""

from __future__ import annotations

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select  # noqa: E402

from models import User  # noqa: E402
from users.domain.admin import AdminUserListFilter  # noqa: E402
from users.infrastructure.admin_user_filters import (  # noqa: E402
    apply_admin_user_filters,
    like_contains,
)


def test_like_contains_escapes_wildcards() -> None:
    assert like_contains("a%b_c") == r"%a\%b\_c%"
    assert like_contains(r"path\to") == r"%path\\to%"


def test_search_sql_binds_term_and_folds_accents() -> None:
    stmt = apply_admin_user_filters(
        select(User.id),
        AdminUserListFilter(search="jose"),
    )
    compiled = stmt.compile()
    sql = str(compiled).lower()
    assert "translate" in sql
    assert "like" in sql
    assert "'jose'" not in sql
    assert "'%jose%'" not in sql
    assert any("jose" in str(value) for value in compiled.params.values())


def test_role_filter_sql_binds_uuid() -> None:
    role_id = uuid.uuid4()
    stmt = apply_admin_user_filters(
        select(User.id),
        AdminUserListFilter(role_id=role_id),
    )
    compiled = stmt.compile()
    sql = str(compiled).lower()
    assert "exists" in sql
    assert str(role_id) not in str(compiled)
    assert any(value == role_id or str(value) == str(role_id) for value in compiled.params.values())
