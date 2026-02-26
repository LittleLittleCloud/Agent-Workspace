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
