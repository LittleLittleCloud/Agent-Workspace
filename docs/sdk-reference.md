# SDK Reference

## Installation

```bash
npm install @agent-workspace/sdk
```

## Runtime

- Browser-only SDK (ESM + Fetch API)
- Use in client-side apps (React, Next.js client components, Vite, etc.)
- Do not use `require(...)`; use ESM imports

## Frontend Example

```typescript
import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: import.meta.env.VITE_AGENT_WORKSPACE_API_KEY,
  baseUrl: 'https://api.agentworkspace.dev/v1',
})

const page = await client.workspaces.list({ page: 1, pageSize: 10 })
console.log(page.data)
```

> Security note: browser apps expose client-side environment variables. Use a scoped/ephemeral token flow from your backend when possible.

## Quick Start

```typescript
import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({ apiKey: 'aw_sk_...' })

// Create a workspace
const ws = await client.workspaces.create({ name: 'my-project' })

// Attach a VM
const handle = await client.workspaces.attach(ws.id, { waitUntilReady: true })

// Run bash command
const result = await handle.bash('echo "Hello, World!"')
console.log(result.stdout) // "Hello, World!"

// Write and read files
await handle.files.write('/workspace/hello.txt', 'Hello!')
const content = await handle.files.read('/workspace/hello.txt')

// Detach when done
await handle.detach()
```

## Client

### `WorkspaceClient`

```typescript
new WorkspaceClient(options: WorkspaceClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | API key (`aw_sk_...`) |
| `baseUrl` | `string` | `https://api.agentworkspace.dev` | API server URL |
| `timeoutMs` | `number` | `30000` | Default request timeout |

### Properties

- `client.workspaces` — `WorkspaceResource` for CRUD + lifecycle
- `client.files` — `FilesResource` for file operations
- `client.tools` — `ToolsResource` for bash/grep/find/tree

## Workspaces

### `workspaces.create(options)`

Create a new workspace.

```typescript
const ws = await client.workspaces.create({ name: 'my-project' })
```

### `workspaces.get(id)`

Get a workspace by ID.

### `workspaces.list(options?)`

List workspaces with pagination.

```typescript
const page = await client.workspaces.list({ page: 1, pageSize: 20 })
// page.data, page.total, page.hasMore
```

### `workspaces.update(id, options)`

Update workspace properties.

### `workspaces.delete(id)`

Delete a workspace and all its data.

### `workspaces.attach(id, options?)`

Attach a VM to a workspace. Returns a `WorkspaceHandle`.

```typescript
const handle = await client.workspaces.attach(ws.id, {
  waitUntilReady: true,
  timeoutMs: 60_000,
})
```

### `workspaces.detach(id)`

Detach the VM, syncing data back to S3.

## WorkspaceHandle

Returned by `workspaces.attach()`. Provides convenience methods:

- `handle.bash(command, options?)` — Execute a bash command
- `handle.files` — File operations scoped to this workspace
- `handle.detach()` — Detach the VM

## Files

### `files.read(workspaceId, path, options?)`

Read file content.

### `files.write(workspaceId, path, content, options?)`

Write content to a file. Creates parent directories by default.

### `files.list(workspaceId, path?, options?)`

List directory contents.

### `files.delete(workspaceId, path)`

Delete a file or directory.

### `files.move(workspaceId, from, to)`

Move/rename a file.

### `files.copy(workspaceId, from, to)`

Copy a file.

### `files.exists(workspaceId, path)`

Check if a path exists.

### `files.stat(workspaceId, path)`

Get file metadata (size, type, modified time).

## Tools

### `tools.bash(workspaceId, command, options?)`

Execute a bash command in the workspace VM.

```typescript
const result = await client.tools.bash(ws.id, 'npm test', {
  cwd: '/workspace/src',
  timeoutMs: 60_000,
})
// result.stdout, result.stderr, result.exitCode
```

### `tools.grep(workspaceId, pattern, options?)`

Search files with structured output.

```typescript
const result = await client.tools.grep(ws.id, 'TODO', {
  include: '**/*.ts',
  caseSensitive: false,
})
// result.matches[].file, .line, .content
```

## Error Handling

All errors extend `AgentWorkspaceError`:

| Error Class | Code | HTTP Status |
|-------------|------|-------------|
| `AuthError` | `AUTH_ERROR` | 401 |
| `ForbiddenError` | `FORBIDDEN` | 403 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409 |
| `TimeoutError` | `TIMEOUT` | 408 |
| `AgentWorkspaceError` | varies | varies |

```typescript
import { NotFoundError, AuthError } from '@agent-workspace/sdk'

try {
  await client.workspaces.get('non-existent')
} catch (err) {
  if (err instanceof NotFoundError) {
    // handle 404
  }
}
```

## Pagination

```typescript
const { data, total, hasMore } = await client.workspaces.list({
  page: 1,
  pageSize: 50,
})
```
