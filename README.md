# Agent Workspace

[![CI](https://github.com/AWorkspaceDev/Agent-Workspace/actions/workflows/ci.yml/badge.svg)](https://github.com/AWorkspaceDev/Agent-Workspace/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@agent-workspace/sdk)](https://www.npmjs.com/package/@agent-workspace/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@agent-workspace/sdk)](https://www.npmjs.com/package/@agent-workspace/sdk)

## Packages

| Package | npm |
| --- | --- |
| [`@agent-workspace/sdk`](packages/sdk) | [![npm](https://img.shields.io/npm/v/@agent-workspace/sdk)](https://www.npmjs.com/package/@agent-workspace/sdk) |

Agent Workspace is a monorepo for a sandboxed developer environment platform built around a compute-storage separation model:

- **SDK** (`@agent-workspace/sdk`) for programmatic usage
- **API** service for workspace lifecycle, file/tool proxying, and key management
- **Agent** process running in VM sandboxes
- **Dashboard** (Next.js) for organization/workspace administration

## Repository Layout

```text
packages/
  sdk/        TypeScript SDK
  api/        Hono API service
  agent/      In-VM agent server
  dashboard/  Next.js management UI
infra/
  fly/        Fly.io machine and VM image tooling
  storage/    S3 provisioning helpers
supabase/
  migrations/ DB schema migrations and RLS policies
examples/     SDK and agent usage examples
```

## Prerequisites

- Node.js 18+
- pnpm 9+

## Getting Started

```bash
pnpm install
```

### Common Commands

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm dev
```

## CI/CD Workflows

- **CI**: `.github/workflows/ci.yml`
  - Runs on PRs and pushes to `main`
  - Installs dependencies, then runs build/typecheck/test
- **Deploy**: `.github/workflows/deploy.yml`
  - Runs on pushes to `main` and manual dispatch
  - Verifies build/tests before deployment
  - Deploys API to Fly.io and dashboard to Vercel when required secrets are present
- **Release**: `.github/workflows/release.yml`
  - Runs on pushes to `main` and manual dispatch
  - Uses Changesets to create/update release PRs
  - Publishes SDK to npm when release changes are ready

## Required GitHub Secrets

For workflows to fully operate, configure:

- `NPM_TOKEN` (SDK publish)
- `FLY_API_TOKEN` (API deployment)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (dashboard deployment)

## Release Process (Changesets)

This repository uses Changesets as the canonical publish path.

### 1) Add a changeset with your SDK/API change

```bash
pnpm changeset
```

- Select the package(s) impacted
- Choose semver bump type
- Write a short human-readable summary

### 2) Commit and merge to `main`

- Commit the generated file under `.changeset/`
- Open PR and merge

### 3) Release workflow behavior

On `main`, `release.yml` will:

1. Create or update a release PR with version/changelog updates when unpublished changesets exist.
2. Publish to npm (SDK) once release changes are merged and publishable.

### 4) Optional local helper command

You can generate version bumps locally with:

```bash
pnpm version-packages
```

(Release automation in GitHub Actions is still the source of truth for publish.)

## Local Environment Setup

### API service

Create a local env file from the template:

```bash
copy packages\api\.env.example packages\api\.env
```

Set values in `packages/api/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLY_API_TOKEN`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `PORT` (default `3001`)

### Dashboard

Set these for local dashboard development (for example in your shell profile or local env file):

- `NEXT_PUBLIC_API_URL` (for local API, usually `http://localhost:3001`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional: Supabase local stack

If you are running Supabase locally:

```bash
npx supabase start
npx supabase db push
```

## Notes

- The SDK package is configured for public npm publishing (`publishConfig.access = public`).
- The SDK package is browser-only (ESM + Fetch API).
- `publish-sdk.yml` has been intentionally removed to avoid dual publish paths.

## License

See `LICENSE`.
