-- 015: Index on ovas.created_at for ORDER BY DESC performance
-- All OVA list endpoints sort by created_at DESC; without this index PostgreSQL
-- performs a sequential scan on the full table for every paginated request.
CREATE INDEX IF NOT EXISTS idx_ovas_created_at ON ovas(created_at DESC);
