-- 0003_workspaces.sql
-- Workspaces table — main resource for sandboxed dev environments

CREATE TYPE workspace_status AS ENUM ('idle', 'starting', 'running', 'stopping', 'error');

CREATE TABLE IF NOT EXISTS workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  status      workspace_status NOT NULL DEFAULT 'idle',
  vm_id       text,                  -- Fly Machine ID (null when idle)
  vm_ip       text,                  -- Fly Machine private IP
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_org ON workspaces (org_id);
CREATE INDEX idx_workspaces_status ON workspaces (status);

-- RLS ----------------------------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON workspaces
  USING (org_id::text = current_setting('app.org_id', true));
