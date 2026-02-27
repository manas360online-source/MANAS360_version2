-- Migration: Add TemplateTag and library fields
CREATE TABLE IF NOT EXISTS template_tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_tags_on_templates (
  template_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (template_id, tag_id)
);

ALTER TABLE cbt_session_templates
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS origin_template_id TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ORG',
  ADD COLUMN IF NOT EXISTS latest_published_version_id TEXT;

CREATE INDEX IF NOT EXISTS cbt_session_templates_visibility_idx ON cbt_session_templates(visibility);
CREATE INDEX IF NOT EXISTS template_tags_name_idx ON template_tags(name);
