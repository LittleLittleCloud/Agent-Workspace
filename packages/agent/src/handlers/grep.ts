/**
 * Grep handler — structured regex search across files.
 */

import { exec } from 'node:child_process'
import type { Context } from 'hono'

interface GrepRequest {
  pattern: string
  include?: string
  recursive?: boolean
  caseSensitive?: boolean
  maxMatches?: number
}

export async function grepHandler(c: Context) {
  const body = await c.req.json<GrepRequest>()
  const {
    pattern,
    include = '**/*',
    recursive = true,
    caseSensitive = false,
    maxMatches = 100,
  } = body

  if (!pattern) return c.json({ error: 'pattern is required' }, 400)

  const flags = [
    '-n',                            // line numbers
    '--with-filename',
    recursive ? '-r' : '',
    caseSensitive ? '' : '-i',
    `--max-count=${maxMatches}`,
    `--include=${include}`,
  ].filter(Boolean).join(' ')

  const cmd = `grep ${flags} -- ${JSON.stringify(pattern)} /workspace 2>/dev/null || true`

  return new Promise<Response>((resolve) => {
    exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (_error, stdout) => {
      const lines = stdout.trim().split('\n').filter(Boolean)
      const matches = lines.slice(0, maxMatches).map((line) => {
        const match = line.match(/^(.+?):(\d+):(.*)$/)
        if (!match) return null
        return {
          file: match[1]!.replace('/workspace/', ''),
          line: parseInt(match[2]!, 10),
          content: match[3]!,
        }
      }).filter(Boolean)

      resolve(c.json({
        matches,
        truncated: lines.length > maxMatches,
      }))
    })
  })
}
