-- 0004_org_members.sql
-- Org membership table — links Supabase Auth users to orgs for Dashboard access

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,        -- references auth.users(id)
  role        org_role NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members (user_id);

-- RLS ----------------------------------------------------------------
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own org memberships
CREATE POLICY "own_memberships" ON org_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Owners/admins can manage memberships
CREATE POLICY "admin_manage" ON org_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );
