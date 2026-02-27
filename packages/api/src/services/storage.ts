/**
 * S3-compatible object storage client for workspace data.
 *
 * Uses native fetch against S3 REST API. Compatible with:
 *   - Tigris (Fly.io's built-in S3)
 *   - Cloudflare R2
 *   - AWS S3
 *   - MinIO (local dev)
 */

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? ''
const S3_BUCKET = process.env.S3_BUCKET ?? 'agent-workspace'
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? ''
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? ''

/**
 * Generate the S3 path for a workspace.
 */
export function workspaceS3Path(orgId: string, workspaceId: string): string {
  return `workspaces/${orgId}/${workspaceId}`
}

/**
 * Check if a workspace has data in S3.
 */
export async function workspaceExists(s3Path: string): Promise<boolean> {
  try {
    const res = await s3Request('HEAD', `${s3Path}/`)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Initialize an empty workspace folder in S3 (creates a marker object).
 */
export async function initWorkspace(s3Path: string): Promise<void> {
  await s3Request('PUT', `${s3Path}/.workspace`, {
    body: JSON.stringify({ created: new Date().toISOString() }),
  })
}

/**
 * Delete all objects under a workspace S3 path.
 */
export async function deleteWorkspace(s3Path: string): Promise<void> {
  // List and delete all objects under the prefix
  // In production, use S3 batch delete API
  const res = await s3Request('GET', '', {
    query: { prefix: s3Path, 'max-keys': '1000' },
  })
  if (!res.ok) return

  // Parse the XML response for object keys and delete each
  const text = await res.text()
  const keys = [...text.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]!)
  await Promise.all(keys.map(key => s3Request('DELETE', key)))
}

// ── Internal S3 helpers ─────────────────────────────────────────────────────

async function s3Request(
  method: string,
  path: string,
  options: { body?: string; query?: Record<string, string> } = {},
): Promise<Response> {
  const url = new URL(`${S3_ENDPOINT}/${S3_BUCKET}/${path}`)
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v)
    }
  }

  // Simplified — in production use AWS Signature V4
  return fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `AWS ${S3_ACCESS_KEY_ID}:${S3_SECRET_ACCESS_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    body: options.body ?? null,
  })
}
