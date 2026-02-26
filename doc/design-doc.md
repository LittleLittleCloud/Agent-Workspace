# Agent Workspace — Design Document

## Overview

Agent Workspace resolves a critical limitation of browser-based AI agents: they lack a file system, can't run bash, and can't support skills or coding MCPs the way local agents can. Agent Workspace provides a full-fledged sandbox with bash, file system, and persistent storage (workspaces) — implementing a clean **compute-storage separation** architecture.

---

## Architecture

### Core Concept: Compute-Storage Separation

Workspaces (storage) and VMs (compute) are fully independent resources. A workspace can exist without a VM, be attached to one when needed, and detached when done — syncing back to S3 automatically.

```
Developer / AI Agent          Team Admin / Developer
        │                              │
        │  API Key (Bearer token)       │  Browser (session cookie)
        ▼                              ▼
┌───────────────┐            ┌──────────────────┐
│   API Server  │  (Fly.io)  │   Dashboard UI   │  (Vercel / Fly.io)
│               │            │   (Next.js App)  │
│  ┌──────────┐ │            │                  │
│  │ auth     │ │            │  • Workspaces    │
│  │ middleware│ │            │  • VMs           │
│  └──────────┘ │            │  • API Keys      │
│  ┌──────────┐ │            │  • Org Settings  │
│  │ routes   │ │            │  • Usage / Logs  │
│  └────┬─────┘ │            └────────┬─────────┘
└───────┼───────┘                     │
        │  ▲                          │
        │  └──────────────────────────┘
        │      Dashboard calls API Server
   ┌────┴────┐
   │         │
   ▼         ▼         ┌─────────────┐
┌──────┐  ┌──────────────────┐       │  Supabase   │
│Fly.io│  │  S3-compatible   │       │  Postgres   │
│  VM  │  │  Object Storage  │       │  (orgs,     │
│      │  │  (Tigris/R2)     │       │  api_keys,  │
│[agent│  │                  │       │  workspaces)│
│ HTTP]│  │  workspace data  │       └─────────────┘
└──────┘  └──────────────────┘              ▲
   ▲               │                        │
   └───────────────┘               API Server reads/writes
     attach: S3 → VM sync
     detach: VM → S3 sync
```

### Workspace Lifecycle

```
created → idle ──attach──▶ attaching ──▶ active ──detach──▶ detaching ──▶ idle
                                             │
                                             ▼
                                           error
```

---

## Repository Structure

```
agent-workspace/
├── packages/
│   ├── sdk/                        # TypeScript SDK (published to npm)
│   │   ├── src/
│   │   │   ├── client.ts           # WorkspaceClient — main entry point
│   │   │   ├── workspace.ts        # Workspace CRUD + lifecycle
│   │   │   ├── files.ts            # File operations
│   │   │   ├── tools.ts            # AI tools (bash, grep, etc.)
│   │   │   ├── http.ts             # Internal fetch wrapper
│   │   │   ├── types.ts            # Shared types/interfaces
│   │   │   ├── errors.ts           # Typed error classes
│   │   │   └── index.ts            # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                        # Backend API server (deployed to Fly.io)
│   │   ├── src/
│   │   │   ├── index.ts            # Hono / Fastify entrypoint
│   │   │   ├── routes/
│   │   │   │   ├── workspaces.ts   # CRUD for workspaces
│   │   │   │   ├── vms.ts          # Attach/detach VM ↔ workspace
│   │   │   │   ├── files.ts        # Proxy file ops to VM agent
│   │   │   │   └── keys.ts         # API key management
│   │   │   ├── services/
│   │   │   │   ├── fly.ts          # Fly.io Machines API client
│   │   │   │   ├── storage.ts      # S3 workspace volume management
│   │   │   │   ├── registry.ts     # workspace → VM mapping (state)
│   │   │   │   └── auth.ts         # Key hashing, lookup, org resolution
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Validates key → resolves orgId
│   │   │   │   └── scope.ts        # Enforces workspace belongs to org
│   │   │   └── db/
│   │   │       ├── client.ts       # Supabase admin client
│   │   │       └── schema.sql      # Table definitions + RLS policies
│   │   ├── fly.toml
│   │   └── package.json
│   │
│   ├── agent/                      # Process running inside the sandbox VM
│   │   ├── src/
│   │   │   ├── index.ts            # HTTP server on localhost
│   │   │   ├── handlers/
│   │   │   │   ├── bash.ts         # Execute bash commands
│   │   │   │   ├── files.ts        # Read/write/list/delete files
│   │   │   │   ├── grep.ts         # Grep with structured output
│   │   │   │   └── sync.ts         # Sync workspace to/from S3 on attach/detach
│   │   │   └── sandbox.ts          # Sandboxing / resource limits
│   │   └── package.json
│   │
│   └── dashboard/                  # Management UI (Next.js, deployed to Vercel / Fly.io)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx       # Root layout with auth provider
│       │   │   ├── page.tsx         # Dashboard home — overview / stats
│       │   │   ├── workspaces/
│       │   │   │   ├── page.tsx     # List workspaces, create new
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx # Workspace detail: status, attach/detach, file browser
│       │   │   ├── vms/
│       │   │   │   └── page.tsx     # List VMs, start/stop, view regions
│       │   │   ├── keys/
│       │   │   │   └── page.tsx     # Create / revoke API keys
│       │   │   └── settings/
│       │   │       └── page.tsx     # Org settings, members, billing
│       │   ├── components/
│       │   │   ├── workspace-table.tsx
│       │   │   ├── vm-status-badge.tsx
│       │   │   ├── key-create-dialog.tsx
│       │   │   ├── file-browser.tsx
│       │   │   ├── terminal-viewer.tsx  # Live bash output viewer
│       │   │   └── nav.tsx
│       │   └── lib/
│       │       ├── api.ts           # Typed fetch wrapper calling the API server
│       │       └── auth.ts          # Supabase Auth helpers (session / OAuth)
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infra/
│   ├── fly/
│   │   ├── vm-image/
│   │   │   └── Dockerfile          # Sandbox VM base image (includes agent + rclone)
│   │   └── machines.ts             # Scripts to manage Fly Machine templates
│   └── storage/
│       └── buckets.ts              # Bucket provisioning (Tigris / R2 / S3)
│
├── supabase/                       # Supabase CLI project (run at monorepo root)
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_orgs.sql
│   │   ├── 0002_api_keys.sql
│   │   └── 0003_workspaces.sql
│   └── seed.sql                    # Dev seed: one org + one api key
│
├── examples/
│   ├── basic-usage.ts              # Minimal: create workspace, attach, run a command, detach
│   ├── file-operations.ts          # Read, write, copy, move, list, delete files
│   ├── bash-and-tools.ts           # Run bash, grep, find, tree
│   ├── workspace-lifecycle.ts      # Full lifecycle: create → attach → use → detach → delete
│   ├── error-handling.ts           # Typed error handling patterns
│   ├── pagination.ts               # Paginating through workspace lists
│   ├── claude-mcp-integration.ts   # Wiring SDK tools to an MCP server for Claude
│   ├── claude-code-skill.ts        # Claude coding skill: write, test, iterate on code
│   ├── claude-research-skill.ts    # Claude research skill: clone, grep, analyse a repo
│   └── claude-multi-skill.ts       # Orchestrating multiple skills in an agentic loop
│
├── docs/
│   ├── architecture.md
│   ├── sdk-reference.md
│   ├── auth.md
│   └── self-hosting.md
│
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                      # Turborepo build pipeline
└── tsconfig.base.json
```

---

## Auth Design

### API Key Format

Keys follow the `<prefix>_<random>` pattern: `aw_sk_Kj3mXp9...`

- The prefix makes keys identifiable in logs and easy to grep out of leaked codebases
- The raw key is shown **once** at creation and never stored
- The DB stores only an `argon2` hash

### Request Flow

**SDK / programmatic access** — uses API key (Bearer token):

```
Request: Authorization: Bearer aw_sk_...
         │
         ▼
middleware/auth.ts
  hash(key) → lookup in api_keys table
  → attach { orgId, keyId } to request context
         │
         ▼
middleware/scope.ts
  verify workspace.org_id === req.orgId
  → 403 if mismatch
         │
         ▼
Route handler (operates on orgId, never sees raw key)
```

**Dashboard UI** — uses Supabase Auth (session cookie / OAuth):

```
Browser → Supabase Auth (email/password, GitHub OAuth, etc.)
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
  Calls API Server with an internal service token
    (or directly queries Supabase with RLS via the user's session)
```

### Database Schema

```sql
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

-- Row-Level Security
alter table workspaces enable row level security;

create policy "org isolation"
  on workspaces
  using (org_id = current_setting('app.org_id')::uuid);
```

The API server sets `app.org_id` as a Postgres session variable per request, so even a bug in scope middleware can't leak cross-org data.

### Supabase DB Client

```typescript
// packages/api/src/db/client.ts
import { createClient } from '@supabase/supabase-js'

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service_role — trusted backend only
)
```

---

## SDK

### Install

```bash
npm install @agent-workspace/sdk
```

### `packages/sdk/src/types.ts`

```typescript
// ─── Orgs & Auth ────────────────────────────────────────────────────────────

export interface Org {
  id: string
  name: string
  createdAt: Date
}

export interface ApiKey {
  id: string
  orgId: string
  name: string
  /** Only populated on creation — never returned again */
  key?: string
  lastUsedAt: Date | null
  createdAt: Date
  revokedAt: Date | null
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

export type WorkspaceStatus =
  | 'idle'        // created, not attached to any VM
  | 'attaching'   // being synced from S3 → VM
  | 'active'      // attached and ready
  | 'detaching'   // being synced back VM → S3
  | 'error'

export interface Workspace {
  id: string
  orgId: string
  name: string
  s3Path: string
  status: WorkspaceStatus
  attachedVmId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkspaceOptions {
  name: string
  /** Optional seed: copy from an existing workspace snapshot */
  fromSnapshotId?: string
}

export interface UpdateWorkspaceOptions {
  name?: string
}

// ─── VMs ─────────────────────────────────────────────────────────────────────

export type VmStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

export interface Vm {
  id: string
  orgId: string
  flyMachineId: string
  status: VmStatus
  workspaceId: string | null
  region: string
  createdAt: Date
}

export interface AttachOptions {
  /** If true, wait until status = 'active' before resolving */
  waitUntilReady?: boolean
  /** Timeout in ms when waitUntilReady is true. Default: 30_000 */
  timeoutMs?: number
}

// ─── File Operations ──────────────────────────────────────────────────────────

export interface FileEntry {
  path: string
  type: 'file' | 'dir' | 'symlink'
  size: number
  modifiedAt: Date
}

export interface ReadFileOptions {
  encoding?: BufferEncoding
}

export interface WriteFileOptions {
  append?: boolean   // Default: false
  mkdirp?: boolean   // Create parent directories if they don't exist. Default: true
}

export interface ListFilesOptions {
  recursive?: boolean
  pattern?: string   // Glob pattern filter, e.g. '**/*.ts'
}

// ─── Tools (AI interaction) ───────────────────────────────────────────────────

export interface BashOptions {
  cwd?: string                        // Working directory inside the workspace
  env?: Record<string, string>        // Environment variables to set
  timeoutMs?: number                  // Default: 30_000
}

export interface BashResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface GrepOptions {
  include?: string       // Glob pattern for files to search. Default: '**/*'
  recursive?: boolean
  caseSensitive?: boolean
  maxMatches?: number
}

export interface GrepMatch {
  file: string
  line: number
  content: string
}

export interface GrepResult {
  matches: GrepMatch[]
  truncated: boolean
}

// ─── SDK Client Options ───────────────────────────────────────────────────────

export interface WorkspaceClientOptions {
  apiKey: string
  baseUrl?: string    // Override the default API base URL
  timeoutMs?: number  // Request timeout in ms. Default: 30_000
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedList<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginationOptions {
  page?: number
  pageSize?: number
}
```

### `packages/sdk/src/errors.ts`

```typescript
export class AgentWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'AgentWorkspaceError'
  }
}

export class AuthError extends AgentWorkspaceError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AgentWorkspaceError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AgentWorkspaceError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AgentWorkspaceError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends AgentWorkspaceError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422)
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends AgentWorkspaceError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT', 408)
    this.name = 'TimeoutError'
  }
}

export class ServerError extends AgentWorkspaceError {
  constructor(message = 'An unexpected server error occurred', statusCode = 500) {
    super(message, 'SERVER_ERROR', statusCode)
    this.name = 'ServerError'
  }
}

export function mapApiError(
  statusCode: number,
  body: { error?: string; message?: string; fields?: Record<string, string> }
): AgentWorkspaceError {
  const message = body.error ?? body.message ?? 'Unknown error'
  switch (statusCode) {
    case 401: return new AuthError(message)
    case 403: return new ForbiddenError(message)
    case 404: return new AgentWorkspaceError(message, 'NOT_FOUND', 404)
    case 409: return new ConflictError(message)
    case 422: return new ValidationError(message, body.fields)
    default:  return statusCode >= 500
      ? new ServerError(message, statusCode)
      : new AgentWorkspaceError(message, 'CLIENT_ERROR', statusCode)
  }
}
```

### `packages/sdk/src/http.ts`

```typescript
import { mapApiError, TimeoutError } from './errors'

const DEFAULT_BASE_URL = 'https://api.agentworkspace.dev/v1'
const DEFAULT_TIMEOUT_MS = 30_000

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  timeoutMs?: number
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor(apiKey: string, baseUrl?: string, timeoutMs?: number) {
    this.apiKey = apiKey
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, timeoutMs } = options

    const url = new URL(`${this.baseUrl}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'agent-workspace-sdk/0.1.0',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw new TimeoutError()
      throw err
    } finally {
      clearTimeout(timer)
    }

    if (response.status === 204) return undefined as unknown as T

    const json = await response.json()
    if (!response.ok) throw mapApiError(response.status, json)

    return json as T
  }

  get<T>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'GET', query })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body })
  }

  delete<T = void>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
```

### `packages/sdk/src/workspace.ts`

```typescript
import type { HttpClient } from './http'
import type {
  Workspace, CreateWorkspaceOptions, UpdateWorkspaceOptions,
  AttachOptions, PaginatedList, PaginationOptions,
} from './types'
import { TimeoutError } from './errors'

const POLL_INTERVAL_MS = 1_500

export class WorkspaceResource {
  constructor(private readonly http: HttpClient) {}

  list(options: PaginationOptions = {}): Promise<PaginatedList<Workspace>> {
    return this.http.get<PaginatedList<Workspace>>('/workspaces', {
      page: options.page,
      pageSize: options.pageSize,
    })
  }

  get(workspaceId: string): Promise<Workspace> {
    return this.http.get<Workspace>(`/workspaces/${workspaceId}`)
  }

  create(options: CreateWorkspaceOptions): Promise<Workspace> {
    return this.http.post<Workspace>('/workspaces', options)
  }

  update(workspaceId: string, options: UpdateWorkspaceOptions): Promise<Workspace> {
    return this.http.patch<Workspace>(`/workspaces/${workspaceId}`, options)
  }

  delete(workspaceId: string): Promise<void> {
    return this.http.delete(`/workspaces/${workspaceId}`)
  }

  async attach(workspaceId: string, vmId: string, options: AttachOptions = {}): Promise<Workspace> {
    const { waitUntilReady = false, timeoutMs = 30_000 } = options
    const workspace = await this.http.post<Workspace>(
      `/workspaces/${workspaceId}/attach`,
      { vmId },
    )
    if (!waitUntilReady) return workspace
    return this._pollUntilStatus(workspaceId, 'active', timeoutMs)
  }

  async detach(workspaceId: string, options: AttachOptions = {}): Promise<Workspace> {
    const { waitUntilReady = false, timeoutMs = 30_000 } = options
    const workspace = await this.http.post<Workspace>(`/workspaces/${workspaceId}/detach`)
    if (!waitUntilReady) return workspace
    return this._pollUntilStatus(workspaceId, 'idle', timeoutMs)
  }

  private async _pollUntilStatus(
    workspaceId: string,
    target: Workspace['status'],
    timeoutMs: number,
  ): Promise<Workspace> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const workspace = await this.get(workspaceId)
      if (workspace.status === target) return workspace
      if (workspace.status === 'error') {
        throw new Error(`Workspace '${workspaceId}' entered error state while waiting for '${target}'`)
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }
    throw new TimeoutError(
      `Workspace '${workspaceId}' did not reach status '${target}' within ${timeoutMs}ms`,
    )
  }
}
```

### `packages/sdk/src/files.ts`

```typescript
import type { HttpClient } from './http'
import type { FileEntry, ListFilesOptions, ReadFileOptions, WriteFileOptions } from './types'

export class FilesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly workspaceId: string,
  ) {}

  private get base() { return `/workspaces/${this.workspaceId}/files` }

  list(path: string = '/', options: ListFilesOptions = {}): Promise<FileEntry[]> {
    return this.http.get<FileEntry[]>(`${this.base}/list`, {
      path, recursive: options.recursive, pattern: options.pattern,
    })
  }

  async read(path: string, options: ReadFileOptions = {}): Promise<string> {
    const result = await this.http.get<{ content: string }>(
      `${this.base}/read`, { path, encoding: options.encoding ?? 'utf-8' }
    )
    return result.content
  }

  write(path: string, content: string, options: WriteFileOptions = {}): Promise<FileEntry> {
    return this.http.post<FileEntry>(`${this.base}/write`, {
      path, content, append: options.append ?? false, mkdirp: options.mkdirp ?? true,
    })
  }

  delete(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    return this.http.post<void>(`${this.base}/delete`, {
      path, recursive: options.recursive ?? false,
    })
  }

  move(from: string, to: string): Promise<FileEntry> {
    return this.http.post<FileEntry>(`${this.base}/move`, { from, to })
  }

  copy(from: string, to: string): Promise<FileEntry> {
    return this.http.post<FileEntry>(`${this.base}/copy`, { from, to })
  }

  mkdir(path: string): Promise<FileEntry> {
    return this.http.post<FileEntry>(`${this.base}/mkdir`, { path })
  }

  async exists(path: string): Promise<boolean> {
    const result = await this.http.get<{ exists: boolean }>(`${this.base}/exists`, { path })
    return result.exists
  }

  stat(path: string): Promise<FileEntry> {
    return this.http.get<FileEntry>(`${this.base}/stat`, { path })
  }
}
```

### `packages/sdk/src/tools.ts`

```typescript
import type { HttpClient } from './http'
import type { BashOptions, BashResult, GrepOptions, GrepResult } from './types'

export class ToolsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly workspaceId: string,
  ) {}

  private get base() { return `/workspaces/${this.workspaceId}/tools` }

  /** Execute a bash command. Workspace must be in 'active' status. */
  bash(command: string, options: BashOptions = {}): Promise<BashResult> {
    return this.http.post<BashResult>(`${this.base}/bash`, {
      command,
      cwd: options.cwd ?? '/',
      env: options.env ?? {},
      timeoutMs: options.timeoutMs ?? 30_000,
    })
  }

  /** Search for a pattern across files. Returns structured match results. */
  grep(pattern: string, options: GrepOptions = {}): Promise<GrepResult> {
    return this.http.post<GrepResult>(`${this.base}/grep`, {
      pattern,
      include: options.include ?? '**/*',
      recursive: options.recursive ?? true,
      caseSensitive: options.caseSensitive ?? false,
      maxMatches: options.maxMatches ?? 100,
    })
  }

  /** Find files by name or glob pattern. */
  find(pattern: string, options: { type?: 'file' | 'dir'; cwd?: string } = {}): Promise<string[]> {
    return this.http.post<string[]>(`${this.base}/find`, {
      pattern, type: options.type, cwd: options.cwd ?? '/',
    })
  }

  /** Get a tree view of the workspace. Great for AI agent orientation. */
  tree(options: { path?: string; depth?: number } = {}): Promise<string> {
    return this.http.post<string>(`${this.base}/tree`, {
      path: options.path ?? '/', depth: options.depth ?? 3,
    })
  }
}
```

### `packages/sdk/src/client.ts`

```typescript
import { HttpClient } from './http'
import { WorkspaceResource } from './workspace'
import { FilesResource } from './files'
import { ToolsResource } from './tools'
import type { WorkspaceClientOptions } from './types'

/**
 * WorkspaceClient is the main entry point for the Agent Workspace SDK.
 *
 * @example
 * ```ts
 * const client = new WorkspaceClient({ apiKey: 'aw_sk_...' })
 * const workspace = await client.workspaces.create({ name: 'my-project' })
 * await client.workspaces.attach(workspace.id, vmId, { waitUntilReady: true })
 *
 * const ws = client.workspace(workspace.id)
 * await ws.files.write('hello.txt', 'Hello, world!')
 * const result = await ws.tools.bash('cat hello.txt')
 * ```
 */
export class WorkspaceClient {
  private readonly http: HttpClient
  readonly workspaces: WorkspaceResource

  constructor(options: WorkspaceClientOptions) {
    if (!options.apiKey) throw new Error('apiKey is required')
    this.http = new HttpClient(options.apiKey, options.baseUrl, options.timeoutMs)
    this.workspaces = new WorkspaceResource(this.http)
  }

  workspace(workspaceId: string): WorkspaceHandle {
    return new WorkspaceHandle(this.http, workspaceId)
  }
}

export class WorkspaceHandle {
  readonly files: FilesResource
  readonly tools: ToolsResource

  constructor(http: HttpClient, public readonly workspaceId: string) {
    this.files = new FilesResource(http, workspaceId)
    this.tools = new ToolsResource(http, workspaceId)
  }
}
```

### `packages/sdk/src/index.ts`

```typescript
export { WorkspaceClient, WorkspaceHandle } from './client'
export { WorkspaceResource } from './workspace'
export { FilesResource } from './files'
export { ToolsResource } from './tools'

export {
  AgentWorkspaceError, AuthError, ForbiddenError, NotFoundError,
  ConflictError, ValidationError, TimeoutError, ServerError,
} from './errors'

export type {
  Org, ApiKey,
  Workspace, WorkspaceStatus, CreateWorkspaceOptions, UpdateWorkspaceOptions, AttachOptions,
  Vm, VmStatus,
  FileEntry, ReadFileOptions, WriteFileOptions, ListFilesOptions,
  BashOptions, BashResult, GrepOptions, GrepMatch, GrepResult,
  WorkspaceClientOptions, PaginatedList, PaginationOptions,
} from './types'
```

### `packages/sdk/package.json`

```json
{
  "name": "@agent-workspace/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for Agent Workspace",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "engines": { "node": ">=18" }
}
```

---

## Config Files

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

### `.env` (API package)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FLY_API_TOKEN=
S3_BUCKET=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

---

## Usage Example

```typescript
import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({ apiKey: 'aw_sk_...' })

// 1. Create a workspace
const workspace = await client.workspaces.create({ name: 'my-project' })
console.log(workspace.id, workspace.status) // wsp_abc123, idle

// 2. Attach to a VM and wait until ready
await client.workspaces.attach(workspace.id, 'vm_xyz789', { waitUntilReady: true })

// 3. Obtain a scoped workspace handle
const ws = client.workspace(workspace.id)

// 4. File operations
await ws.files.write('src/index.ts', `console.log('Hello from workspace!')`)
const entries = await ws.files.list('src', { recursive: true })
const content = await ws.files.read('src/index.ts')

// 5. Run bash commands
const install = await ws.tools.bash('npm install', { cwd: '/', timeoutMs: 60_000 })
if (install.exitCode !== 0) console.error(install.stderr)

// 6. Search across files
const results = await ws.tools.grep('console.log', { include: '**/*.ts' })
for (const match of results.matches) {
  console.log(`${match.file}:${match.line}  ${match.content}`)
}

// 7. Get a tree overview (great for AI agent orientation)
const tree = await ws.tools.tree({ depth: 2 })
console.log(tree)

// 8. Detach — syncs back to S3
await client.workspaces.detach(workspace.id, { waitUntilReady: true })
console.log('Workspace safely persisted to S3')
```

---

## Key Design Decisions

**Zero dependencies in the SDK.** Uses native `fetch` (Node 18+) only. No axios, no extra runtime deps — just `tsup` + `typescript` for the build.

**Two-level API surface.** `client.workspaces` handles org-level lifecycle (create/attach/detach/delete). `client.workspace(id)` returns a `WorkspaceHandle` scoped to one workspace, exposing `ws.files` and `ws.tools`. This keeps ergonomics clean for the common agent session pattern.

**Typed errors.** Every failure throws a typed class (`AuthError`, `NotFoundError`, `ConflictError`, etc.) so callers use `instanceof` checks instead of parsing status codes.

**Built-in polling.** `attach({ waitUntilReady: true })` and `detach({ waitUntilReady: true })` poll internally so callers don't implement their own retry loops.

**RLS as a second line of defense.** `middleware/scope.ts` rejects cross-org requests at the app level. Supabase RLS policies enforce the same invariant at the DB level — a bug in one can't compromise tenant isolation.

**Agent stays internal.** The `packages/agent` process running inside the Firecracker VM only accepts connections from the API server over Fly's private WireGuard network (`.internal` DNS). It never needs to validate API keys.

**S3 sync via rclone.** The VM base image bundles `rclone`. On attach it syncs the workspace S3 path to a local directory; on detach it syncs back. This gives fast local I/O during a session with durable persistence.

**Dashboard is a thin UI over the API.** The dashboard (`packages/dashboard`) is a Next.js app that authenticates users via Supabase Auth (email/password + GitHub OAuth) and calls the same API server that the SDK uses. It adds no new backend logic — every action goes through the existing API routes. This keeps the API as the single source of truth and means the dashboard is optional: power users and agents can do everything via the SDK.

**Role-based dashboard access.** The `org_members` table maps Supabase Auth users to orgs with a role (`owner` / `admin` / `member`). Owners can manage billing and delete the org; admins can create/revoke API keys and manage VMs; members can view and manage workspaces. RLS policies on `org_members` prevent cross-org enumeration.

---

## Next Steps

- [ ] `packages/api` — Hono API server, auth middleware, Supabase integration
- [ ] `packages/agent` — in-VM HTTP server (bash, files, grep, sync handlers)
- [ ] `infra/fly/vm-image` — Dockerfile with agent binary + rclone
- [ ] `supabase/migrations` — full migration files
- [ ] `packages/dashboard` — Next.js management UI (workspace/VM/key CRUD, file browser, terminal viewer)
- [ ] `supabase/migrations/0004_org_members.sql` — org membership table + RLS
- [ ] `examples/claude-mcp-integration.ts` — wiring SDK tools to an MCP server