/**
 * Bash handler — executes shell commands inside the sandbox.
 */

import { exec } from 'node:child_process'
import type { Context } from 'hono'

interface BashRequest {
  command: string
  cwd?: string
  env?: Record<string, string>
  timeoutMs?: number
}

export async function bashHandler(c: Context) {
  const body = await c.req.json<BashRequest>()
  const { command, cwd = '/workspace', env = {}, timeoutMs = 30_000 } = body

  if (!command) {
    return c.json({ error: 'command is required' }, 400)
  }

  return new Promise<Response>((resolve) => {
    const child = exec(command, {
      cwd,
      env: { ...process.env, ...env },
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    }, (error, stdout, stderr) => {
      const exitCode = error?.code ?? (error ? 1 : 0)
      resolve(
        c.json({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: typeof exitCode === 'number' ? exitCode : 1,
        })
      )
    })
  })
}
