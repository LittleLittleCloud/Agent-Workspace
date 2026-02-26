# Authentication

Agent Workspace uses a **dual auth model** — one for programmatic SDK access, one for the Dashboard UI.

## API Key Authentication (SDK)

### Key Format

Keys follow the pattern: `aw_sk_<random>`

```
aw_sk_Kj3mXp9vL2nQ8wR...
```

- `aw_sk_` prefix makes keys identifiable in logs and secret scanners
- The raw key is shown **once** at creation and never stored
- The database stores only an **argon2 hash**

### Usage

```typescript
import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AGENT_WORKSPACE_API_KEY!,
})
```

Or via HTTP:

```bash
curl -H "Authorization: Bearer aw_sk_..." https://api.agentworkspace.dev/v1/workspaces
```

### Request Flow

```
Request: Authorization: Bearer aw_sk_...
         │
         ▼
middleware/auth.ts
  → hash(key) → lookup in api_keys table
  → attach { orgId, keyId } to request context
         │
         ▼
middleware/scope.ts
  → verify workspace.org_id === req.orgId
  → 403 if mismatch
         │
         ▼
Route handler
```

### Key Management

Keys are managed via the API or Dashboard:

```typescript
// Create a key (returns raw key once)
const key = await client.keys.create({ name: 'CI/CD' })
console.log(key.key) // aw_sk_... — save this!

// List keys (raw key not included)
const keys = await client.keys.list()

// Revoke a key
await client.keys.revoke(key.id)
```

## Dashboard Authentication (Supabase Auth)

The Dashboard uses **Supabase Auth** with:

- Email + password sign-in
- GitHub OAuth
- Session cookies for server components

### Flow

```
Browser → Supabase Auth (email/password or GitHub OAuth)
         │
         ▼
  Session cookie set on dashboard domain
         │
         ▼
  Dashboard server component / API route
    → verifies session via Supabase Auth SDK
    → resolves orgId from user's org membership
         │
         ▼
  Calls API Server with internal service token
  (or directly queries Supabase with RLS via session)
```

### Org Membership

Users are linked to organizations via the `org_members` table:

| Column | Type | Description |
|--------|------|-------------|
| `org_id` | uuid | Organization reference |
| `user_id` | uuid | Supabase Auth user ID |
| `role` | enum | `owner`, `admin`, or `member` |

## Row-Level Security (RLS)

All tables use RLS with the `app.org_id` session variable:

```sql
CREATE POLICY "org_isolation" ON workspaces
  USING (org_id::text = current_setting('app.org_id', true));
```

The API server sets this variable before every query:

```typescript
await db.rpc('set_config', {
  setting: 'app.org_id',
  value: orgId,
  is_local: true,
})
```

This ensures cross-org data leaks are impossible even if application code has bugs.
