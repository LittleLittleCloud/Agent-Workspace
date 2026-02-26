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
