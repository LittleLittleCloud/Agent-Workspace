# Architecture

## Overview

Agent Workspace provides sandboxed development environments with full file system, bash, and persistent storage — designed for AI agents that need compute beyond the browser.

## Core Concept: Compute-Storage Separation

Workspaces (storage) and VMs (compute) are fully independent:

- A **workspace** is a logical unit of storage backed by an S3-compatible bucket.
- A **VM** is an ephemeral Fly Machine running the Agent HTTP server.
- Workspaces can exist without a VM (idle), be attached to one (active), and detached when done.
- On attach: S3 → VM sync. On detach: VM → S3 sync.

```
Developer / AI Agent          Team Admin / Developer
        │                              │
        │  API Key (Bearer token)       │  Browser (session cookie)
        ▼                              ▼
┌───────────────┐            ┌──────────────────┐
│   API Server  │  (Fly.io)  │   Dashboard UI   │  (Vercel / Fly.io)
│  Hono + Zod   │            │   Next.js App    │
└───────┬───────┘            └────────┬─────────┘
        │                             │
        │  Fly Machines API           │  Calls API Server
        ▼                             │
   ┌─────────┐                        │
   │  Fly VM  │  ◄────────────────────┘
   │ [agent]  │
   └────┬─────┘
        │
   ┌────┴────┐     ┌─────────────┐
   │   S3    │     │  Supabase   │
   │ Storage │     │  Postgres   │
   └─────────┘     └─────────────┘
```

## Packages

| Package | Purpose | Runtime |
|---------|---------|---------|
| `packages/sdk` | TypeScript SDK for API consumers | Node.js 18+ |
| `packages/api` | Backend API server (Hono) | Fly.io |
| `packages/agent` | In-VM HTTP server | Fly Machine |
| `packages/dashboard` | Management UI (Next.js) | Vercel / Fly.io |

## Workspace Lifecycle

```
created → idle ── attach ──▶ starting ──▶ running ── detach ──▶ stopping ──▶ idle
                                              │
                                              ▼
                                            error
```

## Data Flow

1. **Create workspace** → row in Supabase `workspaces` table + S3 prefix initialized
2. **Attach** → Fly Machine created, workspace data synced from S3 → VM via rclone
3. **Use** → SDK calls proxied through API → Agent HTTP server in the VM
4. **Detach** → VM syncs data back to S3 via rclone, Fly Machine destroyed
5. **Delete** → S3 prefix deleted, workspace row removed

## Security Model

- All API access requires a Bearer token (hashed with argon2)
- Row-Level Security (RLS) on Postgres enforces org isolation
- The API sets `app.org_id` as a session variable per request
- Dashboard uses Supabase Auth (email/password + GitHub OAuth)
- VMs are ephemeral — no persistent state beyond S3 sync
