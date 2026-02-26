/**
 * Sync handler — syncs workspace data to/from S3 using rclone.
 *
 * Called by the API server during attach (pull) and detach (push).
 */

import { exec } from 'node:child_process'
import type { Context } from 'hono'

const WORKSPACE_DIR = '/workspace'

interface SyncRequest {
  s3Path: string
}

/**
 * Pull workspace data from S3 → local filesystem.
 * Called during workspace attach.
 */
export async function pullHandler(c: Context) {
  const body = await c.req.json<SyncRequest>()
  if (!body.s3Path) return c.json({ error: 's3Path is required' }, 400)

  const remote = `s3:${process.env.S3_BUCKET ?? 'agent-workspace'}/${body.s3Path}`
  const cmd = `rclone sync "${remote}" "${WORKSPACE_DIR}" --transfers=16 --checkers=16 -q`

  return new Promise<Response>((resolve) => {
    exec(cmd, { timeout: 120_000 }, (error, _stdout, stderr) => {
      if (error) {
        resolve(c.json({ error: `Sync pull failed: ${stderr}` }, 500))
      } else {
        resolve(c.json({ ok: true, direction: 'pull' }))
      }
    })
  })
}

/**
 * Push workspace data from local filesystem → S3.
 * Called during workspace detach.
 */
export async function pushHandler(c: Context) {
  const body = await c.req.json<SyncRequest>()
  if (!body.s3Path) return c.json({ error: 's3Path is required' }, 400)

  const remote = `s3:${process.env.S3_BUCKET ?? 'agent-workspace'}/${body.s3Path}`
  const cmd = `rclone sync "${WORKSPACE_DIR}" "${remote}" --transfers=16 --checkers=16 -q`

  return new Promise<Response>((resolve) => {
    exec(cmd, { timeout: 120_000 }, (error, _stdout, stderr) => {
      if (error) {
        resolve(c.json({ error: `Sync push failed: ${stderr}` }, 500))
      } else {
        resolve(c.json({ ok: true, direction: 'push' }))
      }
    })
  })
}
