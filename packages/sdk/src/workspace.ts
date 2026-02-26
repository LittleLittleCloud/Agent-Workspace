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
