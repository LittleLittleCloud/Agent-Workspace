-- 0002_api_keys.sql
-- API keys table — hashed with argon2, scoped to an org

CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  prefix      text NOT NULL,         -- first 8 chars of the raw key (for display)
  key_hash    text NOT NULL,         -- argon2 hash
  scopes      text[] NOT NULL DEFAULT '{}',
  last_used   timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_org ON api_keys (org_id);
CREATE INDEX idx_api_keys_prefix ON api_keys (prefix);

-- RLS ----------------------------------------------------------------
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON api_keys
  USING (org_id::text = current_setting('app.org_id', true));
