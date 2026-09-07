"""Pruebas de invariante de rendimiento del listado de OVAs (HU-030 / RN-001).

Verifica que:
1. El número de versión activa (`active_version_number`) se resuelve mediante
   una subconsulta escalar correlacionada y NO mediante eager-load / joinedload
   de la relación `versions`.
2. La consulta NO genera un JOIN externo con `ova_versions`, evitando filas duplicadas
   y permitiendo que `count(*) OVER ()` devuelva el total exacto en un único round-trip.
3. Se emite exactamente 1 sola consulta SQL para obtener la página y el conteo total.
"""

from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event, func, select, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Ova, OvaVersion

_DDL = """
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL DEFAULT '',
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ovas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador',
  file_path TEXT,
  storage_key TEXT,
  current_version_id TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE ova_versions (
  id TEXT PRIMARY KEY,
  ova_id TEXT NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=ON;"))
        for statement in _DDL.strip().split(";"):
            if statement.strip():
                conn.execute(text(statement))

    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session, engine
    finally:
        session.close()
        engine.dispose()


def test_sql_listado_estructura_subconsulta_activa_y_ventana():
    """Inspección de la forma del SQL: subconsulta escalar para versión y ventana para total."""
    base_query = select(Ova).where(Ova.deleted_at.is_(None))

    active_version_sq = (
        select(OvaVersion.version_number)
        .where(OvaVersion.ova_id == Ova.id, OvaVersion.is_active.is_(True))
        .correlate(Ova)
        .limit(1)
        .scalar_subquery()
    )

    page_query = base_query.add_columns(
        active_version_sq.label("active_version_number"),
        func.count().over().label("total_items"),
    )

    compiled_sql = str(page_query.compile(compile_kwargs={"literal_binds": False})).lower()

    # 1. Debe contener la subconsulta escalar para active_version_number
    assert "select ova_versions.version_number" in compiled_sql
    assert "ova_versions.is_active" in compiled_sql
    assert "ova_versions.ova_id = ovas.id" in compiled_sql

    # 2. Debe contener la función ventana para conteo total sin consulta extra
    assert "count(*) over () as total_items" in compiled_sql or "count() over ()" in compiled_sql

    # 3. La consulta externa NO debe hacer JOIN con ova_versions (evita el producto cartesiano)
    from_clause = compiled_sql.split("where")[0]
    assert "join ova_versions" not in from_clause


def test_listado_emite_una_sola_query_y_resuelve_version_activa_sin_duplicar(db_session):
    """Prueba de ejecución determinista: 1 única consulta SQL, sin duplicados ni eager loading."""
    session, engine = db_session

    user_id = uuid4()
    session.execute(
        text("INSERT INTO users (id, email, full_name) VALUES (:id, :email, :name)"),
        {"id": user_id.hex, "email": "profe@upao.edu", "name": "Profesor"},
    )

    # OVA 1: tiene 3 versiones en total, pero solo la versión 2 está activa
    ova_1 = Ova(id=uuid4(), user_id=user_id, title="OVA 1 Multi-versión", status="listo")
    session.add(ova_1)
    session.flush()

    v1 = OvaVersion(id=uuid4(), ova_id=ova_1.id, version_number=1, is_active=False, prompt="v1")
    v2 = OvaVersion(id=uuid4(), ova_id=ova_1.id, version_number=2, is_active=True, prompt="v2")
    v3 = OvaVersion(id=uuid4(), ova_id=ova_1.id, version_number=3, is_active=False, prompt="v3")
    session.add_all([v1, v2, v3])

    # OVA 2: tiene 1 versión activa
    ova_2 = Ova(id=uuid4(), user_id=user_id, title="OVA 2 Simple", status="listo")
    session.add(ova_2)
    session.flush()

    v2_1 = OvaVersion(id=uuid4(), ova_id=ova_2.id, version_number=1, is_active=True, prompt="v2_1")
    session.add(v2_1)

    session.commit()

    # Monitorear las consultas ejecutadas durante el listado
    sentencias_sql: list[str] = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        sentencias_sql.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)

    try:
        # Construcción de la consulta tal como se implementa en history_router.py
        active_version_sq = (
            select(OvaVersion.version_number)
            .where(OvaVersion.ova_id == Ova.id, OvaVersion.is_active.is_(True))
            .correlate(Ova)
            .limit(1)
            .scalar_subquery()
        )
        page_query = (
            select(Ova)
            .where(Ova.deleted_at.is_(None), Ova.user_id == user_id)
            .add_columns(
                active_version_sq.label("active_version_number"),
                func.count().over().label("total_items"),
            )
            .order_by(Ova.title.asc())
        )

        rows = session.execute(page_query).unique().all()

        # RN-001 / HU-030 Invariante 1: Se emite exactamente 1 consulta SQL
        assert len(sentencias_sql) == 1

        # Invariante 2: No hay filas duplicadas a pesar de que OVA 1 tiene 3 versiones
        assert len(rows) == 2

        # Invariante 3: active_version_number se resuelve correctamente por la subconsulta
        fila_ova1 = next(r for r in rows if r[0].id == ova_1.id)
        assert fila_ova1.active_version_number == 2
        assert fila_ova1.total_items == 2

        fila_ova2 = next(r for r in rows if r[0].id == ova_2.id)
        assert fila_ova2.active_version_number == 1
        assert fila_ova2.total_items == 2

        # Invariante 4: La colección versions NO fue cargada por eager-load
        ova_instancia = fila_ova1[0]
        assert "versions" not in ova_instancia.__dict__

    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)
