-- seed.sql
-- Development seed data: one org, one API key, one workspace

-- Create a dev org
INSERT INTO orgs (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org')
ON CONFLICT DO NOTHING;

-- Create a dev API key (raw key: aw_sk_dev_test_key_1234567890)
-- The prefix is 'aw_sk_de' and key_hash is a placeholder —
-- re-hash with argon2 in production or via the API /keys endpoint.
INSERT INTO api_keys (id, org_id, name, prefix, key_hash, scopes)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'dev-key',
  'aw_sk_de',
  '$argon2id$v=19$m=65536,t=3,p=4$DEVELOPMENT_PLACEHOLDER',
  ARRAY['workspaces:read', 'workspaces:write', 'vms:manage', 'files:read', 'files:write']
)
ON CONFLICT DO NOTHING;

-- Create a sample workspace
INSERT INTO workspaces (id, org_id, name, status, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'my-first-workspace',
  'idle',
  '{"language": "typescript", "description": "Sample workspace"}'::jsonb
)
ON CONFLICT DO NOTHING;
