/**
 * Scope middleware — verifies a workspace belongs to the authenticated org.
 * Must run after auth middleware.
 */

import type { Context, Next } from 'hono'
import { getWorkspace } from '../services/registry'

/**
 * Middleware that checks the workspace identified by :workspaceId belongs
 * to the org resolved by auth middleware.
 */
export async function scopeMiddleware(c: Context, next: Next) {
  const orgId = c.get('orgId') as string
  const workspaceId = c.req.param('workspaceId')

  if (!workspaceId) {
    // No workspace in the route — skip scope check
    await next()
    return
  }

  const workspace = await getWorkspace(orgId, workspaceId)
  if (!workspace) {
    return c.json({ error: `Workspace '${workspaceId}' not found` }, 404)
  }

  if (workspace.org_id !== orgId) {
    return c.json({ error: 'You do not have access to this resource' }, 403)
  }

  c.set('workspace', workspace)
  await next()
}
