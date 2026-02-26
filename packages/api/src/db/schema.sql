-- ────────────────────────────────────────────────────────────
-- Agent Workspace — Full schema
-- ────────────────────────────────────────────────────────────

-- Orgs
create table orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Org members (maps Supabase Auth users to orgs for dashboard access)
create table org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member',  -- 'owner' | 'admin' | 'member'
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

-- API Keys (stores hash only)
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  name         text not null,
  key_hash     text not null unique,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

-- Workspaces
create table workspaces (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  name           text not null,
  s3_path        text not null,
  status         text not null default 'idle',
  attached_vm_id text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- Row-Level Security
-- ────────────────────────────────────────────────────────────

alter table orgs enable row level security;
alter table org_members enable row level security;
alter table api_keys enable row level security;
alter table workspaces enable row level security;

-- Org isolation: api server sets app.org_id per request
create policy "org isolation" on workspaces
  using (org_id = current_setting('app.org_id')::uuid);

create policy "org isolation" on api_keys
  using (org_id = current_setting('app.org_id')::uuid);

create policy "org isolation" on org_members
  using (org_id = current_setting('app.org_id')::uuid);

-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────

create index idx_api_keys_org_id on api_keys(org_id);
create index idx_api_keys_key_hash on api_keys(key_hash);
create index idx_workspaces_org_id on workspaces(org_id);
create index idx_org_members_org_id on org_members(org_id);
create index idx_org_members_user_id on org_members(user_id);
