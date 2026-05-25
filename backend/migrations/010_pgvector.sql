-- Enable pgvector for RAG embeddings storage.
-- Safe to re-run: extension creation is idempotent.
CREATE EXTENSION IF NOT EXISTS vector;
