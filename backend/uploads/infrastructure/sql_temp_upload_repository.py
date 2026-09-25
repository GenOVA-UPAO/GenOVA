"""Registro de subidas temporales en Postgres (tabla `temp_uploads`).

Antes el registro era un dict en la memoria de cada proceso: con varios workers
de uvicorn (o web + worker arq) una subida hecha en uno no existía para otro —
la lista salía vacía, el estado «indexando» no pasaba a «listo» (lo escribía el
proceso que indexó) y al crear el OVA el reclamo no la encontraba. En la base de
datos la ven todos.

Cada operación es una transacción corta propia (`engine.begin()`), así el
repositorio se puede usar desde la petición y desde las BackgroundTasks o hilos
sin compartir sesión. Las horas salen del reloj de Postgres (`now()`), el mismo
para todos los procesos. El archivo sigue en disco (`UPLOAD_TEMP_DIR`): la
ingesta lo lee en el mismo proceso/host que lo recibió.
"""

from __future__ import annotations

import json
import uuid

import structlog
from sqlalchemy import text

from uploads.domain.model import TempUpload
from uploads.infrastructure import in_memory_store as files

logger = structlog.get_logger(__name__)

_COLUMNS = (
    "upload_id, user_id, filename, content_type, size_bytes, storage_path, ova_id,"
    " rag_status, EXTRACT(EPOCH FROM created_at)::float8 AS created_at,"
    " EXTRACT(EPOCH FROM expires_at)::float8 AS expires_at,"
    " EXTRACT(EPOCH FROM confirmed_at)::float8 AS confirmed_at"
)
# Lista activa: no reclamada, del contexto pedido (NULL = formulario de crear) y viva.
_ACTIVE = (
    "user_id = :user_id AND confirmed_at IS NULL AND expires_at > now()"
    " AND ova_id IS NOT DISTINCT FROM CAST(:ova_id AS uuid)"
)
# Consultas armadas una vez con las constantes de arriba (sin datos del usuario:
# todo valor va como parámetro enlazado).
_SQL_COUNT = f"SELECT count(*) FROM temp_uploads WHERE {_ACTIVE}"  # noqa: S608
_SQL_LIST = f"SELECT {_COLUMNS} FROM temp_uploads WHERE {_ACTIVE} ORDER BY created_at DESC"  # noqa: S608
_SQL_GET = (
    f"SELECT {_COLUMNS} FROM temp_uploads"  # noqa: S608
    " WHERE upload_id = :id AND user_id = :user_id AND expires_at > now()"
)
_SQL_CLAIM = (
    "UPDATE temp_uploads SET confirmed_at = COALESCE(confirmed_at, now()), ova_id = :ova_id"  # noqa: S608
    " WHERE upload_id = ANY(:ids) AND user_id = :user_id AND expires_at > now()"
    f" RETURNING {_COLUMNS}"
)
_SQL_INSERT = (
    "INSERT INTO temp_uploads (upload_id, user_id, filename, content_type, size_bytes,"  # noqa: S608
    " storage_path, ova_id, expires_at) VALUES (:id, :user_id, :filename, :content_type,"
    " :size, :path, :ova_id, now() + make_interval(secs => :ttl))"
    f" RETURNING {_COLUMNS}"
)


def _engine():
    from core.database import engine

    return engine


def _uuid(value) -> uuid.UUID | None:
    """Los ids llegan como texto del cliente: uno que no es UUID no existe."""
    if value is None:
        return None
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _to_entity(row) -> TempUpload:
    m = row._mapping
    return TempUpload(
        upload_id=str(m["upload_id"]),
        user_id=str(m["user_id"]),
        filename=m["filename"],
        content_type=m["content_type"],
        size_bytes=int(m["size_bytes"]),
        storage_path=m["storage_path"],
        created_at=float(m["created_at"]),
        expires_at=float(m["expires_at"]),
        confirmed_at=m["confirmed_at"],
        rag_status=m["rag_status"],
        ova_id=str(m["ova_id"]) if m["ova_id"] is not None else None,
    )


def prune_expired() -> int:
    """Borra las subidas caducadas y sus archivos. Solo el proceso cuyo DELETE
    devuelve la fila borra el archivo: nunca dos a la vez."""
    with _engine().begin() as conn:
        paths = (
            conn.execute(
                text("DELETE FROM temp_uploads WHERE expires_at <= now() RETURNING storage_path")
            )
            .scalars()
            .all()
        )
    for path in paths:
        files.remove_file(path)
    return len(paths)


class SqlTempUploadRepository:
    def count_active(self, user_id: str, ova_id: str | None = None) -> int:
        uid, scope = _uuid(user_id), _uuid(ova_id)
        if uid is None or (ova_id is not None and scope is None):
            return 0
        prune_expired()
        with _engine().connect() as conn:
            return int(
                conn.execute(
                    text(_SQL_COUNT),
                    {"user_id": uid, "ova_id": scope},
                ).scalar_one()
            )

    def list_active(self, user_id: str, ova_id: str | None = None) -> list[TempUpload]:
        uid, scope = _uuid(user_id), _uuid(ova_id)
        if uid is None or (ova_id is not None and scope is None):
            return []
        prune_expired()
        with _engine().connect() as conn:
            rows = conn.execute(
                text(_SQL_LIST),
                {"user_id": uid, "ova_id": scope},
            ).all()
        return [_to_entity(r) for r in rows]

    def get(self, upload_id: str, user_id: str) -> TempUpload | None:
        upid, uid = _uuid(upload_id), _uuid(user_id)
        if upid is None or uid is None:
            return None
        with _engine().connect() as conn:
            row = conn.execute(
                text(_SQL_GET),
                {"id": upid, "user_id": uid},
            ).first()
        return _to_entity(row) if row else None

    def claim(self, user_id: str, upload_ids: list[str], ova_id: str) -> list[TempUpload]:
        uid, scope = _uuid(user_id), _uuid(ova_id)
        wanted = [u for u in (_uuid(x) for x in dict.fromkeys(upload_ids)) if u is not None]
        if uid is None or scope is None or not wanted:
            return []
        with _engine().begin() as conn:
            rows = conn.execute(
                text(_SQL_CLAIM),
                {"ids": wanted, "user_id": uid, "ova_id": scope},
            ).all()
        by_id = {str(r._mapping["upload_id"]): _to_entity(r) for r in rows}
        # Mismo orden que pidió quien reclama (como la versión en memoria).
        return [by_id[str(u)] for u in wanted if str(u) in by_id]

    def create(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
        ova_id: str | None = None,
    ) -> TempUpload:
        upload_id = uuid.uuid4()
        user_dir = files.temp_uploads_root() / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        storage_path = user_dir / f"{upload_id}_{filename}"
        with storage_path.open("wb") as fh:
            fh.write(content)
        prune_expired()
        try:
            with _engine().begin() as conn:
                row = conn.execute(
                    text(_SQL_INSERT),
                    {
                        "id": upload_id,
                        "user_id": _uuid(user_id),
                        "filename": filename,
                        "content_type": content_type,
                        "size": len(content),
                        "path": str(storage_path),
                        "ova_id": _uuid(ova_id),
                        "ttl": files.temp_ttl_seconds(),
                    },
                ).one()
        except Exception:
            files.remove_file(str(storage_path))  # sin fila, el archivo quedaría huérfano
            raise
        return _to_entity(row)

    def get_storage_path(self, upload_id: str, user_id: str) -> str | None:
        upload = self.get(upload_id, user_id)
        return upload.storage_path if upload else None

    def delete(self, upload_id: str, user_id: str) -> bool:
        upid, uid = _uuid(upload_id), _uuid(user_id)
        if upid is None or uid is None:
            return False
        with _engine().begin() as conn:
            path = conn.execute(
                text(
                    "DELETE FROM temp_uploads WHERE upload_id = :id AND user_id = :user_id"
                    " AND expires_at > now() RETURNING storage_path"
                ),
                {"id": upid, "user_id": uid},
            ).scalar()
        if path is None:
            return False
        files.remove_file(path)
        return True

    def set_rag_status(self, upload_id: str, rag_status: dict) -> None:
        upid = _uuid(upload_id)
        if upid is None:
            return
        with _engine().begin() as conn:
            conn.execute(
                text(
                    "UPDATE temp_uploads SET rag_status = CAST(:s AS JSONB) WHERE upload_id = :id"
                ),
                {"s": json.dumps(rag_status), "id": upid},
            )
