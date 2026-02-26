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
