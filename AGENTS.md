# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

## Repository Overview

Agent Workspace is a TypeScript monorepo providing sandboxed developer environments for AI agents. It uses a compute-storage separation model:

- **SDK** (`packages/sdk`) — TypeScript client published to npm as `@agent-workspace/sdk`
- **API** (`packages/api`) — Hono backend deployed to Fly.io
- **Agent** (`packages/agent`) — In-VM HTTP server running inside Fly Machines
- **Dashboard** (`packages/dashboard`) — Next.js management UI

## Repository Structure

```
packages/
  sdk/        TypeScript SDK (browser-only, ESM)
  api/        Hono API server
  agent/      In-VM agent HTTP server
  dashboard/  Next.js management UI
infra/
  fly/        Fly.io machine and VM image tooling
  storage/    S3 provisioning helpers
supabase/
  migrations/ DB schema and RLS policies
examples/     SDK usage examples
docs/         Architecture, auth, SDK reference, self-hosting guides
```

## Prerequisites

- Node.js 18+
- pnpm 9+

## Setup

```bash
pnpm install
```

## Common Commands

Run from the repository root (Turborepo orchestrates all packages):

```bash
pnpm build       # Build all packages
pnpm typecheck   # Type-check all packages
pnpm test        # Run all tests
pnpm lint        # Lint all packages
pnpm dev         # Start all packages in watch/dev mode
```

To run a command for a single package, use `--filter`:

```bash
pnpm --filter @agent-workspace/sdk build
pnpm --filter @agent-workspace/api test
```

## Package Notes

### `packages/sdk`

- Browser-only ESM module — do **not** use Node.js built-ins or `require()`
- Entry point: `src/index.ts`; built with `tsup` to `dist/`
- Tests use Vitest (`vitest run`)

### `packages/api`

- Hono + Zod REST API
- Requires environment variables in `packages/api/.env` (see `docs/self-hosting.md`)
- Dev server: `pnpm --filter @agent-workspace/api dev` (uses `tsx watch`)

### `packages/agent`

- Runs inside a Fly VM alongside the workspace file system
- Provides HTTP endpoints proxied through the API

### `packages/dashboard`

- Next.js 14+ App Router
- Requires `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Code Conventions

- **Language**: TypeScript throughout; strict mode enabled
- **Formatting/linting**: Follow the existing ESLint/Prettier configuration in each package
- **Imports**: Use ESM `import`/`export` — no `require()`
- **Errors**: Use typed error classes from `packages/sdk/src/errors.ts` in the SDK
- **Validation**: Use Zod schemas for all API request/response shapes
- **Auth**: API keys use `aw_sk_` prefix and are stored as argon2 hashes — never log or commit raw keys
- **Tests**: Add Vitest tests in the same package as the code under test

## Changesets (Versioning)

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm changeset          # Add a changeset for your change
pnpm version-packages   # Apply pending changesets locally (CI is source of truth)
```

Only `packages/sdk` is published to npm. Always add a changeset when modifying the SDK.

## CI

- **CI** (`.github/workflows/ci.yml`): runs `build`, `typecheck`, and `test` on every PR and push to `main`
- **Deploy** (`.github/workflows/deploy.yml`): deploys API to Fly.io and dashboard to Vercel on `main`
- **Release** (`.github/workflows/release.yml`): uses Changesets to create release PRs and publish SDK to npm

All CI checks must pass before merging.
