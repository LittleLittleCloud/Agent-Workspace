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
