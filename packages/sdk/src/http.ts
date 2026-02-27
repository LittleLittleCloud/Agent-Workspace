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
      const requestInit: RequestInit = {
        method,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
      if (body !== undefined) {
        requestInit.body = JSON.stringify(body)
      }

      response = await fetch(url.toString(), requestInit)
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
    if (query) return this.request<T>(path, { method: 'GET', query })
    return this.request<T>(path, { method: 'GET' })
  }

  post<T>(path: string, body?: unknown) {
    if (body !== undefined) return this.request<T>(path, { method: 'POST', body })
    return this.request<T>(path, { method: 'POST' })
  }

  patch<T>(path: string, body?: unknown) {
    if (body !== undefined) return this.request<T>(path, { method: 'PATCH', body })
    return this.request<T>(path, { method: 'PATCH' })
  }

  delete<T = void>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
