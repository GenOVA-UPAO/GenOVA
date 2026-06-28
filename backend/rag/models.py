"""RagChunk ORM model (rag domain)."""

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class RagChunk(Base):
    """One embedded chunk from a user upload. The `embedding` column is a
    pgvector column managed via raw SQL in `backend/rag/store.py`; SQLAlchemy
    treats it as opaque text-equivalent here (we only read it via raw queries)."""

    __tablename__ = "rag_chunks"
    __table_args__ = (Index("idx_rag_chunks_expires_at", "expires_at"),)

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    upload_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    ova_id = Column(UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="SET NULL"), nullable=True)
    source_filename = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # embedding column is vector(768) — handled in raw SQL; not declared here.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
