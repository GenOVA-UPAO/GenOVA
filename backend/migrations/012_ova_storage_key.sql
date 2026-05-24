-- Cloud storage key (Supabase Storage object path) for the SCORM zip.
-- Coexists with `file_path` (legacy local disk) during transition.
-- New OVAs populate only `storage_key`; old ones may have only `file_path`.

ALTER TABLE ovas ADD COLUMN IF NOT EXISTS storage_key TEXT NULL;
