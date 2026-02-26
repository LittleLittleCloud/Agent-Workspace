# Self-Hosting Guide

Agent Workspace can be self-hosted using your own infrastructure. This guide covers the required services and configuration.

## Prerequisites

- **Node.js** 18+ and **pnpm**
- **Docker** (for building the VM image)
- **Fly.io account** (for Machines API — or adapt to your own VM provider)
- **Supabase project** (hosted or self-hosted)
- **S3-compatible storage** (Tigris, Cloudflare R2, AWS S3, MinIO)

## 1. Clone and Install

```bash
git clone https://github.com/your-org/agent-workspace.git
cd agent-workspace
pnpm install
```

## 2. Set Up Supabase

### Option A: Hosted Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```bash
   npx supabase db push --db-url postgresql://...
   ```
3. Note your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Option B: Self-Hosted Supabase

```bash
npx supabase start
```

Then run the migrations:

```bash
npx supabase db push
```

## 3. Set Up S3 Storage

Choose your provider and run the provisioning script:

```bash
# Tigris (recommended for Fly.io deployments)
npx tsx infra/storage/buckets.ts tigris

# Cloudflare R2
npx tsx infra/storage/buckets.ts r2

# AWS S3
npx tsx infra/storage/buckets.ts aws
```

## 4. Configure Environment

Create `.env` in `packages/api/`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Fly.io
FLY_API_TOKEN=your-fly-token
FLY_APP_NAME=agent-workspace-vms
FLY_ORG=personal

# S3
S3_ENDPOINT=https://fly.storage.tigris.dev
S3_BUCKET=agent-workspace
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
```

## 5. Build and Push VM Image

```bash
# Create Fly app for VMs
npx tsx infra/fly/machines.ts create-app

# Build and push the sandbox VM image
npx tsx infra/fly/machines.ts build
```

## 6. Deploy API Server

```bash
cd packages/api
fly deploy
```

## 7. Deploy Dashboard (Optional)

### Vercel

```bash
cd packages/dashboard
vercel deploy
```

### Fly.io

```bash
cd packages/dashboard
fly deploy
```

Set environment variables on your deployment platform:

```
NEXT_PUBLIC_API_URL=https://your-api.fly.dev
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 8. Create Your First API Key

```bash
# Via the API (requires a seeded org)
curl -X POST https://your-api.fly.dev/v1/keys \
  -H "Authorization: Bearer <service-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-first-key"}'
```

Or use the Dashboard UI at `https://your-dashboard.vercel.app/keys`.

## Development

```bash
# Start all packages in dev mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Environment Variables Reference

| Variable | Package | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | api | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | api | Service role key (backend only) |
| `FLY_API_TOKEN` | api | Fly.io API token |
| `FLY_APP_NAME` | api, infra | Fly app name for VMs |
| `S3_ENDPOINT` | api, agent | S3-compatible endpoint |
| `S3_BUCKET` | api, agent | Bucket name |
| `S3_ACCESS_KEY_ID` | api, agent | S3 access key |
| `S3_SECRET_ACCESS_KEY` | api, agent | S3 secret key |
| `NEXT_PUBLIC_API_URL` | dashboard | API server URL |
| `NEXT_PUBLIC_SUPABASE_URL` | dashboard | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dashboard | Supabase anon key |
