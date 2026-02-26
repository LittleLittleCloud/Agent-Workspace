/**
 * Sandbox — resource limits, path validation, and glob matching for the agent.
 */

import * as path from 'node:path'

const WORKSPACE_ROOT = '/workspace'

/**
 * Ensure a path is within the workspace root. Throws if path traversal is attempted.
 */
export function ensureWithinWorkspace(filePath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, filePath.replace(/^\//, ''))
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path traversal is not allowed: ${filePath}`)
  }
  return resolved
}

/**
 * Simple glob matching for file path filtering.
 * Supports * (any chars except /) and ** (any chars including /).
 */
export function globMatch(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/')
  const normalizedPattern = pattern.replace(/\\/g, '/')

  // Convert glob to regex
  const regexStr = normalizedPattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\./g, '\\.')

  const regex = new RegExp(`^${regexStr}$`)
  return regex.test(normalized)
}

/**
 * Resource limits for bash commands.
 */
export const LIMITS = {
  /** Maximum bash command timeout (ms) */
  MAX_BASH_TIMEOUT_MS: 300_000,
  /** Maximum output buffer size (bytes) */
  MAX_OUTPUT_BUFFER: 10 * 1024 * 1024, // 10 MB
  /** Maximum file size for read/write (bytes) */
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
} as const
