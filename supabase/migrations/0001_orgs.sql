-- 0001_orgs.sql
-- Organizations table — top-level tenant boundary

CREATE TABLE IF NOT EXISTS orgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS ----------------------------------------------------------------
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON orgs
  USING (id::text = current_setting('app.org_id', true));
