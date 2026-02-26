/**
 * Typed fetch wrapper for calling the API server from the Dashboard.
 *
 * The Dashboard authenticates to the API server using either:
 *   1. An internal service token (for server components / API routes)
 *   2. A user-scoped API key (for client-side calls)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  statusCode: number
}

export interface PaginatedList<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface Workspace {
  id: string
  orgId: string
  name: string
  status: string
  vmId: string | null
  vmIp: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Vm {
  id: string
  flyMachineId: string
  status: string
  workspaceId: string | null
  region: string
  createdAt: string
}

export interface ApiKeyInfo {
  id: string
  orgId: string
  name: string
  prefix: string
  scopes: string[]
  lastUsed: string | null
  createdAt: string
  revokedAt: string | null
}

export interface ApiKeyCreateResult extends ApiKeyInfo {
  /** Raw key — shown only once at creation */
  key: string
}

// ── Client ──────────────────────────────────────────────────────────────────

class DashboardApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const err: ApiError = {
        code: body.code ?? 'UNKNOWN',
        message: body.message ?? res.statusText,
        statusCode: res.status,
      }
      throw err
    }

    return res.json() as Promise<T>
  }

  // ── Workspaces ──────────────────────────────────────────────────────────

  listWorkspaces(page = 1, pageSize = 20) {
    return this.request<PaginatedList<Workspace>>(
      `/v1/workspaces?page=${page}&pageSize=${pageSize}`,
    )
  }

  getWorkspace(id: string) {
    return this.request<Workspace>(`/v1/workspaces/${id}`)
  }

  createWorkspace(name: string) {
    return this.request<Workspace>('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  updateWorkspace(id: string, updates: { name?: string }) {
    return this.request<Workspace>(`/v1/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  deleteWorkspace(id: string) {
    return this.request<void>(`/v1/workspaces/${id}`, { method: 'DELETE' })
  }

  // ── VMs ─────────────────────────────────────────────────────────────────

  attachVm(workspaceId: string) {
    return this.request<{ vmId: string }>(`/v1/workspaces/${workspaceId}/attach`, {
      method: 'POST',
    })
  }

  detachVm(workspaceId: string) {
    return this.request<void>(`/v1/workspaces/${workspaceId}/detach`, {
      method: 'POST',
    })
  }

  // ── API Keys ────────────────────────────────────────────────────────────

  listKeys() {
    return this.request<ApiKeyInfo[]>('/v1/keys')
  }

  createKey(name: string, scopes: string[] = []) {
    return this.request<ApiKeyCreateResult>('/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    })
  }

  revokeKey(id: string) {
    return this.request<void>(`/v1/keys/${id}`, { method: 'DELETE' })
  }
}

export const api = new DashboardApiClient()
