-- Add resource metadata to ova_phases so regeneration knows which
-- ENGAGE/EXPLORE resource type to call. The title column stores the
-- human-readable label shown in the SCORM nav.
ALTER TABLE ova_phases ADD COLUMN IF NOT EXISTS resource_type_id INTEGER;
ALTER TABLE ova_phases ADD COLUMN IF NOT EXISTS title VARCHAR(120);
