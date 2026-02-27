-- Migration: Add CBT session versioning table and patient session snapshot fields
-- Run with psql or via the provided script

-- 1) Create versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS cbt_session_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  change_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  is_draft BOOLEAN DEFAULT true,
  checksum TEXT
);

-- indexes
CREATE UNIQUE INDEX IF NOT EXISTS cbt_session_versions_session_version_idx ON cbt_session_versions(session_id, version);
CREATE INDEX IF NOT EXISTS cbt_session_versions_session_idx ON cbt_session_versions(session_id);
CREATE INDEX IF NOT EXISTS cbt_session_versions_created_at_idx ON cbt_session_versions(created_at);

-- 2) Add columns to patient_sessions to store the version id and template snapshot
ALTER TABLE patient_sessions
  ADD COLUMN IF NOT EXISTS template_version_id TEXT,
  ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

-- 3) Backfill patient_sessions.template_version_id and template_snapshot where possible
-- Set to latest published version for the template (if exists)
UPDATE patient_sessions ps
SET template_version_id = v.id,
    template_snapshot = v.snapshot_data
FROM (
  SELECT session_id, max(version) as maxv
  FROM cbt_session_versions
  WHERE published_at IS NOT NULL
  GROUP BY session_id
) mv
JOIN cbt_session_versions v ON v.session_id = mv.session_id AND v.version = mv.maxv
WHERE ps.template_id = mv.session_id
  AND ps.template_version_id IS NULL;

-- 4) Safety: add index to patient_sessions.template_version_id
CREATE INDEX IF NOT EXISTS patient_sessions_template_version_id_idx ON patient_sessions(template_version_id);

-- Note: This migration intentionally avoids removing or modifying existing columns.
-- Run the provided backfill script afterwards to generate version rows for templates that had none.
